import { query } from "../config/db.js";
import { asyncHandler, createHttpError } from "../utils/http.js";

export async function getArchiveById(id) {
  const result = await query("SELECT * FROM archives WHERE id = $1", [id]);
  const archive = result.rows[0];

  if (!archive) {
    throw createHttpError(404, "Arsip tidak ditemukan");
  }

  return archive;
}

export function requireArchivePermission(getAllowed, message) {
  return asyncHandler(async (req, res, next) => {
    const archive = await getArchiveById(req.params.id);

    if (!getAllowed(req.user, archive)) {
      throw createHttpError(403, message);
    }

    req.archive = archive;
    next();
  });
}
