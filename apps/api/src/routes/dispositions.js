import { Router } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authenticate, canAccessAll } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, cleanText, createHttpError, pagination } from "../utils/http.js";
import { logActivity } from "../services/audit.js";
import { DISPOSITION_STATUSES } from "../services/archiveQueries.js";
import { canCreateDisposition } from "../services/permissions.js";

const router = Router();

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const createSchema = z
  .object({
    archiveId: z.coerce.number().int().positive(),
    toUserId: optionalPositiveInt,
    toUnitId: optionalPositiveInt,
    note: z.string().trim().min(5),
    deadline: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Deadline tidak valid"),
    status: z.enum(["Dikirim", "Dibaca", "Diproses", "Selesai", "Dibatalkan"]).optional().default("Dikirim")
  })
  .refine((data) => data.toUserId || data.toUnitId, {
    message: "Pilih tujuan user atau unit",
    path: ["toUserId"]
  });

const statusSchema = z.object({
  status: z.enum(["Dikirim", "Dibaca", "Diproses", "Selesai", "Dibatalkan"]),
  note: z.string().trim().optional().default("")
});

function dispositionAccessWhere(user, startIndex = 1) {
  if (canAccessAll(user)) {
    return { where: [], values: [], nextIndex: startIndex };
  }

  return {
    where: [`(d.from_user_id = $${startIndex} OR d.to_user_id = $${startIndex} OR d.to_unit_id = $${startIndex + 1})`],
    values: [user.id, user.unitId],
    nextIndex: startIndex + 2
  };
}

async function ensureArchiveVisible(archiveId, user) {
  const result = await query("SELECT id, unit_id FROM archives WHERE id = $1", [archiveId]);
  const archive = result.rows[0];

  if (!archive) throw createHttpError(404, "Arsip tidak ditemukan");

  return archive;
}

async function getDispositionForUser(id, user) {
  const result = await query("SELECT * FROM dispositions d WHERE d.id = $1", [id]);
  const disposition = result.rows[0];

  if (!disposition) throw createHttpError(404, "Disposisi tidak ditemukan");

  const visible =
    canAccessAll(user) ||
    disposition.from_user_id === user.id ||
    disposition.to_user_id === user.id ||
    disposition.to_unit_id === user.unitId;

  if (!visible) throw createHttpError(403, "Disposisi ini berada di luar akses Anda");

  return disposition;
}

function dispositionSelectSql() {
  return `
    SELECT d.id, d.archive_id, d.from_user_id, d.to_user_id, d.to_unit_id, d.note, d.deadline,
           d.status, d.created_at, d.updated_at,
           a.title AS archive_title, a.document_number,
           fu.name AS from_user_name, tu.name AS to_user_name, ou.name AS to_unit_name
    FROM dispositions d
    JOIN archives a ON a.id = d.archive_id
    LEFT JOIN users fu ON fu.id = d.from_user_id
    LEFT JOIN users tu ON tu.id = d.to_user_id
    LEFT JOIN organization_units ou ON ou.id = d.to_unit_id
  `;
}

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const scope = dispositionAccessWhere(req.user);
    const where = [...scope.where];
    const values = [...scope.values];
    let index = scope.nextIndex;

    const status = cleanText(req.query.status);
    if (status) {
      if (!DISPOSITION_STATUSES.includes(status)) throw createHttpError(422, "Status disposisi tidak valid");
      values.push(status);
      where.push(`d.status = $${index}`);
      index += 1;
    }

    const search = cleanText(req.query.search);
    if (search) {
      values.push(`%${search}%`);
      where.push(`(a.title ILIKE $${index} OR a.document_number ILIKE $${index} OR d.note ILIKE $${index})`);
      index += 1;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const count = await query(
      `SELECT COUNT(*)::int AS total
       FROM dispositions d
       JOIN archives a ON a.id = d.archive_id
       ${whereSql}`,
      values
    );

    const data = await query(
      `${dispositionSelectSql()}
       ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...values, limit, offset]
    );

    res.json({
      data: data.rows,
      meta: { page, limit, total: count.rows[0].total }
    });
  })
);

router.post(
  "/",
  authenticate,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    if (!canCreateDisposition(req.user)) {
      throw createHttpError(403, "Hanya Admin, Inspektur, atau Sekretaris yang dapat membuat disposisi");
    }

    await ensureArchiveVisible(req.body.archiveId, req.user);

    const result = await query(
      `INSERT INTO dispositions (archive_id, from_user_id, to_user_id, to_unit_id, note, deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.body.archiveId,
        req.user.id,
        req.body.toUserId || null,
        req.body.toUnitId || null,
        req.body.note,
        req.body.deadline,
        req.body.status
      ]
    );

    await query(
      "INSERT INTO disposition_history (disposition_id, status, note, user_id) VALUES ($1, $2, $3, $4)",
      [result.rows[0].id, req.body.status, "Disposisi dibuat.", req.user.id]
    );

    await logActivity({
      userId: req.user.id,
      action: "CREATE",
      entity: "disposition",
      entityId: result.rows[0].id,
      metadata: { archiveId: req.body.archiveId }
    });

    res.status(201).json({ data: result.rows[0] });
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    await getDispositionForUser(req.params.id, req.user);

    const disposition = await query(`${dispositionSelectSql()} WHERE d.id = $1`, [req.params.id]);
    const history = await query(
      `SELECT h.id, h.status, h.note, h.created_at, u.name AS user_name
       FROM disposition_history h
       LEFT JOIN users u ON u.id = h.user_id
       WHERE h.disposition_id = $1
       ORDER BY h.created_at ASC`,
      [req.params.id]
    );

    res.json({ data: { ...disposition.rows[0], history: history.rows } });
  })
);

router.patch(
  "/:id/status",
  authenticate,
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    await getDispositionForUser(req.params.id, req.user);

    const result = await query(
      `UPDATE dispositions
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.body.status, req.params.id]
    );

    await query(
      "INSERT INTO disposition_history (disposition_id, status, note, user_id) VALUES ($1, $2, $3, $4)",
      [req.params.id, req.body.status, req.body.note || "Status disposisi diperbarui.", req.user.id]
    );

    await logActivity({
      userId: req.user.id,
      action: "UPDATE_STATUS",
      entity: "disposition",
      entityId: Number(req.params.id),
      metadata: { status: req.body.status }
    });

    res.json({ data: result.rows[0] });
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const disposition = await getDispositionForUser(req.params.id, req.user);
    if (!canAccessAll(req.user) && disposition.from_user_id !== req.user.id) {
      throw createHttpError(403, "Hanya pembuat disposisi atau pimpinan yang dapat menghapus");
    }

    await query("DELETE FROM dispositions WHERE id = $1", [req.params.id]);
    await logActivity({
      userId: req.user.id,
      action: "DELETE",
      entity: "disposition",
      entityId: Number(req.params.id)
    });

    res.status(204).send();
  })
);

export default router;
