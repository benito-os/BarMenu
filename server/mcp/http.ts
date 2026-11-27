/**
 * Mounts the Bar Flores MCP server on the existing Express app, as stateless
 * Streamable HTTP. Stateless (a fresh server + transport per request, no
 * session ids) is what makes it safe on Replit autoscale, where consecutive
 * requests can land on different instances.
 *
 * Off by default. Set MCP_TOKEN (24+ characters) in Secrets to turn it on.
 *
 *   POST /mcp            Authorization: Bearer <MCP_TOKEN>   (Claude Code, API)
 *   POST /mcp/<MCP_TOKEN>                                    (clients that
 *        cannot send a header, e.g. a claude.ai custom connector; the URL is
 *        then the credential, so treat it like a password)
 *
 * Neither path is written to the request log (it only logs /api).
 */
import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IStorage } from "../storage";
import { createBarMcpServer } from "./server";

const MIN_TOKEN_LENGTH = 24;

function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const rpcError = (res: Response, status: number, message: string) =>
  res.status(status).json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });

export function registerMcpRoutes(app: Express, storage: IStorage): void {
  const token = process.env.MCP_TOKEN?.trim();
  if (!token) return;
  if (token.length < MIN_TOKEN_LENGTH) {
    console.warn(
      `[mcp] MCP_TOKEN is shorter than ${MIN_TOKEN_LENGTH} characters, so the MCP endpoint stays off. Generate one with: openssl rand -hex 24`,
    );
    return;
  }

  const readOnly = process.env.MCP_READ_ONLY === "1";

  // Only failed attempts count, so normal use is never throttled but a token
  // guesser gets 20 tries per 15 minutes per IP.
  const guessLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { jsonrpc: "2.0", error: { code: -32000, message: "Too many failed attempts. Try again in 15 minutes." }, id: null },
  });

  const handle = async (req: Request, res: Response) => {
    const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!tokenMatches(req.params.token ?? bearer, token)) {
      return rpcError(res, 401, "Unauthorized. Send the MCP_TOKEN as a Bearer token, or use the /mcp/<token> URL.");
    }
    if (req.method !== "POST") {
      // Stateless mode has no server-to-client stream and no session to end.
      return rpcError(res.set("Allow", "POST"), 405, "Method not allowed. This endpoint accepts POST only.");
    }

    const server = createBarMcpServer(storage, { readOnly });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[mcp] request failed:", error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  };

  app.all("/mcp", guessLimit, handle);
  app.all("/mcp/:token", guessLimit, handle);
  console.log(`[mcp] endpoint enabled at /mcp${readOnly ? " (read-only)" : ""}`);
}
