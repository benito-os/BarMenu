# Run your own bar menu

A fork-and-run guide. Forty minutes from "I have a GitHub account" to a QR
code on a table that puts orders in front of your bartender. Replit is the
path with the fewest steps; a section at the end covers any Node host.

The source is MIT licensed. Fork it, rename it, change the colours, sell
drinks with it. There is nothing to buy and nothing phones home.

## What you need

- A GitHub account (to fork) and a Replit account (free tier is enough to
  try it; a paid plan is needed for an always-on deployment).
- Ten minutes with your drinks list.
- A printer, for the QR table tents.

## 1. Fork and import

1. On GitHub, fork `benito-os/BarMenu` into your own account.
2. On Replit, choose **Create Repl → Import from GitHub** and paste your
   fork's URL. Replit reads `.replit` and sets Node 20 and the run command.
3. Wait for the import to finish. Do not press Run yet.

## 2. Postgres

1. In the Replit workspace, open **Tools → Database** (also called
   PostgreSQL). Click **Create a database**. Replit provisions a Neon
   Postgres instance and sets `DATABASE_URL` for you.
2. Open **Tools → Shell** and create the tables:

   ```bash
   npm run db:push
   ```

   Drizzle prints each table it creates (`menus`, `drinks`, `ingredients`,
   `drink_ingredients`, `orders`, `settings`). The `session` table is not in
   that list; the server creates it on first boot.

   If the prompt asks about the `session` table on a later push, that is
   expected: answer no to dropping it. `drizzle.config.ts` already excludes
   it, so this should not come up.

Replit gives you two databases over time: the one in the workspace (dev)
and the one attached to your deployment (production). Step 2 is for the
workspace. When you deploy in step 7, Replit's publish flow shows a schema
diff for the production database and asks you to confirm it; you do not
run `db:push` against production by hand.

## 3. Secrets

Open **Tools → Secrets** and add two:

| Key | Value |
|-----|-------|
| `SESSION_SECRET` | a long random string. In the Shell: `openssl rand -base64 48` |
| `DASHBOARD_PASSWORD` | the password you will type at `/dashboard-login` |

The server refuses to start in production without both. In the workspace
(development) a missing `DASHBOARD_PASSWORD` disables login rather than
falling back to a default, so you cannot accidentally ship a known password.

Optional, only if you want to upload hero images and a logo from the
dashboard instead of pasting image URLs:

1. **Tools → Object Storage → Create a bucket**.
2. Add two more secrets: `PUBLIC_OBJECT_SEARCH_PATHS` = `/<bucket-name>/public`
   and `PRIVATE_OBJECT_DIR` = `/<bucket-name>/private`.

Without these, the upload buttons show an error and the URL fields still
work.

## 4. First run and demo data

1. Press **Run**. The console shows `serving on port 5000` and the webview
   opens on the landing page, which says "No menus available at the moment".
2. In the Shell, load the demo bar so you can see every screen populated:

   ```bash
   npm run seed:demo
   ```

   This adds two fictional menus ("Late Harvest", active; "Midwinter",
   archived), nine drinks and seven inventory items. It never touches
   settings or orders, and a second run skips what is already there.
   `npm run seed:demo -- --reset` removes exactly those rows and adds them
   again. Delete the menus from the dashboard when you have your own.

3. Reload the webview. The landing page now shows the Late Harvest card.

## 5. First login

1. Go to `/dashboard-login` in the webview (or append it to your repl's
   URL in a normal browser tab; the webview sometimes blocks cookies).
2. Username is `admin`. Password is the `DASHBOARD_PASSWORD` secret.
3. You land on the **Queue**. With the demo loaded, go to **QR Codes** and
   press **Place test order** to see an order arrive with the chime.

Ten failed logins from one address lock that address out for 15 minutes.
Sessions last seven days and survive Replit restarts.

## 6. Make it yours

Everything below is in the dashboard; nothing needs a code change.

Menus (`/dashboard/menus`). Create a menu: a slug (the URL, e.g.
`friday-list`), a name, a short description, the section names in the
order you want them, and colours. The accent colour becomes the stripe on
the landing card, the section header rule, the QR foreground, and the
queue row marker. Mark exactly one menu **Active** for "View Tonight's
Menu" to work.

Drinks (`/dashboard/drinks`). Pick the menu, add drinks with a section,
description, and the recipe your bartender will read in the queue (one
line per step; the queue splits on newlines or commas). Drag to reorder.
**86** a drink when you run out; guests see "Unavailable" within one
refresh. Duplicate a whole menu from the Menus page when the season turns.

