import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "8h" });

// POST /api/auth/register
// El registro público SIEMPRE crea usuarios "docente".
// Los demás roles los asigna el administrador.
router.post("/register", async (req, res, next) => {
  try {
    const { control_number, name, email, password } = req.body;

    if (!control_number || !name || !email || !password)
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    if (password.length < 8)
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres" });

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (control_number, name, email, password_hash, role_id)
       SELECT $1, $2, $3, $4, id FROM roles WHERE code = 'docente'
       RETURNING id`,
      [control_number.trim(), name.trim(), email.trim(), password_hash],
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
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Correo y contraseña requeridos" });

    const { rows } = await query(
      "SELECT id, password_hash FROM users WHERE lower(email) = lower($1) AND active",
      [email.trim()],
    );

    const valid =
      rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
    if (!valid)
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    res.json({ token: signToken(rows[0].id) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  -> usuario actual con rol y permisos
router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
