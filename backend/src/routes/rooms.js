import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

// GET /api/rooms -> salones activos
router.get("/", requireAuth, requirePermission("rooms.view"), async (_req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, type, capacity, location FROM rooms WHERE active ORDER BY name",
    );
    res.json({ rooms: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
