# Improvement backlog, November 2026

What to change next, in order, written so each task can be handed to a small
model as-is. Focus: speed and ease of use for one person running a home bar
from their phone.

The tasks come from comparing this repo with what the owner's other projects
learned the hard way (a React/Vite/Express app and two Express/Drizzle apps,
all on Replit autoscale). Each task names the lesson it applies. Sizes below
were measured on this repo with `npm run build` on 2026-11-27.

## Where the time goes today

| What | Measured | Task |
|------|----------|------|
| Guest JS on first load | 595 kB (187 kB gzip), one chunk | S6 |
| Landing hero + logo | 1.5 MB + 0.9 MB PNG | S3 |
| Unreferenced `fall-fireside-hero.png` | 1.5 MB, committed twice | S3 |
| Fonts | 5 Google families, render-blocking, on every page | S4 |
| Static files | no compression, no cache headers | S1 |
| Guest menu | 2 sequential API calls before drinks show | S5 |
| Logged-in owner | every asset request does a session lookup in Postgres | S2 |
| Inventory +/- | waits for the server, then a toast, per tap | S7 |
| First scan of the evening | autoscale cold start + Neon cold start | owner decision O1 |

## Ground rules for whoever runs a task

1. One task, one branch, one PR. Do not bundle.
2. Before and after: `npm run check`, `npm test`, `npm run build`. All three
   must pass. Put the before/after chunk sizes in the PR when the task is
   about size.
3. Do not change `shared/schema.ts` unless the task says so. A schema change
   means the owner has to confirm a Drizzle diff when publishing.
4. Never run `npm run db:push`. Never print `DATABASE_URL`, `SESSION_SECRET`,
   `DASHBOARD_PASSWORD` or `MCP_TOKEN`; check presence only.
5. Replit pushes "Published your App" commits to `main` at any time. Check
   branch and HEAD before and after each git command. Never rebase over or
   rewrite those commits; merge.
6. Tests must not need a database. Test pure functions, or inject a fake
   `IStorage` (see `server/mcp/server.test.ts`). Never import `server/db.ts`
   from a test: it throws without `DATABASE_URL`.
7. Error messages name the fix ("Set MCP_TOKEN and republish", not "Error").
8. Stop and ask instead of guessing when a task turns out to need a design
   choice, a schema change, or a deletion that the task did not list.

Model column: **small** = mechanical, spec is complete (Haiku-class).
**mid** = several files or some judgment (Sonnet-class).

## Wave 1: speed

### S1. Compress and cache static files (small)
Lesson: hashed assets are immutable, HTML must never be cached, or a deploy
strands open tabs on missing chunks.
- `npm i compression` and `npm i -D @types/compression`. In `server/index.ts`
  add `compression({ threshold: 1024 })` before the routes, with a `filter`
  that skips `image/*` (except svg), `font/woff2`, and anything already
  compressed.
- In `server/vite.ts` `serveStatic`: export a pure
  `staticCacheControl(path: string): string` returning
  `public, max-age=31536000, immutable` for `/assets/*` and `no-cache` for
  everything else. Use it in `express.static(distPath, { index: false, setHeaders })`
  and set `Cache-Control: no-cache` on the `index.html` fallback.
- Test `staticCacheControl` in `server/static.test.ts` (move the function to
  `server/static.ts` so the test does not import vite).
- Accept: after `npm run build && npm start`, `curl -sI -H 'Accept-Encoding: gzip' localhost:5000/assets/<file>.js`
  shows `content-encoding: gzip` and the immutable header; `/` shows `no-cache`.

### S2. Stop hitting Postgres for sessions on static files (small)
- In `server/index.ts`, mount the session middleware on `/api` only:
  `app.use("/api", session({...}))`. Check that nothing outside `/api` reads
  `req.session` (`grep -rn "req.session" server`); `/objects/*` is public and
  `/mcp` has its own token auth.
- Accept: login, queue, logout still work in `npm run dev`; a request for
  `/favicon.png` with a session cookie no longer logs a session query.

