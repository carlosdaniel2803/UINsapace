import jwt from "jsonwebtoken";
import { query } from "../db.js";

const BEARER_RE = /^Bearer\s+(\S+)$/i;

/**
 * Routes that do not require a token. The Authorization header is ignored
 * there, so an old or invalid token does not block login or registration.
 * @type {Set<string>}
 */
export const PUBLIC_PATHS = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
]);

/**
 * Reads the token from the Authorization header.
 * @param {import("express").Request} req
 * @returns {{ token?: string, error?: string }} { token } when the header is
 * valid, otherwise { error } with the message the frontend expects.
 */
export function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header)
    return { error: "Falta el encabezado Authorization (Bearer <token>)" };

  const match = BEARER_RE.exec(header);
  if (!match)
    return {
      error: "Formato de Authorization inválido. Usa: Authorization: Bearer <token>",
    };

  return { token: match[1] };
}

/**
 * Loads the user with role and permissions from the token.
 * @param {string} token
 * @returns {Promise<object|null>} null when the token is invalid or the user
 * no longer exists / is inactive.
 */
async function loadUserFromToken(token) {
  let sub;
  try {
    ({ sub } = jwt.verify(token, process.env.JWT_SECRET));
  } catch {
    return null;
  }

  const { rows } = await query(
    `SELECT u.id, u.name, u.email, r.code AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.active`,
    [sub],
  );
  if (!rows[0]) return null;

  const perms = await query(
    "SELECT permission FROM user_permissions WHERE user_id = $1",
    [sub],
  );

  return { ...rows[0], permissions: perms.rows.map((p) => p.permission) };
}

/**
 * Global middleware: validates the Bearer token of every request and sets req.user.
 * CORS preflight requests carry no Authorization header, so they pass through.
 * @type {import("express").RequestHandler}
 */
export async function authenticate(req, res, next) {
  if (req.method === "OPTIONS" || PUBLIC_PATHS.has(req.path)) return next();

  const { token, error } = extractBearerToken(req);
  if (!token) return res.status(401).json({ error });

  try {
    const user = await loadUserFromToken(token);
    if (!user)
      return res.status(401).json({ error: "Sesión inválida o expirada" });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Checks the request is authenticated.
 * The user is already loaded by `authenticate`; this only verifies it exists.
 * @type {import("express").RequestHandler}
 */
export function requireAuth(req, res, next) {
  if (!req.user)
    return res.status(401).json({ error: "Sesión requerida" });
  next();
}

/**
 * Checks the authenticated user holds the given permission code.
 * @param {string} code
 * @returns {import("express").RequestHandler}
 */
export const requirePermission = (code) => (req, res, next) =>
  req.user?.permissions.includes(code)
    ? next()
    : res.status(403).json({ error: "No tienes permiso para esta acción" });
