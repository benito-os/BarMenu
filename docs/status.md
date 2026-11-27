# Bar Flores - status
**Read this block first (at most 40 lines). Full history below the cut.** Updated 2026-11-27.

## Now
- Branch `ccr-90a470fb-rnex9a` holds, all dated 2026-11-27: the MCP server (`server/mcp/`, `docs/mcp.md`, 11 tools, off until `MCP_TOKEN` is set); every task in `docs/improvement-backlog.md` (waves S, R, T, U); a mobile redesign of the owner dashboard (bottom tab bar, filter tiles, jump chips, bottom-sheet forms); and a bar-name setting with a logo drawn from the name.
- It is NOT merged to `main` and NOT deployed. The live app is still the previous build.
- Verified on a local Postgres 16 only: typecheck, 94 tests, production build, phone-sized browser checks.

## Next: owner only (agents cannot do these)
1. Review and merge the branch into `main`.
2. Publish. **The schema changed**: one new nullable column, `settings.bar_name`. Confirm the Drizzle diff when Replit asks; the new build cannot read settings until it is applied.
3. Set `MCP_TOKEN` (24+ characters) in both the workspace secrets and the deployment secrets, then republish. The two lists are separate.
4. Add the connector in Claude (steps in `docs/mcp.md`).
5. Set your bar name in Settings, Branding (or upload a logo).
6. Decide owner decisions O2 to O7 in `docs/improvement-backlog.md`. O1 (cold start) is decided: accept it for now.

## Decided by the owner (2026-11-27)
- Phone tab bar stays Queue, Recipes, Inventory, Drinks; the rest under More.
- Visual theme: "printed menu", cream paper and brass, light only, across dashboard and guest pages. Per-menu colours still win on that menu's page.

## Next: agent
- Nothing queued beyond what the owner decides above.
- After the owner publishes, verify the deployed app with `/api/healthz`, then load `/`, a menu page and `/dashboard`.

## Blockers
- Nothing on the branch has run against the production (Neon) database. Treat the first publish as untested there.
- Not exercised: the stale-chunk auto-reload (unit tests only), image upload, QR download on a real phone.
- Theme: Settings, QR codes, Import/Export and the Analytics table got token-level restyling only and still look like plain forms. Guest and dashboard copy is the original wording; the theme work must not add or reword copy.
- Known rough edges on mobile: first visit to a dashboard page shows a skeleton without the tab bar; "Clear served" can never appear because the queue endpoint returns open orders only; toasts briefly cover the header.

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
