import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asString } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TZ = "America/Mexico_City";

// GET /api/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD[&room_id=]
// Con "reservations.view_all" se ve quién reservó, el motivo y las canceladas.
// Sin él solo se ven horarios ocupados (y el detalle de las reservas propias).
router.get("/", requirePermission("calendar.view"), async (req, res, next) => {
  try {
    const { from, to, room_id } = req.query;
    if (!DATE_RE.test(from || "") || !DATE_RE.test(to || ""))
      return res.status(400).json({ error: "Rango de fechas inválido" });
    if (room_id && !/^\d+$/.test(room_id))
      return res.status(400).json({ error: "Salón inválido" });

    const viewAll = req.user.permissions.includes("reservations.view_all");

    const { rows } = await query(
      `SELECT r.id, r.room_id, rm.name AS room_name,
              to_char(r.date, 'YYYY-MM-DD') AS date,
              to_char(r.start_time, 'HH24:MI') AS start_time,
              to_char(r.end_time, 'HH24:MI') AS end_time,
              r.status, r.purpose, r.cancel_reason, u.name AS user_name,
              (r.user_id = $3) AS mine
       FROM reservations r
       JOIN rooms rm ON rm.id = r.room_id
       JOIN users u  ON u.id = r.user_id
       WHERE r.date BETWEEN $1 AND $2
         AND ($4::bigint IS NULL OR r.room_id = $4)
         AND ($5 OR r.status = 'confirmada')
       ORDER BY r.date, r.start_time`,
      [from, to, req.user.id, room_id || null, viewAll],
    );

    const reservations = rows.map((r) =>
      viewAll || r.mine
        ? r
        : {
            room_id: r.room_id,
            room_name: r.room_name,
            date: r.date,
            start_time: r.start_time,
            end_time: r.end_time,
            status: r.status,
            mine: false,
          },
    );
    res.json({ reservations });
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations  { room_id, date, start_time, end_time, purpose }
router.post("/", requirePermission("reservations.create"), async (req, res, next) => {
  try {
    const { room_id, purpose } = req.body;
    const date = asString(req.body.date);
    const start_time = asString(req.body.start_time);
    const end_time = asString(req.body.end_time);
    const cleanPurpose = asString(purpose).trim().slice(0, 255);

    if (!/^\d+$/.test(String(room_id ?? "")))
      return res.status(400).json({ error: "Selecciona un salón" });
    if (!DATE_RE.test(date) || !TIME_RE.test(start_time) || !TIME_RE.test(end_time))
      return res.status(400).json({ error: "Fecha u horario inválido" });
    if (end_time <= start_time)
      return res.status(400).json({ error: "La hora de fin debe ser posterior a la de inicio" });

    const past = await query(
      "SELECT ($1::date + $2::time) < (now() AT TIME ZONE $3) AS past",
      [date, start_time, TZ],
    );
    if (past.rows[0].past)
      return res.status(400).json({ error: "No se puede reservar en el pasado" });

    const result = await query(
      `INSERT INTO reservations (user_id, room_id, date, start_time, end_time, purpose)
       SELECT $1, id, $3, $4, $5, $6 FROM rooms WHERE id = $2 AND active
       RETURNING id`,
      [req.user.id, room_id, date, start_time, end_time, cleanPurpose || null],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "El salón no existe o no está disponible" });

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    // 23P01 = traslape (restricción reservations_no_overlap)
    if (err.code === "23P01")
      return res.status(409).json({ error: "El salón ya está reservado en ese horario" });
    next(err);
  }
});

// POST /api/reservations/:id/cancel  { reason }
router.post("/:id/cancel", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const { rows } = await query(
      "SELECT user_id, status FROM reservations WHERE id = $1",
      [req.params.id],
    );
    const reservation = rows[0];
    if (!reservation) return res.status(404).json({ error: "Reservación no encontrada" });
    if (reservation.status === "cancelada")
      return res.status(409).json({ error: "La reservación ya está cancelada" });

    const isOwner = String(reservation.user_id) === String(req.user.id);
    const canAny =
      req.user.permissions.includes("reservations.cancel_any") ||
      req.user.permissions.includes("reservations.manage");
    if (!isOwner && !canAny)
      return res.status(403).json({ error: "No tienes permiso para cancelar esta reservación" });

    await query(
      `UPDATE reservations
       SET status = 'cancelada', cancelled_by = $2, cancelled_at = now(), cancel_reason = $3
       WHERE id = $1`,
      [req.params.id, req.user.id, asString(req.body.reason).trim().slice(0, 255) || null],
    );
    res.json({ message: "Reservación cancelada" });
  } catch (err) {
    next(err);
  }
});

export default router;
