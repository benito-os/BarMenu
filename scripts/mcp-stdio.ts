/**
 * Bar Flores MCP server over stdio, for a local assistant (Claude Desktop,
 * Claude Code) talking straight to your database without a deployed app.
 *
 *   DATABASE_URL=... npm run mcp
 *
 * Nothing may be written to stdout except protocol messages, so the storage
 * layer's console.info/log lines are sent to stderr before it loads.
 */
console.log = console.error;
console.info = console.error;

async function main() {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { storage } = await import("../server/storage");
  const { createBarMcpServer } = await import("../server/mcp/server");

  const server = createBarMcpServer(storage, { readOnly: process.env.MCP_READ_ONLY === "1" });
  await server.connect(new StdioServerTransport());
  console.error("[mcp] Bar Flores MCP server ready on stdio");
}

main().catch((error) => {
  console.error("[mcp] failed to start:", error instanceof Error ? error.message : error);
  process.exit(1);
});
