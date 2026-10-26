import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.js";
import { asString } from "../utils/validate.js";

const router = Router();

// Hash of a placeholder password, used to keep the login response time
// constant when the email is not registered.
const DUMMY_PASSWORD_HASH =
  "$2a$10$99mDmsO9at2MOmg33ssB0O0ZaBCmqidbVjYN8zGhIGlAvvMePJeai";

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "8h" });

// POST /api/auth/register
// El registro público SIEMPRE crea usuarios "docente".
// Los demás roles los asigna el administrador.
router.post("/register", registerLimiter, async (req, res, next) => {
  try {
    const { control_number, name, email, password } = req.body;
    const controlNumber = asString(control_number).trim();
    const fullName = asString(name).trim();
    const mail = asString(email).trim();
    const pass = asString(password);

    if (!controlNumber || !fullName || !mail || !pass)
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    if (pass.length < 8)
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres" });
    if (pass.length > 72)
      return res
        .status(400)
        .json({ error: "La contraseña no puede superar los 72 caracteres" });
    if (controlNumber.length > 20)
      return res
        .status(400)
        .json({ error: "El número de control es demasiado largo (máx. 20 caracteres)" });
    if (fullName.length > 150)
      return res
        .status(400)
        .json({ error: "El nombre es demasiado largo (máx. 150 caracteres)" });
    if (mail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
      return res.status(400).json({ error: "El correo electrónico no es válido" });

    const password_hash = await bcrypt.hash(pass, 10);

    const result = await query(
      `INSERT INTO users (control_number, name, email, password_hash, role_id)
       SELECT $1, $2, $3, $4, id FROM roles WHERE code = 'docente'
       RETURNING id`,
      [controlNumber, fullName, mail, password_hash],
    );

    // Si el rol 'docente' no existe en la base, el INSERT no guarda nada
    // (y antes se respondía "éxito" igual). Ahora se avisa del problema real.
    if (result.rowCount === 0) {
      console.error(
        "Registro fallido: no existe el rol 'docente' en la tabla roles",
      );
      return res.status(500).json({
        error:
          "Falta el rol 'docente' en la base de datos. Ejecuta el script SQL completo.",
      });
    }

    res.status(201).json({ message: "Usuario registrado" });
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "El correo o número de control ya está registrado" });
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const mail = asString(email).trim();
    const pass = asString(password);
    if (!mail || !pass)
      return res.status(400).json({ error: "Correo y contraseña requeridos" });

    const { rows } = await query(
      "SELECT id, password_hash FROM users WHERE lower(email) = lower($1) AND active",
      [mail],
    );

    // Always compare, even when the user does not exist, so the response time
    // does not reveal which emails are registered.
    const valid = await bcrypt.compare(
      pass,
      rows[0]?.password_hash ?? DUMMY_PASSWORD_HASH,
    );
    if (!rows[0] || !valid)
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    res.json({ token: signToken(rows[0].id) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  -> usuario actual con rol y permisos
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
