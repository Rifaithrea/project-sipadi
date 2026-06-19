import fs from "fs";
import { Router } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { requireArchivePermission } from "../middleware/archivePermissions.js";
import { archiveUpload, resolveUploadPath, uploadedFileToDb } from "../middleware/upload.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, cleanText, createHttpError, pagination, parseOptionalInt } from "../utils/http.js";
import { logActivity } from "../services/audit.js";
import { ARCHIVE_STATUSES, FILE_TYPES, archiveSelectSql, buildArchiveFilters } from "../services/archiveQueries.js";
import {
  canChooseArchiveUnit,
  canDeleteArchive,
  canDownloadArchive,
  canEditArchive,
  canUpdateArchiveStatus,
  canViewArchive
} from "../services/permissions.js";

const router = Router();

const commentSchema = z.object({
  comment: z.string().trim().min(3)
});

const verifySchema = z.object({
  status: z.enum(["Menunggu Review", "Terverifikasi", "Ditolak", "Diarsipkan"]),
  note: z.string().trim().optional().default("")
});

function ensureValidChoice(value, choices, fieldName) {
  if (!choices.includes(value)) {
    throw createHttpError(422, `${fieldName} tidak valid`);
  }
}

function archiveInput(req, existing = {}) {
  const uploaded = uploadedFileToDb(req.file);
  const title = cleanText(req.body.title) ?? existing.title;
  const documentNumber = cleanText(req.body.documentNumber || req.body.document_number) ?? existing.document_number;
  const documentType = cleanText(req.body.documentType || req.body.document_type) ?? existing.document_type;
  const status = cleanText(req.body.status) ?? existing.status ?? "Draft";
  const classification = cleanText(req.body.classification) ?? existing.classification ?? "Internal";
  const description = cleanText(req.body.description) ?? existing.description ?? "";
  const year = parseOptionalInt(req.body.year) ?? existing.year ?? new Date().getFullYear();
  const requestedUnitId = parseOptionalInt(req.body.unitId || req.body.unit_id);
  const unitId = canChooseArchiveUnit(req.user) ? requestedUnitId ?? existing.unit_id : req.user.unitId;
  const fileType = (uploaded.fileType || cleanText(req.body.fileType || req.body.file_type) || existing.file_type || "PDF").toUpperCase();

  if (!title || !documentNumber || !documentType || !unitId) {
    throw createHttpError(422, "Judul, nomor dokumen, jenis dokumen, dan unit wajib diisi");
  }

  ensureValidChoice(status, ARCHIVE_STATUSES, "Status dokumen");
  ensureValidChoice(fileType, FILE_TYPES, "Tipe file");

  return {
    title,
    documentNumber,
    documentType,
    status,
    classification,
    description,
    year,
    unitId,
    fileType,
    ...uploaded
  };
}

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const filters = buildArchiveFilters({ filters: req.query, user: req.user });

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM archives a ${filters.whereSql}`,
      filters.values
    );

    const dataResult = await query(
      `${archiveSelectSql()}
       ${filters.whereSql}
       ORDER BY a.created_at DESC
       LIMIT $${filters.nextIndex} OFFSET $${filters.nextIndex + 1}`,
      [...filters.values, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      meta: {
        page,
        limit,
        total: countResult.rows[0].total
      }
    });
  })
);

router.post(
  "/",
  authenticate,
  archiveUpload.single("file"),
  asyncHandler(async (req, res) => {
    const input = archiveInput(req);

    try {
      const result = await query(
        `INSERT INTO archives (
          title, document_number, unit_id, document_type, file_type, year, status, classification,
          description, file_path, file_original_name, file_size, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          input.title,
          input.documentNumber,
          input.unitId,
          input.documentType,
          input.fileType,
          input.year,
          input.status,
          input.classification,
          input.description,
          input.filePath || null,
          input.fileOriginalName || null,
          input.fileSize || null,
          req.user.id
        ]
      );

      await logActivity({
        userId: req.user.id,
        action: "CREATE",
        entity: "archive",
        entityId: result.rows[0].id,
        metadata: { title: input.title, documentNumber: input.documentNumber }
      });

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        throw createHttpError(409, "Nomor dokumen sudah digunakan");
      }
      throw error;
    }
  })
);

router.get(
  "/:id",
  authenticate,
  requireArchivePermission(canViewArchive, "Anda tidak dapat melihat arsip ini"),
  asyncHandler(async (req, res) => {
    const archiveResult = await query(
      `${archiveSelectSql()}
       WHERE a.id = $1`,
      [req.params.id]
    );

    const commentsResult = await query(
      `SELECT c.id, c.comment, c.created_at, u.name AS user_name, u.role AS user_role
       FROM archive_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.archive_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    const dispositionsResult = await query(
      `SELECT d.id, d.note, d.deadline, d.status, d.created_at, d.updated_at,
              fu.name AS from_user_name, tu.name AS to_user_name, ou.name AS to_unit_name
       FROM dispositions d
       LEFT JOIN users fu ON fu.id = d.from_user_id
       LEFT JOIN users tu ON tu.id = d.to_user_id
       LEFT JOIN organization_units ou ON ou.id = d.to_unit_id
       WHERE d.archive_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );

    res.json({
      data: {
        ...archiveResult.rows[0],
        comments: commentsResult.rows,
        dispositions: dispositionsResult.rows
      }
    });
  })
);

