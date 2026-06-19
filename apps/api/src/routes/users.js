import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, cleanText, createHttpError, pagination } from "../utils/http.js";
import { logActivity } from "../services/audit.js";

const router = Router();

const roleSchema = z.enum(["Admin", "Inspektur", "Sekretaris", "Sub Bag", "Irban Wilayah", "Staff"]);
const optionalUnitId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const createSchema = z.object({
  name: z.string().trim().min(3),
  username: z.string().trim().min(3),
  email: z.string().trim().email(),
  password: z.string().min(6),
  role: roleSchema,
  unitId: optionalUnitId,
  isActive: z.boolean().optional().default(true)
});

const updateSchema = z.object({
  name: z.string().trim().min(3).optional(),
  username: z.string().trim().min(3).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: roleSchema.optional(),
  unitId: optionalUnitId,
  isActive: z.boolean().optional()
});

function userSelectSql() {
  return `
    SELECT u.id, u.name, u.username, u.email, u.role, u.unit_id, u.is_active,
           u.created_at, u.updated_at, ou.name AS unit_name
    FROM users u
    LEFT JOIN organization_units ou ON ou.id = u.unit_id
  `;
}

router.use(authenticate, authorize("Admin"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const where = [];
    const values = [];
    let index = 1;

    const search = cleanText(req.query.search);
    if (search) {
      values.push(`%${search}%`);
      where.push(`(u.name ILIKE $${index} OR u.email ILIKE $${index} OR u.username ILIKE $${index})`);
      index += 1;
    }

    const role = cleanText(req.query.role);
    if (role) {
      values.push(role);
      where.push(`u.role = $${index}`);
      index += 1;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const count = await query(`SELECT COUNT(*)::int AS total FROM users u ${whereSql}`, values);
    const data = await query(
      `${userSelectSql()}
       ${whereSql}
       ORDER BY u.created_at DESC
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
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    try {
      const result = await query(
        `INSERT INTO users (name, username, email, password_hash, role, unit_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, username, email, role, unit_id, is_active, created_at, updated_at`,
        [
          req.body.name,
          req.body.username,
          req.body.email,
          passwordHash,
          req.body.role,
          req.body.unitId || null,
          req.body.isActive
        ]
      );

      await logActivity({
        userId: req.user.id,
        action: "CREATE",
        entity: "user",
        entityId: result.rows[0].id,
        metadata: { email: req.body.email, role: req.body.role }
      });

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") throw createHttpError(409, "Username atau email sudah digunakan");
      throw error;
    }
  })
);

router.put(
  "/:id",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) throw createHttpError(404, "User tidak ditemukan");

    const passwordHash = req.body.password ? await bcrypt.hash(req.body.password, 10) : existing.rows[0].password_hash;

    try {
      const result = await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             username = COALESCE($2, username),
             email = COALESCE($3, email),
             password_hash = $4,
             role = COALESCE($5, role),
             unit_id = COALESCE($6, unit_id),
             is_active = COALESCE($7, is_active),
             updated_at = NOW()
         WHERE id = $8
         RETURNING id, name, username, email, role, unit_id, is_active, created_at, updated_at`,
        [
          req.body.name || null,
          req.body.username || null,
          req.body.email || null,
          passwordHash,
          req.body.role || null,
          req.body.unitId || null,
          req.body.isActive,
          req.params.id
        ]
      );

      await logActivity({
        userId: req.user.id,
        action: "UPDATE",
        entity: "user",
        entityId: Number(req.params.id)
      });

      res.json({ data: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") throw createHttpError(409, "Username atau email sudah digunakan");
      throw error;
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      throw createHttpError(400, "Akun yang sedang login tidak dapat dinonaktifkan dari sesi sendiri");
    }

    const result = await query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (!result.rows[0]) throw createHttpError(404, "User tidak ditemukan");

    await logActivity({
      userId: req.user.id,
      action: "DELETE",
      entity: "user",
      entityId: Number(req.params.id)
    });

    res.status(204).send();
  })
);

export default router;
