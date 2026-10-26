import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asString } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

const STATUSES = ["pendiente", "en_proceso", "resuelto"];
const PRIORITIES = ["baja", "media", "alta", "urgente"];

// POST /api/reports  { room_id, description, priority }
router.post("/", requirePermission("reports.create"), async (req, res, next) => {
  try {
    const { room_id, priority = "media" } = req.body;
    const description = asString(req.body.description).trim();

    if (!/^\d+$/.test(String(room_id ?? "")))
      return res.status(400).json({ error: "Selecciona un salón" });
    if (description.length < 5)
      return res.status(400).json({ error: "Describe la anomalía (mínimo 5 caracteres)" });
    if (!PRIORITIES.includes(priority))
      return res.status(400).json({ error: "Prioridad inválida" });

    const result = await query(
      `INSERT INTO reports (room_id, user_id, description, priority)
       SELECT id, $2, $3, $4 FROM rooms WHERE id = $1 AND active
       RETURNING id`,
      [room_id, req.user.id, description, priority],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "El salón no existe o no está disponible" });

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports[?status=pendiente]  -> historial, lo más urgente primero
router.get("/", requirePermission("reports.view_history"), async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && !STATUSES.includes(status))
      return res.status(400).json({ error: "Estado inválido" });

    const { rows } = await query(
      `SELECT rp.id, rp.description, rp.status, rp.priority, rp.resolution_notes,
              rp.created_at, rp.resolved_at,
              rm.name AS room_name, u.name AS user_name
       FROM reports rp
       JOIN rooms rm ON rm.id = rp.room_id
       JOIN users u  ON u.id = rp.user_id
       WHERE ($1::report_status IS NULL OR rp.status = $1)
       ORDER BY (rp.status = 'resuelto'),
                CASE rp.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
                rp.created_at DESC`,
      [status || null],
    );
    res.json({ reports: rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reports/:id/status  { status, resolution_notes? }
router.patch("/:id/status", async (req, res, next) => {
  try {
    const perms = req.user.permissions;
    if (!perms.includes("reports.update_status") && !perms.includes("reports.manage"))
      return res.status(403).json({ error: "No tienes permiso para esta acción" });
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const { status, resolution_notes } = req.body;
    if (!STATUSES.includes(status))
      return res.status(400).json({ error: "Estado inválido" });

    const result = await query(
      `UPDATE reports
       SET status = $2, resolution_notes = COALESCE($3, resolution_notes)
       WHERE id = $1`,
      [req.params.id, status, asString(resolution_notes).trim() || null],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Reporte no encontrado" });

    res.json({ message: "Estado actualizado" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reports/:id
router.delete("/:id", requirePermission("reports.manage"), async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });
    const result = await query("DELETE FROM reports WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Reporte no encontrado" });
    res.json({ message: "Reporte eliminado" });
  } catch (err) {
    next(err);
  }
});

export default router;