router.put(
  "/:id",
  authenticate,
  requireArchivePermission(canEditArchive, "Hanya Admin atau divisi pemilik arsip yang dapat mengubah data ini"),
  archiveUpload.single("file"),
  asyncHandler(async (req, res) => {
    const existing = req.archive;

    const input = archiveInput(req, existing);

    if (input.status !== existing.status && !canUpdateArchiveStatus(req.user, existing)) {
      throw createHttpError(403, "Anda tidak dapat mengubah status arsip ini");
    }

    try {
      const result = await query(
        `UPDATE archives
         SET title = $1, document_number = $2, unit_id = $3, document_type = $4, file_type = $5,
             year = $6, status = $7, classification = $8, description = $9,
             file_path = COALESCE($10, file_path),
             file_original_name = COALESCE($11, file_original_name),
             file_size = COALESCE($12, file_size),
             updated_at = NOW()
         WHERE id = $13
         RETURNING *`,
        [
          input.title,
          input.documentNumber,
          input.unitId,
          input.documentType,
          input.fileType,
          input.year,
          input.status,
          input.classification,
          input.description,
          input.filePath || null,
          input.fileOriginalName || null,
          input.fileSize || null,
          req.params.id
        ]
      );

      await logActivity({
        userId: req.user.id,
        action: "UPDATE",
        entity: "archive",
        entityId: Number(req.params.id),
        metadata: { title: input.title }
      });

      res.json({ data: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        throw createHttpError(409, "Nomor dokumen sudah digunakan");
      }
      throw error;
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  requireArchivePermission(canDeleteArchive, "Hanya Admin atau divisi pemilik arsip yang dapat menghapus arsip ini"),
  asyncHandler(async (req, res) => {
    const existing = req.archive;
    await query("DELETE FROM archives WHERE id = $1", [req.params.id]);

    await logActivity({
      userId: req.user.id,
      action: "DELETE",
      entity: "archive",
      entityId: Number(req.params.id),
      metadata: { title: existing.title }
    });

    res.status(204).send();
  })
);

router.post(
  "/:id/comments",
  authenticate,
  requireArchivePermission(canViewArchive, "Anda tidak dapat melihat arsip ini"),
  validateBody(commentSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `INSERT INTO archive_comments (archive_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, req.user.id, req.body.comment]
    );

    await logActivity({
      userId: req.user.id,
      action: "COMMENT",
      entity: "archive",
      entityId: Number(req.params.id)
    });

    res.status(201).json({ data: result.rows[0] });
  })
);

router.post(
  "/:id/verify",
  authenticate,
  requireArchivePermission(canUpdateArchiveStatus, "Anda tidak dapat mengubah status arsip ini"),
  validateBody(verifySchema),
  asyncHandler(async (req, res) => {
    const verified = ["Terverifikasi", "Diarsipkan"].includes(req.body.status);

    const result = await query(
      `UPDATE archives
       SET status = $1,
           verified_by = CASE WHEN $2 THEN $3 ELSE verified_by END,
           verified_at = CASE WHEN $2 THEN NOW() ELSE verified_at END,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [req.body.status, verified, req.user.id, req.params.id]
    );

    if (req.body.note) {
      await query(
        "INSERT INTO archive_comments (archive_id, user_id, comment) VALUES ($1, $2, $3)",
        [req.params.id, req.user.id, req.body.note]
      );
    }

    await logActivity({
      userId: req.user.id,
      action: "VERIFY",
      entity: "archive",
      entityId: Number(req.params.id),
      metadata: { status: req.body.status }
    });

    res.json({ data: result.rows[0] });
  })
);

router.get(
  "/:id/download",
  authenticate,
  requireArchivePermission(canDownloadArchive, "Anda tidak dapat mengunduh arsip ini"),
  asyncHandler(async (req, res) => {
    const archive = req.archive;

    await logActivity({
      userId: req.user.id,
      action: "DOWNLOAD",
      entity: "archive",
      entityId: archive.id,
      metadata: { documentNumber: archive.document_number }
    });

    if (archive.file_path) {
      const absolutePath = resolveUploadPath(archive.file_path);
      if (fs.existsSync(absolutePath)) {
        return res.download(absolutePath, archive.file_original_name || `arsip-${archive.id}`);
      }
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="arsip-${archive.id}.txt"`);
    return res.send(
      [
        "SIPADI - Dokumen dummy",
        `Nomor: ${archive.document_number}`,
        `Judul: ${archive.title}`,
        `Status: ${archive.status}`,
        "",
        "File asli belum tersedia karena data seed menggunakan dokumen dummy."
      ].join("\n")
    );
  })
);

export default router;
