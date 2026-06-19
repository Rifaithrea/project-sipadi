import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { createHttpError, asyncHandler } from "../utils/http.js";

export const GLOBAL_ROLES = ["Admin", "Inspektur", "Sekretaris"];

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw createHttpError(401, "Token tidak ditemukan");
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw createHttpError(401, "Token tidak valid atau sudah kedaluwarsa");
  }

  const result = await query(
    `SELECT u.id, u.name, u.username, u.email, u.role, u.unit_id, u.is_active, ou.name AS unit_name
     FROM users u
     LEFT JOIN organization_units ou ON ou.id = u.unit_id
     WHERE u.id = $1`,
    [payload.sub]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    throw createHttpError(401, "Akun tidak aktif");
  }

  req.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    unitId: user.unit_id,
    unitName: user.unit_name
  };

  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(createHttpError(401, "Autentikasi diperlukan"));
    if (!roles.includes(req.user.role)) {
      return next(createHttpError(403, "Role Anda tidak memiliki akses ke fitur ini"));
    }
    return next();
  };
}

export function canAccessAll(user) {
  return GLOBAL_ROLES.includes(user.role);
}

export function enforceUnitScope(req, requestedUnitId) {
  if (canAccessAll(req.user)) return requestedUnitId || null;
  return req.user.unitId;
}
