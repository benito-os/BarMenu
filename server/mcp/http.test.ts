// The HTTP mount, exercised with the SDK's own client over a real socket.
import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { IStorage } from "../storage";
import { registerMcpRoutes } from "./http";

const TOKEN = "test-token-0123456789abcdefghij";
const storage = {
  getAllMenus: async () => [],
  getIngredients: async () => [],
  getActiveMenuDrinkAlerts: async () => [],
  getOrderQueue: async () => [],
} as unknown as IStorage;

let server: Server | undefined;

async function start(env: Record<string, string | undefined>) {
  for (const key of ["MCP_TOKEN", "MCP_READ_ONLY"]) delete process.env[key];
  for (const [key, value] of Object.entries(env)) if (value !== undefined) process.env[key] = value;
  const app = express();
  app.use(express.json());
  registerMcpRoutes(app, storage);
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const initBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "0" } },
});
const post = (url: string, headers: Record<string, string> = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: initBody,
  });

afterEach(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(null)));
  server = undefined;
});

describe("MCP HTTP mount", () => {
  it("is absent when MCP_TOKEN is unset or too short", async () => {
    expect((await post(`${await start({})}/mcp`)).status).toBe(404);
    await new Promise((resolve) => server!.close(resolve));
    expect((await post(`${await start({ MCP_TOKEN: "short" })}/mcp/short`)).status).toBe(404);
  });

  it("rejects a missing or wrong token", async () => {
    const base = await start({ MCP_TOKEN: TOKEN });
    expect((await post(`${base}/mcp`)).status).toBe(401);
    expect((await post(`${base}/mcp`, { authorization: "Bearer nope" })).status).toBe(401);
    expect((await post(`${base}/mcp/${TOKEN}x`)).status).toBe(401);
    expect((await fetch(`${base}/mcp`)).status).toBe(401);
  });

  it("accepts the token in the URL path, and refuses GET with 405", async () => {
    const base = await start({ MCP_TOKEN: TOKEN });
    const res = await post(`${base}/mcp/${TOKEN}`);
    expect(res.status).toBe(200);
    expect((await res.json()).result.serverInfo.name).toBe("bar-flores");
    expect((await fetch(`${base}/mcp/${TOKEN}`)).status).toBe(405);
  });

  it("serves a real MCP client with a Bearer token, statelessly", async () => {
    const base = await start({ MCP_TOKEN: TOKEN });
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
      }),
    );
    expect((await client.listTools()).tools).toHaveLength(11);
    const result: any = await client.callTool({ name: "get_bar_overview", arguments: {} });
    expect(JSON.parse(result.content[0].text)).toMatchObject({ menus: [], openOrders: 0 });
    await client.close();
  });

  it("MCP_READ_ONLY=1 hides the write tools", async () => {
    const base = await start({ MCP_TOKEN: TOKEN, MCP_READ_ONLY: "1" });
    const client = new Client({ name: "test", version: "0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/${TOKEN}`)));
    expect((await client.listTools()).tools).toHaveLength(5);
    await client.close();
  });
});
