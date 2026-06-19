import { Router } from "express";
import { query } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler, cleanText, pagination } from "../utils/http.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("Admin", "Inspektur", "Sekretaris"),
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = pagination(req.query);
    const where = [];
    const values = [];
    let index = 1;

    const search = cleanText(req.query.search);
    if (search) {
      values.push(`%${search}%`);
      where.push(`(al.action ILIKE $${index} OR al.entity ILIKE $${index} OR u.name ILIKE $${index})`);
      index += 1;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const count = await query(
      `SELECT COUNT(*)::int AS total
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${whereSql}`,
      values
    );

    const data = await query(
      `SELECT al.id, al.user_id, al.action, al.entity, al.entity_id, al.metadata, al.created_at,
              u.name AS user_name, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...values, limit, offset]
    );

    res.json({
      data: data.rows,
      meta: { page, limit, total: count.rows[0].total }
    });
  })
);

export default router;
