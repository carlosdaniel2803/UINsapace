import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asString } from "../utils/validate.js";

const router = Router();
router.use(requireAuth, requirePermission("roles.manage"));

// Full-access role: its permissions cannot be edited.
const ADMIN_ROLE_CODE = "administrador";

// Permission key format: "recurso.accion"
const PERMISSION_KEY_RE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

// "Jefa de Carrera" -> "jefa_de_carrera" (matches the roles.code CHECK)
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

// Shared select for the role list and the role detail.
const ROLE_SELECT = `
  SELECT r.id, r.code, r.name, r.description, r.is_system,
         (SELECT count(*)::int FROM users u WHERE u.role_id = r.id) AS user_count,
         COALESCE((SELECT array_agg(p.code ORDER BY p.code)
                   FROM role_permissions rp
                   JOIN permissions p ON p.id = rp.permission_id
                   WHERE rp.role_id = r.id), '{}') AS permissions
  FROM roles r`;

/**
 * Indica si ya existe otro rol con ese nombre (ignora mayúsculas).
 * @param {string} name
 * @param {number} exceptId Id que se excluye de la comparación.
 * @returns {Promise<boolean>}
 */
async function nameTaken(name, exceptId = 0) {
  const { rows } = await query(
    "SELECT 1 FROM roles WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1",
    [name, exceptId],
  );
  return rows.length > 0;
}

/**
 * Normaliza la lista de códigos de permiso que llega del cliente.
 * @param {unknown} permissions
 * @returns {string[] | null} null cuando la lista no es válida.
 */
function readPermissionCodes(permissions) {
  if (!Array.isArray(permissions)) return null;
  if (permissions.some((p) => typeof p !== "string")) return null;
  return [...new Set(permissions.map((p) => p.trim()).filter(Boolean))];
}

