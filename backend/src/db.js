import "dotenv/config";
import pg from "pg";

/**
 * Shared connection pool. Timeouts are short because serverless Postgres
 * (Neon/Supabase) closes idle connections on its own.
 */
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

// An idle client dropped by the server emits "error" on the pool.
// Without this listener Node would crash the whole process.
pool.on("error", (err) => {
  console.error("Idle Postgres client error:", err.message);
});

export const query = (text, params) => pool.query(text, params);
