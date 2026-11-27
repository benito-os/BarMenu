import fs from "fs";
import path from "path";
import type { Request, Response } from "express";

type Query = (sql: string) => Promise<{ rows: unknown[] }>;

const HEALTH_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Version from package.json in the working directory; "unknown" if unreadable. */
export function readVersion(): string {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8");
    return String(JSON.parse(raw).version ?? "unknown");
  } catch {
    return "unknown";
  }
}

/**
 * GET /api/healthz handler. Mounted at /api/healthz, not /healthz, because on
 * a Replit custom domain /healthz is swallowed by the front end before Express
 * sees it. Runs SELECT 1; 200 {ok, uptime, version} or 503 {ok:false}.
 */
export function makeHealthz(deps: { query: Query; version: string }) {
  return async (_req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    try {
      await withTimeout(deps.query("SELECT 1"), HEALTH_TIMEOUT_MS);
      res.status(200).json({ ok: true, uptime: Math.round(process.uptime()), version: deps.version });
    } catch {
      res.status(503).json({ ok: false });
    }
  };
}

export const MISSING_TABLES_MESSAGE = "Database has no tables yet. Run: npm run db:push";

/**
 * Boot-time check that the schema was pushed. A fork that skipped
 * `npm run db:push` otherwise boots and then 500s on /api/menus.
 */
export async function checkSchemaReady(
  query: Query,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const result = await withTimeout(query("SELECT to_regclass('public.menus') AS menus"), 10000);
    const row = result.rows[0] as { menus?: string | null } | undefined;
    if (row?.menus) return { ok: true };
    return { ok: false, message: MISSING_TABLES_MESSAGE };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Cannot reach the database (${reason}). Check DATABASE_URL, that Postgres is running, and DATABASE_DRIVER (see .env.example).`,
    };
  }
}