// GET /api/roles -> roles with their permissions and how many users use them
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(`${ROLE_SELECT} ORDER BY r.is_system DESC, r.id`);
    res.json({ roles: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/roles/permissions -> permission catalog
router.get("/permissions", async (_req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, code, description, is_system FROM permissions ORDER BY code",
    );
    res.json({ permissions: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/roles/permissions -> crea un permiso (siempre no base)
router.post("/permissions", async (req, res, next) => {
  try {
    const code = asString(req.body.code).trim();
    const description = asString(req.body.description).trim().slice(0, 255) || null;

    if (!PERMISSION_KEY_RE.test(code))
      return res
        .status(400)
        .json({ error: "La clave debe tener el formato recurso.accion" });

    const { rows } = await query(
      `INSERT INTO permissions (code, description) VALUES ($1, $2)
       RETURNING id, code, description, is_system`,
      [code, description],
    );
    res.status(201).json({ permission: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un permiso con esa clave" });
    next(err);
  }
});

// PATCH /api/roles/permissions/:id -> base permissions only change their description
router.patch("/permissions/:id", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const { rows } = await query(
      "SELECT id, code, description, is_system FROM permissions WHERE id = $1",
      [req.params.id],
    );
    const permission = rows[0];
    if (!permission) return res.status(404).json({ error: "Permiso no encontrado" });

    const code = permission.is_system
      ? permission.code
      : asString(req.body.code).trim() || permission.code;
    if (!PERMISSION_KEY_RE.test(code))
      return res
        .status(400)
        .json({ error: "La clave debe tener el formato recurso.accion" });

    const description = asString(req.body.description).trim().slice(0, 255) || null;
    const { rows: updated } = await query(
      `UPDATE permissions SET code = $1, description = $2 WHERE id = $3
       RETURNING id, code, description, is_system`,
      [code, description, req.params.id],
    );
    res.json({ permission: updated[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un permiso con esa clave" });
    next(err);
  }
});

// DELETE /api/roles/permissions/:id -> base permissions cannot be deleted
router.delete("/permissions/:id", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const { rows } = await query(
      "SELECT id, code, is_system FROM permissions WHERE id = $1",
      [req.params.id],
    );
    const permission = rows[0];
    if (!permission) return res.status(404).json({ error: "Permiso no encontrado" });
    if (permission.is_system)
      return res
        .status(409)
        .json({ error: `"${permission.code}" es un permiso base y no se puede eliminar` });

    await query("DELETE FROM permissions WHERE id = $1", [req.params.id]);
    res.json({ message: "Permiso eliminado" });
  } catch (err) {
    next(err);
  }
});

// GET /api/roles/:id -> role detail
router.get("/:id", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const { rows } = await query(`${ROLE_SELECT} WHERE r.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Rol no encontrado" });
    res.json({ role: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/roles  { name, description, permissions: ["reports.create", ...] }
router.post("/", async (req, res, next) => {
  const { name, description = "" } = req.body;
  const cleanName = asString(name).trim();
  const code = slugify(cleanName);
  const codes = readPermissionCodes(req.body.permissions);

  if (!cleanName || cleanName.length > 60)
    return res.status(400).json({ error: "El nombre es obligatorio (máx. 60 caracteres)" });
  if (!/^[a-z][a-z0-9_]*$/.test(code))
    return res.status(400).json({ error: "El nombre debe comenzar con una letra" });
  if (!codes) return res.status(400).json({ error: "Permisos inválidos" });
  if (await nameTaken(cleanName))
    return res.status(409).json({ error: "Ya existe un rol con ese nombre" });

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const role = await client.query(
      `INSERT INTO roles (code, name, description) VALUES ($1, $2, $3)
       RETURNING id, code, name, description, is_system`,
      [code, cleanName, asString(description).trim().slice(0, 255) || null],
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
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un rol con ese nombre" });
    next(err);
  } finally {
    client?.release();
  }
});

// PUT /api/roles/:id -> renames the role or updates its description (never the code)
router.put("/:id", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });

    const cleanName = asString(req.body.name).trim();
    if (!cleanName || cleanName.length > 60)
      return res.status(400).json({ error: "El nombre es obligatorio (máx. 60 caracteres)" });

    const { rows } = await query(
      "SELECT id, code, name, is_system FROM roles WHERE id = $1",
      [req.params.id],
    );
    const role = rows[0];
    if (!role) return res.status(404).json({ error: "Rol no encontrado" });
    if (role.is_system)
      return res
        .status(403)
        .json({ error: `"${role.name}" es un rol del sistema y no se puede renombrar` });
    if (await nameTaken(cleanName, role.id))
      return res.status(409).json({ error: "Ya existe un rol con ese nombre" });

    const description = asString(req.body.description).trim().slice(0, 255) || null;
    const { rows: updated } = await query(
      `UPDATE roles SET name = $1, description = $2 WHERE id = $3
       RETURNING id, code, name, description, is_system`,
      [cleanName, description, role.id],
    );
    res.json({ role: updated[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Ya existe un rol con ese nombre" });
    next(err);
  }
});

// PUT /api/roles/:id/permissions -> leaves the role with exactly that permission list
router.put("/:id/permissions", async (req, res, next) => {
  const codes = readPermissionCodes(req.body.permissions);
  let client;

  try {
    if (!/^\d+$/.test(req.params.id))
      return res.status(400).json({ error: "Id inválido" });
    if (!codes) return res.status(400).json({ error: "Permisos inválidos" });

    const { rows } = await query(
      "SELECT id, code, name FROM roles WHERE id = $1",
      [req.params.id],
    );
    const role = rows[0];
    if (!role) return res.status(404).json({ error: "Rol no encontrado" });
    if (role.code === ADMIN_ROLE_CODE)
      return res
        .status(403)
        .json({ error: "Los permisos del rol Administrador no se pueden editar" });

    client = await pool.connect();
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT code FROM permissions WHERE code = ANY($1)",
      [codes],
    );
    if (found.rowCount !== codes.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Algún permiso no existe" });
    }
    await client.query("DELETE FROM role_permissions WHERE role_id = $1", [role.id]);
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions WHERE code = ANY($2)`,
      [role.id, codes],
    );
    await client.query("COMMIT");

    const { rows: updated } = await query(`${ROLE_SELECT} WHERE r.id = $1`, [role.id]);
    res.json({ role: updated[0] });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client?.release();
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
      return res.status(403).json({ error: `"${role.name}" es un rol del sistema y no se puede eliminar` });
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
