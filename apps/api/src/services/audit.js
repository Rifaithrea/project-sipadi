import { query } from "../config/db.js";

export async function logActivity({ userId, action, entity, entityId = null, metadata = {} }) {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId || null, action, entity, entityId, JSON.stringify(metadata)]
  );
}
