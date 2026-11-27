import { describe, expect, it, vi } from "vitest";
import { checkSchemaReady, makeHealthz, MISSING_TABLES_MESSAGE } from "./health";

function fakeRes() {
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string> };
  res.set = (k: string, v: string) => { res.headers[k] = v; return res; };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  return res;
}

describe("makeHealthz", () => {
  it("returns 200 with uptime and version when the query works", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const res = fakeRes();
    await makeHealthz({ query, version: "1.2.3" })({} as any, res);
    expect(query).toHaveBeenCalledWith("SELECT 1");
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.version).toBe("1.2.3");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  it("returns 503 {ok:false} and leaks no error text when the query fails", async () => {
    const query = vi.fn().mockRejectedValue(new Error("password=secret"));
    const res = fakeRes();
    await makeHealthz({ query, version: "1" })({} as any, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false });
  });
});

describe("checkSchemaReady", () => {
  it("ok when menus table exists", async () => {
    const r = await checkSchemaReady(async () => ({ rows: [{ menus: "menus" }] }));
    expect(r).toEqual({ ok: true });
  });

  it("names the fix when tables are missing", async () => {
    const r = await checkSchemaReady(async () => ({ rows: [{ menus: null }] }));
    expect(r).toEqual({ ok: false, message: MISSING_TABLES_MESSAGE });
    expect(MISSING_TABLES_MESSAGE).toContain("npm run db:push");
  });

  it("reports an unreachable database with the fix", async () => {
    const r = await checkSchemaReady(async () => { throw new Error("ECONNREFUSED"); });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("ECONNREFUSED");
      expect(r.message).toContain("DATABASE_URL");
    }
  });
});
