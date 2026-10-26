import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authenticate } from "./middleware/auth.js";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import rolesRoutes from "./routes/roles.js";
import roomsRoutes from "./routes/rooms.js";
import reservationsRoutes from "./routes/reservations.js";
import reportsRoutes from "./routes/reports.js";

const app = express();

app.disable("x-powered-by");
// Render and other proxies sit in front of the app; needed to read the real
// client IP (rate limiting) instead of the proxy one.
app.set("trust proxy", 1);

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

const allowedOrigins = (process.env.CLIENT_URL || DEFAULT_ORIGINS.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Validates the Bearer token of every request and sets req.user.
app.use(authenticate);

app.use("/api/auth", authRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/reports", reportsRoutes);

// Postgres error codes that mean the request data is wrong, not the server.
const PG_ERROR_STATUS = {
  "22001": 400, // value too long for column
  "22003": 400, // numeric value out of range
  "22P02": 400, // invalid text representation
  "23502": 400, // not-null violation
  "23503": 400, // foreign key violation
  "23514": 400, // check constraint violation
  "23505": 409, // unique violation
  "23P01": 409, // exclusion violation (overlapping reservation)
  "P0001": 403, // raise_exception (protection triggers)
};

// General error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  // Protection triggers raise with a ready-to-use message.
  if (err.code === "P0001")
    return res.status(403).json({ error: err.message });
  const status = PG_ERROR_STATUS[err.code];
  if (!status)
    return res.status(500).json({ error: "Error interno del servidor" });
  res.status(status).json({ error: "Los datos enviados no son válidos" });
});

const port = process.env.PORT || 3001;

const server = app.listen(port, () =>
  console.log(`API UIN Space en http://localhost:${port}`),
);

/**
 * Stops accepting connections and closes the database pool before exiting.
 * @param {string} signal
 */
const shutdown = (signal) => {
  console.log(`${signal} recibido, cerrando servidor...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

