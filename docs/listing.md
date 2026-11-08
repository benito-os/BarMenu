# Listing copy

Two variants. The first is the one to use. The second exists in case the
owner wants to offer a paid convenience bundle; it must never hide that the
source is free.

Rules that apply to both: no customer names, no usage numbers, no
"trusted by", no testimonials. We have one deployment (the author's own
home bar) and no data about anyone else's. Claims below are limited to
what the code does.

---

## Variant A: free MIT showcase

Use on GitHub (About field + README intro), a personal site, a Show HN or
similar post, and any directory of open-source projects.

### One line (GitHub About, under 120 characters)

QR-code cocktail menu and bartender queue for small bars and home parties. Self-hosted, MIT.

### Short (directory listing, about 60 words)

BarMenu is a self-hosted ordering system for small bars, pop-ups and home
cocktail parties. Guests scan a QR code, browse a themed menu and request a
drink in two taps; the bartender works from a live queue with a chime and
keyboard shortcuts. Menus, drinks, branding, inventory and CSV import are
all in one dashboard. React, Express, Postgres. MIT licensed, free to run.

### Long (project page, Show HN body)

**What it is.** A cocktail menu that lives on your guests' phones and an
order queue that lives on yours. You create a menu with sections, drinks
and a colour scheme, print the QR code, and put it on the table. Guests
scan, read, tap "Request this drink", add a name and a note. The order
lands on the bartender's screen with a soft chime. The bartender taps Start
and Served; the guest's phone shows the status change.

**What it does.**

- Per-menu QR codes with your logo in the centre, printable as table tents.
- Guest ordering with no app, no account, no payment. Optional name, free-text
  note, "make it a mocktail" when the drink allows it.
- Live bartender queue: oldest first, wait-time badges that turn amber and
  red on thresholds you set, batch actions, 86 a drink from the row, edit a
  guest's note, keyboard shortcuts.
- Menus and drinks: sections, drag-to-reorder, duplicate a menu for next
  season, archive old ones, bulk activate and deactivate.
- Analytics: orders per drink, with "never made" and "least ordered"
  filters per menu.
- Optional inventory with barcode scanning (Open Food Facts + UPCitemdb
  lookups). A drink whose ingredient is out of stock becomes unavailable to
  guests automatically.
- CSV import with preview-before-write and per-row errors; CSV export of
  everything.
- Branding: logo, welcome line, headline and body fonts, QR style, and a
  per-menu accent colour that carries through landing card, section rules,
  QR and queue.
- Anti-spam: per-device order cap per hour, configurable; login rate limit;
  Postgres-backed sessions.

**What it is not.** Not a POS. No payments, no tabs, no tips, no receipts, no
multi-location. One admin account. If you need those, this is not the
project; if you run one bar and want guests to stop queuing at the counter
to ask what is in the Negroni, it is.

**Run it.** Fork on GitHub, import into Replit, add a Postgres database and
two secrets, press Run. The guide covers it step by step, including QR
printing and deployment: `docs/run-your-own.md`. It also runs on any Node
host with a Postgres.

**Licence.** MIT. The code is free to use, change and sell with. There is no
paid tier of the software.

**Status.** Built for and used at the author's own home bar since 2025.
Audited for security, performance and accessibility in several passes; the
latest audit with open findings is in `docs/audit-2026-11.md`. Issues and
PRs are welcome.

### Tags

open-source, self-hosted, cocktail-menu, qr-menu, bar, hospitality,
react, express, drizzle, postgres, replit, mit

---

## Variant B: optional "$39 convenience template"

Only if the owner decides to offer it. What is sold is time, not software:
a pre-configured Replit template plus a setup call. The listing must say,
in the first paragraph, that the code is MIT and free, and link to the repo.

### Title

BarMenu, ready-to-run Replit template + 30-minute setup call. $39.

### Body

The BarMenu source is free and MIT licensed on GitHub; you can set it up
yourself in about forty minutes with `docs/run-your-own.md`. This bundle is
for people who would rather not.

**You get:**

- A Replit template already wired with Postgres, object storage and the
  demo bar, so the first thing you see is a populated menu, not an empty
  page. You add your secrets and press Run.
- A 30-minute video call where we enter your first menu together, set your
  colours and logo, generate and test the QR codes on your phone, and deploy
  to your `.replit.app` URL (or your domain).
- A one-page print-ready QR tent layout for your active menu.
- Thirty days of email for "it stopped working" questions.

**You do not get:** anything the free version lacks. The template is the
same code. There is no licence key, no feature unlock, and nothing stops
working if you never pay again.

**Who it suits:** someone running a home bar, a one-night pop-up or a small
tasting room who wants it live tonight and would rather spend $39 than an
evening reading setup docs.

**Not included:** Replit's own hosting fees (an always-on Autoscale
deployment is on their paid plans), payments or POS integration, custom
development. Custom work is quoted separately if you want it.

**Refund:** full refund if, after the call, it is not running on your
account.

### Where to list it

Replit's template gallery (the template itself can be free there with the
call sold separately), Gumroad or Lemon Squeezy for the bundle, and a link
from the repo README under "Want help setting it up?". Do not list it
anywhere that implies the software itself is the paid item.

---

## Open questions for the owner

1. Variant A only, or A + B?
2. Project name in listings: "BarMenu" (the repo name) or "Bar Flores" (the
   deployed brand)? The copy above uses BarMenu for the project and leaves
   Bar Flores as the author's instance.
3. If B: which call-scheduling and payment tools, and whether the demo bar
   name ("The Lantern Room") should appear in the template or be renamed.
