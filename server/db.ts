import pg from "pg";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? " +
      "Copy .env.example to .env and set it (Neon URL, or postgresql://user:pass@localhost:5432/dbname for local Postgres).",
  );
}

const connectionString = process.env.DATABASE_URL;

/**
 * Which driver to use.
 *  - The Neon serverless driver talks WebSocket to Neon's proxy, so it only
 *    works against Neon hosts (hostname ending in neon.tech). Against a plain
 *    local Postgres it tries wss://localhost/v2 and fails with ECONNREFUSED.
 *  - Everything else uses node-postgres over a normal TCP connection.
 * Override with DATABASE_DRIVER=neon or DATABASE_DRIVER=pg (e.g. a Neon proxy
 * behind a custom domain).
 */
export function pickDriver(url: string, override = process.env.DATABASE_DRIVER): "neon" | "pg" {
  if (override === "neon" || override === "pg") return override;
  try {
    return new URL(url).hostname.toLowerCase().endsWith("neon.tech") ? "neon" : "pg";
  } catch {
    return "pg";
  }
}

const driver = pickDriver(connectionString);

// Both drivers expose the same pg-style Pool API and the same drizzle query
// builder; we pick the node-postgres types as the single static type so
// storage.ts, transactions.ts and connect-pg-simple compile unchanged.
let pool: pg.Pool;
let db: NodePgDatabase<typeof schema>;

if (driver === "neon") {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPool({ connectionString });
  pool = neonPool as unknown as pg.Pool;
  db = drizzleNeon({ client: neonPool, schema }) as unknown as NodePgDatabase<typeof schema>;
} else {
  pool = new pg.Pool({ connectionString });
  // An idle client dropping (Postgres restart) emits 'error'; unhandled, that
  // would crash the process. Log it and let the pool reconnect on next use.
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  db = drizzlePg({ client: pool, schema });
}

export { pool, db };
