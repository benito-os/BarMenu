# Bar Flores - Replit Agent brief

> **READ THIS FIRST, AND FOLLOW IT LITERALLY.**
> This repo is developed in GitHub through Claude Code. The Replit Agent's job here is **pull and publish only**.
> Do **not** redesign, restyle, refactor or "improve" anything. Do **not** run `npm install`.
> Do **not** run `npm run db:push`. Do **not** edit `.replit`. Do **not** push commits of your own.
> When in doubt, do less and ask the owner.

- Pull the latest `main` from GitHub, then publish. That is all.
- If the publish screen shows a database schema diff, stop and show it to the owner. Do not accept it yourself.
- Deployment secrets are a separate list from workspace secrets. If a secret is missing there, tell the owner. Do not copy values into code.
- Read `docs/status.md` before any change. It says what is merged and what is waiting.

## Preferences
Preferred communication style: Simple, everyday language.

## What the app is
Bar Flores is a mobile-first cocktail menu app for a home bar. Guests scan a QR code, read a menu and order a drink. The owner runs the queue, recipes, inventory and QR codes from a password-protected dashboard. The code is MIT licensed.

## Stack
- Client: React 18, TypeScript, Vite, wouter (routing), TanStack Query, Tailwind CSS, shadcn/ui on Radix.
- Server: Express with TypeScript, run with tsx in development and bundled by esbuild for production.
- Data: Postgres through Drizzle ORM. Schema in `shared/schema.ts`, Zod validation in `shared/validation/`. Data access goes through `IStorage` in `server/storage.ts`. Database setup is in `server/db.ts`.
- Images: uploads go to Replit object storage (`server/replit_integrations/object_storage`).
- Barcode scanning: `@zxing/browser`. QR codes: `qrcode.react` and `react-qrcode-logo`.
- Deploy: Replit autoscale. Build `npm run build`, run `npm run start`, port 5000.

## Where things live
- `client/src/App.tsx`: routes. Public: `/`, `/menu/:slug`, `/about`, `/dashboard-login`.
- Dashboard (nine routes): `/dashboard` (queue), `/dashboard/analytics`, `/menus`, `/drinks`, `/recipes`, `/inventory`, `/qr-codes`, `/settings`, `/import-export`.
- `server/index.ts`: boot and middleware. `server/routes.ts`: API routes.
- `server/mcp/`: MCP server for Claude, see `docs/mcp.md`.
- `scripts/`: `seed-demo.ts`, `mcp-stdio.ts`.

## Auth
- One admin user. Password comes from `DASHBOARD_PASSWORD`. Sessions are stored in Postgres and signed with `SESSION_SECRET`.
- Dashboard and admin API routes require a session. Guest routes (menus, drinks, placing and reading orders) are public.
- The MCP endpoint (`/mcp`) uses its own token, `MCP_TOKEN`, not the dashboard session. It stays off until that secret is set.

## Environment variables
- `DATABASE_URL`: Postgres connection string.
- `SESSION_SECRET`, `DASHBOARD_PASSWORD`: required in production.
- `MCP_TOKEN`: 24+ characters. Turns on the MCP endpoint. Must be set in workspace and deployment secrets.
- `MCP_READ_ONLY`: set to `1` to remove MCP write tools.
- `PORT`: set to 5000 in `.replit`.
- `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`: set by the object storage integration.
- Never print any secret value. Check that it is present, nothing more.

## Health check
Use `/api/healthz` for uptime checks. Do not use `/healthz`: Replit custom domains swallow it before Express sees it. Behaviour is in `server/index.ts`.

## Checks
CI runs `npm run check`, `npm test` and `npm run build` on every pull request. Tests need no database.