### S3. Shrink the images (small)
- Add `sharp` as a devDependency and a one-off `scripts/optimize-images.ts`
  that writes WebP next to the two PNGs in `attached_assets/generated_images/`
  (hero: max 1600 px wide, quality 72; logo: max 512 px, quality 80, keep alpha).
- Point the imports in `client/src/pages/landing.tsx`,
  `client/src/components/SplashScreen.tsx` and
  `client/src/components/BrandedQRCode.tsx` at the `.webp` files. Give the
  hero `<img>` explicit `width`/`height` and `fetchPriority="high"`.
- Delete the two source PNGs once nothing imports them, and delete both
  copies of `fall-fireside-hero.png` (`client/public/`, `public/images/`);
  confirm first with `grep -rn fall-fireside client server shared scripts`
  that nothing references it. The owner already flagged these as orphans in
  `docs/audit-2026-11.md` finding 12.
- Check the QR download still renders the logo (`BrandedQRCode` draws it to a
  canvas).
- Accept: hero under 200 kB, logo under 60 kB, repo 4 MB lighter.

### S4. Load only the fonts in use (mid)
Lesson: the sibling app dropped Google Fonts for self-hosted files and system
stacks.
- `client/index.html` loads five families. Keep only the two defaults (Inter
  400/500/600, Playfair Display 600/700) in the HTML.
- In `client/src/hooks/useApplyBrandSettings.ts`, when settings pick a
  non-default preset (`FONT_PRESETS` in `shared/schema.ts`), inject one
  `<link rel="stylesheet">` for that family, once.
- Better still, if time allows: self-host the two defaults as woff2 under
  `client/public/fonts/` with `@font-face` + `font-display: swap`, and drop
  the Google `<link>` and both `preconnect`s for the default case.
- Accept: with default settings the page requests at most two font families;
  choosing Lora in Settings still renders Lora on the landing page.

### S5. One request for the guest menu (mid)
- Add `GET /api/menus/:slug/full` returning `{ menu, drinks }` (drinks from
  `storage.getDrinksWithAvailability(menu.id, false)`); 404 when the slug is
  unknown. Keep the two existing endpoints.
- `client/src/pages/menu-detail.tsx`: replace the two chained `useQuery`
  calls (lines ~60-75) with one. Keep the loading, error and retry states.
- Give the guest menu query `staleTime: 30_000` and
  `refetchOnWindowFocus: true` (the global default is `Infinity`/`false`), so
  a guest who reopens their phone sees a drink that was 86'd meanwhile.
- Accept: the network tab shows one `/api/menus/.../full` call for the menu
  page; 86 a drink in the dashboard, refocus the guest tab, the badge updates.

### S6. Take framer-motion out of the guest bundle (small)
- `client/src/components/SplashScreen.tsx` is its only user. Rebuild the
  same fade/scale with CSS keyframes (respect `prefers-reduced-motion`, which
  `index.css` already handles globally), cut the default duration from 2000
  to 900 ms, and let a tap dismiss it.
- Remove `framer-motion` from `package.json` and its mention in `index.css`
  if it is only a comment.
- Accept: the main `index-*.js` chunk is smaller (record before/after); the
  splash still shows once per session on `/`.

### S7. Instant inventory taps (mid)
- `client/src/hooks/useIngredients.ts`: make `updateIngredientMutation`
  optimistic. `onMutate`: cancel `["/api/ingredients"]`, snapshot, write the
  new value into the cache. `onError`: restore the snapshot and toast the
  error. `onSettled`: invalidate.
- Add a `silent` flag used by the +/- steppers in
  `client/src/components/InventorySection.tsx` so a stepper tap shows no
  success toast (ten taps should not queue ten toasts). The edit dialog
  keeps its toast.
- Accept: with network throttled to Slow 3G, tapping + five times shows 5
  immediately; a forced failure rolls back and shows one error toast.

## Wave 2: reliability

### R1. Health endpoint (small)
Lesson: on a Replit custom domain the path `/healthz` is swallowed by the
front end before Express sees it; use `/api/healthz`.
- In `server/index.ts`, before the body parsers and session:
  `GET /api/healthz` runs `SELECT 1` on `pool` and returns
  `{ ok: true, uptime, version }` (version from `package.json`), or 503
  `{ ok: false }`. Skip it in the request logger.
