import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, createHttpError } from "../utils/http.js";
import { logActivity } from "../services/audit.js";

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6)
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    unitId: user.unit_id || user.unitId,
    unitName: user.unit_name || user.unitName,
    isActive: user.is_active
  };
}

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const result = await query(
      `SELECT u.id, u.name, u.username, u.email, u.password_hash, u.role, u.unit_id, u.is_active, ou.name AS unit_name
       FROM users u
       LEFT JOIN organization_units ou ON ou.id = u.unit_id
       WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw createHttpError(401, "Email/username atau password salah");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw createHttpError(401, "Email/username atau password salah");
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn
    });

    await logActivity({
      userId: user.id,
      action: "LOGIN",
      entity: "auth",
      metadata: { identifier }
    });

    res.json({
      token,
      user: publicUser(user)
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

export default router;
