import { Router } from "express";
import { query } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { archiveSelectSql, buildArchiveFilters } from "../services/archiveQueries.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = buildArchiveFilters({ filters: req.query, user: req.user });

    const totals = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Menunggu Review')::int AS waiting_review,
        COUNT(*) FILTER (WHERE status = 'Terverifikasi')::int AS verified,
        COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'Ditolak')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'Diarsipkan')::int AS archived
       FROM archives a
       ${filters.whereSql}`,
      filters.values
    );

    const unitCounts = await query(
      `SELECT ou.id, ou.name, COUNT(a.id)::int AS total
       FROM organization_units ou
       LEFT JOIN archives a ON a.unit_id = ou.id
       GROUP BY ou.id, ou.name
       ORDER BY total DESC, ou.name ASC`
    );

    const recentArchives = await query(
      `${archiveSelectSql()}
       ${filters.whereSql}
       ORDER BY a.created_at DESC
       LIMIT 6`,
      filters.values
    );

    const activities = await query(
      `SELECT al.id, al.action, al.entity, al.entity_id, al.metadata, al.created_at,
              u.name AS user_name, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT 8`
    );

    res.json({
      stats: {
        totalArchives: totals.rows[0].total,
        divisionArchives: unitCounts.rows.find((unit) => unit.id === Number(req.query.unitId))?.total || totals.rows[0].total,
        waitingReview: totals.rows[0].waiting_review,
        verified: totals.rows[0].verified,
        draft: totals.rows[0].draft,
        rejected: totals.rows[0].rejected,
        archived: totals.rows[0].archived
      },
      unitCounts: unitCounts.rows,
      recentArchives: recentArchives.rows,
      activities: activities.rows
    });
  })
);

export default router;