- Accept: `curl localhost:5000/api/healthz` returns 200 with no cookie.

### R2. Survive a deploy with a tab open (mid)
Lesson: after two deploys a phone left open showed an empty app, because the
old tab asked for chunk files that no longer existed. Every `React.lazy`
page here has that risk, and the router's `Suspense fallback={null}` shows
nothing while it fails.
- `client/src/lib/chunkReload.ts`: pure
  `shouldReloadOnChunkError(lastReloadAt: number | null, now: number)`,
  true when there is no stored time or it is older than 30 000 ms. Test it.
- `client/src/main.tsx`: on `window` event `vite:preloadError`, read
  `sessionStorage["barflores:chunk-reload"]`; if the function says yes, store
  `Date.now()`, `event.preventDefault()`, `location.reload()`. If
  sessionStorage throws, do not reload. **Never clear the key on app mount**
  (that re-arms an infinite loop); let it expire.
- Add a top-level error boundary with "Reload" and "Try again" buttons, and
  give `Suspense` in `client/src/App.tsx` a small skeleton fallback.
- Depends on S1 (HTML must be `no-cache` or the reload fetches the old shell).
- Accept: build, load `/dashboard`, delete a lazy chunk from `dist/public/assets`,
  navigate to that page: one reload, no loop.

### R3. Say what is wrong on a fresh fork (small)
- A fork that skips `npm run db:push` boots and then 500s on `/api/menus`.
  At boot in `server/index.ts`, run `SELECT to_regclass('public.menus')`; if
  null, log one line: `Database has no tables yet. Run: npm run db:push` and,
  in development, exit 1.
- Accept: against an empty database the log shows that line.

### R4. Cap public order text on the server (small)
- `shared/validation/index.ts` `orderCreateSchema`: `guestName` `.max(80)`,
  `comments` `.max(500)`, matching `orderDetailsUpdateSchema` and the client
  `maxLength`. Add a test file `shared/validation/index.test.ts` covering
  accept at the limit and reject one over.

### R5. Security headers (small)
- `npm i helmet`; in `server/index.ts` add
  `helmet({ contentSecurityPolicy: false })` in production only. A CSP needs
  care here (inline theme styles, Google Fonts, object-storage images); leave
  it off and say so in a comment.
- Accept: `curl -sI` shows `x-content-type-options: nosniff`; landing, a
  themed menu, QR download and image upload still work.

### R6. Make local Postgres work (mid)
- `server/db.ts` uses the Neon WebSocket driver for every URL, so the README
  claim that "any local Postgres" works is expected to be false. First
  confirm: start a local Postgres, run `npm run dev`, note the error.
- If confirmed: when the host in `DATABASE_URL` does not end in `neon.tech`,
  use `pg` + `drizzle-orm/node-postgres`; otherwise keep Neon. Keep the
  exported `pool`/`db` names and types working for `connect-pg-simple` and
  `withTransaction`.
- Accept: `npm run db:push && npm run seed:demo && npm run dev` works against
  a local Postgres 16; note in the PR that the Neon path was not exercised.

## Wave 3: tests, CI, and making the repo cheap to work on

### T1. CI (small)
- `.github/workflows/ci.yml`: on pull_request and push to `main`, Node 20,
  `npm ci`, `npm run check`, `npm test`, `npm run build`.

### T2. Tests for the logic that already exists (mid)
- Move the CSV parser and row mappers out of `server/routes.ts` (lines
  ~960-1080) into `server/csv.ts` with no behaviour change, then test:
  quoted commas, doubled quotes, the `(REQUIRED)` header suffix, the 5000-row
  cap, and the known gap (a quoted newline splits the row; assert current
  behaviour and mark it `it.todo` for the fix).
- Test `client/src/lib/recipe.ts` `splitRecipe` and the pure parts of
  `client/src/lib/orderCookies.ts`.

### T3. Pickup docs (mid)
Lesson: every sibling repo has a short `CLAUDE.md`, a `docs/status.md` whose
first 40 lines say Now / Next (owner) / Next (agent) / Blockers, and a
fenced `replit.md`.
- Write `CLAUDE.md` (under 30 lines): read-first pointers, the commands, the
  ground rules above, the layout.
