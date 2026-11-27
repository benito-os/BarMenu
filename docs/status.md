# Bar Flores - status
**Read this block first (at most 40 lines). Full history below the cut.** Updated 2026-11-27.

## Now
- On 2026-11-27 the full `docs/improvement-backlog.md` (waves S, R, T, U) was executed on branch `ccr-90a470fb-rnex9a`. See the commit log on that branch for which tasks landed.
- The same day an MCP server was added: `server/mcp/`, `docs/mcp.md`, 11 tools. It is off until `MCP_TOKEN` is set.
- That branch is NOT merged to `main` and NOT deployed. The live app is still the previous build.

## Next: owner only (agents cannot do these)
1. Review and merge the branch `ccr-90a470fb-rnex9a` into `main`.
2. Set `MCP_TOKEN` (24+ characters) in both the workspace secrets and the deployment secrets, then republish. The two lists are separate.
3. Add the connector in Claude (steps in `docs/mcp.md`).
4. Decide owner decisions O1 to O7 in `docs/improvement-backlog.md`. O1 is cold start: accept it, ping `/api/healthz` on a schedule, or move to a Reserved VM.
5. If the branch changed the schema, confirm the Drizzle diff when publishing. `git diff main -- shared/schema.ts` shows it.

## Next: agent
- Nothing queued beyond what the owner decides above.
- After the owner publishes, verify the deployed app with `/api/healthz`, then load `/`, a menu page and `/dashboard`.

## Blockers
- The MCP server and the new code have not been run against the production (Neon) database. Treat the first publish as untested there.

## Key paths
- `docs/improvement-backlog.md`: tasks, ground rules, owner decisions O1 to O7
- `docs/audit-2026-11.md`: the audit the backlog came from
- `docs/mcp.md`: MCP tools, guardrails, how to turn it on
- `docs/run-your-own.md`: running a fork
- `server/index.ts`, `server/db.ts`: boot, middleware, database driver
- `server/mcp/`: MCP server; `replit.md`: brief for the Replit Agent

---

## 2026-11-27: MCP server and improvement backlog
- Added an MCP server (`server/mcp/`, `scripts/mcp-stdio.ts`, `docs/mcp.md`). 11 tools. The HTTP endpoint is off until `MCP_TOKEN` is set. `MCP_READ_ONLY=1` removes the write tools. No delete tools, no order tools, new drinks and menus are drafts.
- Ran the whole of `docs/improvement-backlog.md` (waves S speed, R reliability, T tests and docs, U one-phone use) on branch `ccr-90a470fb-rnex9a`. Which tasks landed is in the commit log on that branch.
- Added CI (`.github/workflows/ci.yml`: check, test, build), `CLAUDE.md`, this file, and a rewritten `replit.md` that fences the Replit Agent.
- Not merged, not deployed, not tried against the production database.
