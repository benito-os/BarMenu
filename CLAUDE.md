# Bar Flores - CLAUDE.md
Read first: `docs/status.md` (pickup doc), then `docs/improvement-backlog.md` (tasks and ground rules). Audit: `docs/audit-2026-11.md`.

## Commands
- dev: `npm run dev` (tsx server/index.ts, port 5000); typecheck: `npm run check`
- test: `npm test` (vitest run, no database needed); build: `npm run build`; run build: `npm start`
- demo data: `npm run seed:demo`; MCP over stdio: `npm run mcp` (docs/mcp.md)
- schema: `npm run db:push` exists but Claude never runs it (docs/improvement-backlog.md, ground rule 4)

## Rules (repo-specific; root CLAUDE.md rules still apply)
- Tests never need a database and never import `server/db.ts` (it throws without `DATABASE_URL`); use pure functions or a fake `IStorage` (docs/improvement-backlog.md, rule 6).
- Never print `DATABASE_URL`, `SESSION_SECRET`, `DASHBOARD_PASSWORD` or `MCP_TOKEN`; presence checks only (docs/improvement-backlog.md, rule 4).
- Replit pushes "Published your App" commits to `main` at any time: verify branch and HEAD before and after every git op, never rebase over or rewrite them, merge (docs/improvement-backlog.md, rule 5).
- Do not touch `shared/schema.ts` unless the task says so; a schema change needs the owner to confirm the Drizzle diff at publish (docs/improvement-backlog.md, rule 3).
- Error messages name the fix ("Set MCP_TOKEN and republish") (docs/improvement-backlog.md, rule 7).
- The MCP server has no delete or order tools and creates drafts only; keep it that way (docs/mcp.md, Guardrails).
- No service worker that caches fetches; it pins old builds (docs/improvement-backlog.md, U3).
- Stop and ask when a task needs a design choice, a schema change or an unlisted deletion (docs/improvement-backlog.md, rule 8).

## Layout
- `client/src`: React pages, components, hooks (wouter, TanStack Query)
- `server/`: Express API, storage, auth; `server/mcp/`: MCP server and HTTP transport
- `shared/`: Drizzle schema and Zod validation
- `scripts/`: `seed-demo.ts`, `mcp-stdio.ts`
- `docs/`: status, backlog, audit, mcp, run-your-own