- Write `docs/status.md` with that header block; link this backlog and
  `docs/audit-2026-11.md`.
- Rewrite `replit.md` (stale per audit finding 23) to open with a fence for
  the Replit Agent: pull and publish only; no redesigns, no `npm install`, no
  schema pushes, no edits to `.replit`.

### T4. Split `server/routes.ts` (mid, after T2)
- 1,290 lines in one function. Split by resource into
  `server/routes/{auth,menus,drinks,ingredients,orders,settings,csv,barcode}.ts`,
  each exporting `register(app, deps)`; keep URLs, status codes and
  middleware order identical. No behaviour change; the diff should be moves.
- Accept: the route list from
  `grep -rn "app\.\(get\|post\|patch\|delete\)" server` is the same set
  before and after.

### T5. Remove dead dependencies (small)
- Not imported anywhere in `client/src`, `server`, `shared`, `scripts` or
  config: `passport`, `passport-local`, `memorystore`, `react-icons`,
  `tw-animate-css`, `@tailwindcss/vite`, `@jridgewell/trace-mapping`,
  `@types/passport`, `@types/passport-local`. Re-check each with grep, remove,
  rebuild.
- Then delete `client/src/components/ui/*` files that nothing imports, and
  the packages only they used (`embla-carousel-react`, `react-day-picker`,
  `input-otp`, `vaul`, `react-resizable-panels`, `cmdk` are candidates).

## Wave 4: one person, one phone

### U1. Shopping list in the dashboard (mid)
- The MCP tool `get_shopping_list` (`server/mcp/server.ts`) already computes
  it. Move that computation into a shared pure function, expose
  `GET /api/shopping-list` (auth required), and add a "Shopping list" button
  on the Inventory page that opens a sheet with a "Copy" button (plain text,
  one item per line, drink-blocking items first).

### U2. "Can make now" on Recipes (small)
- `client/src/pages/dashboard/recipes.tsx`: add a search box and a "Can make
  now" toggle using `isMakeable` from `/api/drinks/all`; show missing
  ingredients on the cards that cannot be made.

### U3. Add to home screen (small)
Lesson: a service worker that caches fetches pins old builds. Do not add one.
- Add `client/public/manifest.webmanifest` (name from the page title,
  `start_url: /dashboard`, `display: standalone`, theme colour from
  `index.html`), 192 and 512 px icons made from the logo, the `<link rel="manifest">`
  and `apple-touch-icon` tags. No service worker.

### U4. Queue notes are readable (small)
- `client/src/pages/dashboard/index.tsx`: the desktop "Notes" cell truncates
  at 200 px. Add a `title` with the full text and let it wrap to two lines.

## Owner decisions (not for an agent to pick)

| # | Decision | Why it is yours |
|---|----------|-----------------|
| O1 | **Decided 2026-11-27: accept it for now.** Cold start. Autoscale sleeps between uses, so the first scan of the night waits for the app and the database to wake. Options: accept it; point a free uptime pinger at `/api/healthz` (after R1) for the evening; or move to a Reserved VM | Costs money or compute hours |
| O2 | Run real migrations at start (`drizzle-kit generate` + `migrate()` under an advisory lock) instead of `db:push` | Changes how you publish; removes the manual step for forks |
| O3 | Dark-room guest mode (audit finding 7) | Design |
| O4 | Fewer badges on guest drink cards (audit finding 21) | Design |
| O5 | Decrement stock when a drink is served. Needs `drink_ingredients.amount` filled in (the column exists, nothing writes it) and a unit model | Schema meaning and UX |
| O6 | Order rate limit lives in memory, per instance, and resets on cold start. A Postgres counter fixes it but adds a table | Schema change; low risk at home-bar scale |
| O7 | "Log a drink" button for when you make one without a QR order, so stats stay true | New feature |

## Suggested order

S1, S2, S3, R1 can run in parallel on day one (no file overlap except
`server/index.ts` for S1/S2/R1: run those three one after another, or as one
agent). Then S5, S6, S7, R2. Then T1-T3. T4 and T5 last, alone, because
they touch many files and would conflict with everything else.
