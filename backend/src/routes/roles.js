import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requirePermission("roles.manage"));

// "Jefa de Carrera" -> "jefa_de_carrera" (cumple el CHECK de roles.code)
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

// GET /api/roles -> roles con sus permisos y cuántos usuarios los usan
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.code, r.name, r.description, r.is_system,
              (SELECT count(*)::int FROM users u WHERE u.role_id = r.id) AS user_count,
              COALESCE((SELECT array_agg(p.code ORDER BY p.code)
                        FROM role_permissions rp
                        JOIN permissions p ON p.id = rp.permission_id
                        WHERE rp.role_id = r.id), '{}') AS permissions
       FROM roles r
       ORDER BY r.is_system DESC, r.id`,
    );
    res.json({ roles: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/roles/permissions -> catálogo de permisos
router.get("/permissions", async (_req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT code, description FROM permissions ORDER BY code",
    );
    res.json({ permissions: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/roles  { name, description, permissions: ["reports.create", ...] }
router.post("/", async (req, res, next) => {
  const { name, description = "", permissions = [] } = req.body;
  const cleanName = (name || "").trim();
  const code = slugify(cleanName);

  if (!cleanName || cleanName.length > 60)
    return res.status(400).json({ error: "El nombre es obligatorio (máx. 60 caracteres)" });
  if (!/^[a-z][a-z0-9_]*$/.test(code))
    return res.status(400).json({ error: "El nombre debe comenzar con una letra" });
  if (!Array.isArray(permissions))
    return res.status(400).json({ error: "Permisos inválidos" });

  const codes = [...new Set(permissions)];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const role = await client.query(
      `INSERT INTO roles (code, name, description) VALUES ($1, $2, $3)
       RETURNING id, code, name, description, is_system`,
      [code, cleanName, description.trim().slice(0, 255) || null],
    );
    const granted = await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions WHERE code = ANY($2)`,
      [role.rows[0].id, codes],
    );
    if (granted.rowCount !== codes.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Algún permiso no existe" });
    }
    await client.query("COMMIT");
    res.status(201).json({ role: role.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un rol con ese nombre" });
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/roles/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const { rows } = await query(
      `SELECT r.is_system, r.name,
              (SELECT count(*)::int FROM users u WHERE u.role_id = r.id) AS user_count
       FROM roles r WHERE r.id = $1`,
      [req.params.id],
    );
    const role = rows[0];
    if (!role) return res.status(404).json({ error: "Rol no encontrado" });
    if (role.is_system)
      return res.status(403).json({ error: `"${role.name}" es un rol predeterminado y no se puede eliminar` });
    if (role.user_count > 0)
      return res.status(409).json({
        error: `Hay ${role.user_count} usuario(s) con este rol. Reasígnalos antes de eliminarlo`,
      });

    await query("DELETE FROM roles WHERE id = $1", [req.params.id]);
    res.json({ message: "Rol eliminado" });
  } catch (err) {
    next(err);
  }
});

export default router;