Branding (`/dashboard/settings`). Logo (shows on the splash, landing and in
the centre of every QR code), welcome line, headline and body fonts, QR dot
and eye style, and two operational knobs: the wait-time thresholds that
turn queue badges amber and red, and the per-device order cap per hour
(default 10; 0 turns it off).

Two things still live in code, because they render before the settings
load: the `<title>` and `<meta name="description">` in `client/index.html`,
and the words "Bar Flores" in `client/src/pages/landing.tsx`,
`SplashScreen.tsx`, `DashboardLayout.tsx` and `app-sidebar.tsx`. A
project-wide search for `Bar Flores` finds them all.

Inventory (`/dashboard/inventory`) is optional. Link ingredients to drinks
and a drink with a zero-stock ingredient shows "Missing ingredients" to
guests and cannot be ordered. The barcode scanner needs camera permission
and works best in Chrome or Safari on a phone.

Bulk entry. **Import/Export** takes CSV. Download the template, fill it,
upload it, read the preview, confirm. Drinks need the menu's ID, which
you get by exporting menus first. There is also a JSON path for a whole
menu with drinks in one file: `npx tsx server/import-menus.ts your.json`
(the shape is documented at the top of that file).

## 7. QR codes

1. **QR Codes** in the dashboard. Pick a menu; the code encodes
   `https://<your-domain>/menu/<slug>`. Switch **Use Menu Theme Colors**
   off if the accent is too light to scan (dark on light scans best).
2. **Download** for a single PNG, or **Print sheet** for one tent per active
   menu, sized for A6/half-letter. The print stylesheet hides the rest of
   the app, so print straight from the dialog.
3. Test one with a phone before you print fifty. The **Share** button on any
   guest menu page shows the same code, so a bartender can also hold up a
   phone for a guest.

QR codes point at whatever domain you generated them from. Generate them
after you deploy (next step), not from the workspace URL.

## 8. Deploy

1. **Deploy** in the Replit header. Choose **Autoscale**. Build and run
   commands are already in `.replit` (`npm run build`, `npm run start`).
2. Secrets from step 3 are copied into the deployment; check they are
   listed under the deployment's **Secrets** tab.
3. Replit shows the database schema diff for the production database.
   Review it (on first deploy it creates every table) and confirm.
4. Once live, open `https://<your-repl>.replit.app/dashboard-login`, log in,
   and either run through step 6 again or import the CSV you exported from
   the workspace.
5. Attach a custom domain from the deployment's **Settings** if you have
   one, then generate the QR codes.

Autoscale containers restart often. That is fine: sessions and all data are
in Postgres, nothing lives in the container.

## Running somewhere other than Replit

The app is a plain Node 20 + Express server that serves a Vite build.

```bash
git clone https://github.com/<you>/BarMenu.git && cd BarMenu
npm install
cp .env.example .env     # set DATABASE_URL, SESSION_SECRET, DASHBOARD_PASSWORD
npm run db:push
npm run seed:demo        # optional
npm run dev              # http://localhost:5000, Vite middleware mode
```

Production: `npm run build && NODE_ENV=production npm run start`. Put it
behind any TLS-terminating proxy; the server already trusts one proxy hop
in production and sets `secure` cookies.

What changes off Replit:

- `DATABASE_URL` must be a Postgres the `@neondatabase/serverless` driver
  can reach over WebSocket. Neon's free tier works as is. For a plain
  Postgres, swap `server/db.ts` to `pg` + `drizzle-orm/node-postgres`
  (about ten lines).
- Image upload uses Replit's object-storage sidecar
  (`server/replit_integrations/object_storage/`). Elsewhere, either paste
  image URLs (works today) or replace that module with S3/GCS/R2 signed
  URLs.
- The Replit-only Vite plugins (`cartographer`, `dev-banner`) are gated on
  `REPL_ID` and do not load.

## When something goes wrong

| Symptom | Cause | Fix |
|---------|-------|-----|
| Landing page shows "Couldn't load the menus" | tables missing | `npm run db:push` |
| Server exits at boot with `SESSION_SECRET must be set` | production without secrets | add both secrets, redeploy |
| Login returns "Login is not configured" | `DASHBOARD_PASSWORD` unset in the workspace | add the secret, restart |
| Logged in, then bounced back to login | cookies blocked in the Replit webview | open the URL in a normal browser tab |
| Upload button errors | object storage not configured | step 3, optional part; or paste a URL |
| Guest sees "Too many orders from this device" | per-IP cap hit (shared venue wifi counts as one device) | raise or zero the cap in Settings |
| QR code scans to the wrong host | generated from the workspace URL | regenerate after deploying |
| `db:push` wants to drop `session` | `drizzle.config.ts` missing `tablesFilter` | it is there in this repo; answer no and check your merge |

Questions or fixes: open an issue on your fork or upstream.
