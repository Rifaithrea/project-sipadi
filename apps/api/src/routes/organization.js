import { Router } from "express";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

function toTree(units) {
  const byId = new Map();
  const roots = [];

  units.forEach((unit) => {
    byId.set(unit.id, { ...unit, children: [] });
  });

  byId.forEach((unit) => {
    if (unit.parent_id && byId.has(unit.parent_id)) {
      byId.get(unit.parent_id).children.push(unit);
    } else {
      roots.push(unit);
    }
  });

  return roots;
}

router.get(
  "/users",
  authenticate,
  asyncHandler(async (req, res) => {
    const users = await query(
      `SELECT u.id, u.name, u.username, u.email, u.role, u.unit_id, ou.name AS unit_name
       FROM users u
       LEFT JOIN organization_units ou ON ou.id = u.unit_id
       WHERE u.is_active = TRUE
       ORDER BY ou.name ASC, u.name ASC`
    );

    res.json({ data: users.rows });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const units = await query(
      `SELECT ou.id, ou.name, ou.code, ou.parent_id, ou.unit_type, ou.description,
              COUNT(u.id)::int AS user_count
       FROM organization_units ou
       LEFT JOIN users u ON u.unit_id = ou.id AND u.is_active = TRUE
       GROUP BY ou.id
       ORDER BY ou.id ASC`
    );

    res.json({
      data: units.rows,
      tree: toTree(units.rows)
    });
  })
);

export default router;
