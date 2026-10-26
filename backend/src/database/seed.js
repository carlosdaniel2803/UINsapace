// Uso:  npm run seed -- correo@uin.edu.mx "TuContraseña123" "Nombre Admin"
// - Inserta salones de ejemplo (si no existen).
// - Si pasas correo y contraseña: crea al administrador, o si el correo ya
//   está registrado, lo convierte en administrador.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

const [email, password, name = "Administrador"] = process.argv.slice(2);

const ROOMS = [
  ["Aula 101", "aula", 30, "Edificio A, planta baja"],
  ["Aula 102", "aula", 30, "Edificio A, planta baja"],
  ["Laboratorio de cómputo 1", "computo", 25, "Edificio B, planta alta"],
  ["Laboratorio de cómputo 2", "computo", 25, "Edificio B, planta alta"],
  ["Sala de juntas", "sala", 12, "Edificio C"],
  ["Auditorio", "auditorio", 120, "Edificio principal"],
];

try {
  for (const [n, type, capacity, location] of ROOMS)
    await pool.query(
      `INSERT INTO rooms (name, type, capacity, location) VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO NOTHING`,
      [n, type, capacity, location],
    );
  console.log(`Salones listos (${ROOMS.length})`);

  if (email && password) {
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");

    const promoted = await pool.query(
      `UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'administrador')
       WHERE lower(email) = lower($1) RETURNING id`,
      [email],
    );
    if (promoted.rowCount > 0) {
      console.log(`El usuario ${email} ya existía: ahora es administrador`);
    } else {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO users (control_number, name, email, password_hash, role_id)
         SELECT 'ADMIN-' || substr(md5(random()::text), 1, 8), $1, $2, $3, id
         FROM roles WHERE code = 'administrador'`,
        [name, email, hash],
      );
      console.log(`Administrador creado: ${email}`);
    }
  }
} catch (err) {
  console.error("Seed fallido:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
