# Bar Flores

A mobile-first cocktail menu + ordering system for small bars and pop-ups.
Guests scan a QR code, browse a themed menu, and request drinks. The bartender
sees a live queue, marks orders as in-progress / served, and manages the menu
from a single dashboard.

Originally built for Bar Flores; the code is MIT-licensed so you can fork it
and run your own bar.

## What it does

- **Per-menu QR codes** — each menu has its own slug, theme color, hero
  image, font, and section list. Print the QR sheet for table tents.
- **Guest ordering** — no signup; cookie-tracked status banner so the guest
  can see when their drink moves through the workflow.
- **Live bartender queue** — auto-refreshes every 5s, audio chime + tab badge
  on new orders, keyboard shortcuts (`s` to start oldest, `d` to serve oldest).
- **Drink + menu CRUD** — duplicate menus for seasonal rotation, drag-and-drop
  reorder, bulk activate/deactivate, "86" toggle for out-of-stock drinks.
- **Analytics** — drink popularity bar chart with filters for "Never Made"
  and "Least Ordered", filterable by menu.
- **Inventory (optional)** — ingredient stock tracking with barcode scanning
  via the camera.
- **CSV import/export** — preview before write, per-row error reporting.
- **Configurable branding** — logo, welcome message, headline + body fonts,
  QR code styling. Per-menu accent color spreads to the landing card,
  queue row stripe, and order detail drawer.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite, Wouter for routing, TanStack
  Query, shadcn/ui (Radix + Tailwind), react-hook-form + Zod.
- **Backend**: Node 20 + Express, Drizzle ORM, `@neondatabase/serverless`
  for Postgres.
- **Auth**: session-based, single `admin` user, `connect-pg-simple` session
  store, `crypto.timingSafeEqual` password check, login rate limit.
- **Deploy**: Replit autoscale (default), or any Node host that can run
  `npm run build && npm run start`.

## Quick start

### On Replit (easiest)

1. Fork this repo or import into Replit
2. Enable the **Postgres** and **Object Storage** integrations from the
   Tools panel — both are referenced by `.replit`
3. In **Tools → Secrets**, set:
   - `SESSION_SECRET` (long random string — `openssl rand -base64 48`)
   - `DASHBOARD_PASSWORD` (your admin password)
4. Hit **Run**. The schema auto-migrates on first boot (Drizzle), the
   `session` table is auto-created by `connect-pg-simple`.
5. Visit `/dashboard-login` and sign in as `admin` with your password.

### Local dev

```bash
git clone https://github.com/benito-os/BarMenu.git
cd BarMenu
npm install
cp .env.example .env
# Fill in DATABASE_URL (Neon free tier works), SESSION_SECRET, DASHBOARD_PASSWORD
npm run db:push   # Drizzle: apply schema to your DB
npm run dev       # Vite middleware mode on http://localhost:5000
```

### Production build

```bash
npm run build   # Vite for client + esbuild for server
npm run start
```

## Project layout

```
client/          React + Vite frontend
  src/
    pages/
      landing.tsx          # Public landing — menu grid
      menu-detail.tsx      # Per-menu page guests order from
      dashboard/           # Admin pages (lazy-loaded)
    components/            # Reusable UI (mostly shadcn-based)
    hooks/                 # useOrders, useMenus, useDrinks, useSettings, ...
    lib/
      queryClient.ts       # React Query setup + apiRequest helper
server/          Express + Drizzle backend
  routes.ts                # All HTTP routes
  storage.ts               # IStorage interface + Drizzle implementation
  index.ts                 # Bootstrap, session config, error handling
shared/          Code shared client/server
  schema.ts                # Drizzle table definitions
  validation/              # Zod schemas
```

## Configuration

The admin dashboard exposes most knobs you'll want to tune:

- **Queue thresholds** — when the bartender sees yellow / red waiting time badges
- **Branding** — logo, welcome message, headline + body fonts, QR code style
- **Rate limit** — anti-spam threshold for guest order placement

For env vars (`DATABASE_URL`, `SESSION_SECRET`, `DASHBOARD_PASSWORD`,
object-storage paths) see `.env.example`.

## Forking notes

This started as a Replit Agent project, so a few things assume Replit:

- `server/replit_integrations/object_storage/` talks to the Replit sidecar
  for object storage. If you're hosting elsewhere, swap this for a direct
  S3 / GCS / R2 client and update the env vars.
- The default `accentColor`, hero image, and "Bar Flores" name are
  placeholders — change them in `/dashboard/settings` or fork the assets in
  `attached_assets/generated_images/`.
- The `.replit` file configures the autoscale deployment target; remove or
  ignore if hosting elsewhere.

## Contributing

Issues and PRs welcome. The codebase has been through a multi-round audit
(security, perf, UX) so the patterns are reasonably opinionated — try to
match the existing style. `npm run check` should pass with zero errors.

## License

MIT — see `LICENSE`.
