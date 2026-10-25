import jwt from "jsonwebtoken";
import { query } from "../db.js";

// Verifica el token y carga al usuario con sus permisos
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sesión requerida" });

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, r.code AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.active`,
      [sub],
    );
    if (!rows[0]) return res.status(401).json({ error: "Usuario no válido" });

    const perms = await query(
      "SELECT permission FROM user_permissions WHERE user_id = $1",
      [sub],
    );

    req.user = { ...rows[0], permissions: perms.rows.map((p) => p.permission) };
    next();
  } catch {
    res.status(401).json({ error: "Sesión inválida o expirada" });
  }
}

// Uso: router.post("/", requireAuth, requirePermission("roles.manage"), ...)
export const requirePermission = (code) => (req, res, next) =>
  req.user?.permissions.includes(code)
    ? next()
    : res.status(403).json({ error: "No tienes permiso para esta acción" });
