# Bar Flores - Cocktail Menu Management System

## Overview
Bar Flores is a mobile-first web application designed for managing and displaying experimental cocktail menus. It enables bartenders to create themed menus, detail drinks, accept orders via QR codes, and track drink popularity. The application prioritizes a premium hospitality design aesthetic with clean typography and sophisticated layouts. It aims to enhance guest experience through intuitive ordering and provide robust tools for menu administration and analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React with TypeScript, Vite, Wouter for routing, TanStack Query for server state, shadcn/ui (Radix UI) for components, Tailwind CSS for styling.
- **Design System**: Mobile-first responsive design, custom color scheme via CSS variables, Playfair Display (serif) and Inter (sans-serif) fonts, consistent spacing system.
- **Page Structure**: Includes a landing page, menu detail page with ordering, a dashboard for real-time order queue and analytics, and an admin section for menu and drink management.
- **State Management**: React Query for server state and caching, React hooks for local UI state, toast notifications for user feedback.

### Backend Architecture
- **Technology Stack**: Express.js with TypeScript, Node.js, RESTful API design.
- **API Endpoints**: Comprehensive set of endpoints for managing menus, drinks, orders, authentication, and analytics.
- **Data Layer**: Abstracted storage through `IStorage` interface, `DatabaseStorage` implementation using Drizzle ORM, Zod for schema validation.
- **Request Handling**: JSON body parsing, logging middleware, and structured error handling.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe queries and schema management via `drizzle-kit`.
- **Schema Design**: `menus`, `drinks`, and `orders` tables with UUID primary keys and cascade delete for relationships. Includes fields for drink characteristics (e.g., `isMocktail`, `temperature`, `canBeMocktail`) and menu theming (`heroImageUrl`, `backgroundColor`, `accentColor`, `typography`).

### Authentication and Authorization
- Session-based authentication for the dashboard, single `admin` user.
- `DASHBOARD_PASSWORD` and `SESSION_SECRET` are read from Replit Secrets only — there are no source-code fallbacks. The server fails fast at boot in production if either is missing.
- Password comparison uses `crypto.timingSafeEqual` to avoid timing leaks.
- Sessions are persisted in Postgres via `connect-pg-simple` (`session` table, expired rows pruned every 15 min) so they survive Replit container restarts.
- `/api/auth/login` is rate-limited (10 attempts per IP per 15 min) via `express-rate-limit`; successful logins do not consume budget.
- All admin endpoints (mutations on menus/drinks/ingredients/orders/settings, all `/api/import/*`, all `/api/export/*`, all `/api/templates/*`, `/api/barcode/lookup`, admin reads like `/api/drinks/all` and `/api/orders/queue`) enforce auth via a `requireAuth` middleware.
- Public endpoints (no auth required): `GET /api/menus`, `GET /api/menus/:slug`, `GET /api/drinks?menuId=...`, `GET /api/drinks/:id`, `POST /api/orders`, `GET /api/orders/:id`, `GET /api/orders/by-ids?ids=...`, `GET /api/settings` (branding only), and `/api/auth/*`.
- Session cookies are `httpOnly`, `secure` in production, and `sameSite: "lax"` (dashboard and API are same-origin).
- Client `HttpError` carries the response status; a 401 from any query or mutation redirects to `/dashboard-login` instead of leaving the UI in an error state.

### System Design Choices
- **UI/UX**: Emphasis on premium design, dynamic theming for menus (custom hero images, colors, typography), and clear visual feedback.
- **Feature Specifications**:
    - **Guest Ordering**: QR code-based ordering with enhanced UX features:
      - Optional guest name capture for personalized service
      - Comments field for special requests (e.g., "extra ice", "no garnish")
      - Mocktail request option (conditional, shown only when drink supports it)
      - Cookie-based order tracking for persistent guest experience
      - Inline order status display via OrderStatusBanner component
      - Real-time status updates (auto-refresh every 5 seconds)
      - Three-state order workflow (requested → in_progress → served)
    - **Order Status Tracking**: Browser cookie-based tracking system (`barflores_orders`) stores order IDs, drink names, guest names, and timestamps. OrderStatusBanner displays active orders inline on menu pages, showing color-coded status badges, guest names, comments, and mocktail indicators. Auto-removes completed/cancelled orders. Graceful error handling with fallback UI for network issues.
    - **Dashboard**: Real-time order queue, drink analytics (popularity, "never made," "least ordered"), and admin functionalities.
    - **Admin Controls**: Create, edit, activate/deactivate, delete menus and drinks; drag-and-drop reordering for drinks; bulk operations (activate, deactivate, delete) for drinks.
    - **Inventory Management**: Full ingredient CRUD (create, read, update, delete) with stock level tracking:
      - Add ingredients manually or via barcode scanner
      - Edit all ingredient fields (name, category, unit, on hand, par level)
      - Delete ingredients with cascading cleanup of drink associations
      - Filter by category, status (healthy, low, out of stock)
      - Summary cards showing total ingredients, low stock count, restock urgency
    - **Barcode Scanning**: Camera-based barcode scanning for quick ingredient entry:
      - Uses @zxing/browser library with capture button approach for reliable scanning
      - POST /api/barcode/lookup queries Open Food Facts and UPCitemdb APIs
      - Pre-fills ingredient form with product name, brand, category when found
      - Fallback to manual entry when barcode not recognized
      - Canvas-based snapshot decoding for better mobile compatibility
    - **Import/Export System**: CSV-based data portability for all database tables:
      - Export endpoints: GET /api/export/{menus|drinks|ingredients|orders}
      - Template endpoints: GET /api/templates/{menus|drinks|ingredients|orders}
      - Import endpoints: POST /api/import/{menus|drinks|ingredients|orders}
      - CSV headers clearly mark required vs optional fields with "(REQUIRED)" suffix
      - Dashboard page at /dashboard/import-export with tabbed interface
      - Templates include example rows for guidance
      - Import validation with per-row error reporting
    - **Dynamic Theming**: Menus can be customized with specific hero images, background colors, accent colors, and typography, which are applied to their public-facing pages.
    - **Hero Image Upload**: Admin can upload hero images directly via drag-and-drop or file picker, or use external image URLs. Uploads are stored in Replit object storage and require dashboard authentication.
    - **Drink Attributes**: Support for `temperature` (Hot, Cold, Room Temp, Not Specified), `isMocktail` (exclusively non-alcoholic), and `canBeMocktail` (can be made as a mocktail) with corresponding UI badges.
- **Technical Implementations**: Frontend uses optimistic UI updates for smooth interactions. Backend enforces order workflow transitions and handles data validation. Query invalidation ensures UI synchronization after mutations. Event-driven cookie updates trigger immediate order status display without page reload.
- **Dashboard Layout Implementation**: Dashboard has been refactored from single-page conditional rendering to a multi-page routing structure for better performance, cleaner URLs, and optimal layouts. The architecture includes:
    - **Routing Structure**: 7 separate dashboard pages at `/dashboard/*` (Queue, Analytics, Menus, Drinks, Inventory, QR Codes, Settings, Import/Export)
    - **Shared Components**: DashboardLayout wrapper provides consistent header, sidebar, and navigation across all pages
    - **Reusable Hooks**: Extracted shared logic into custom hooks (useOrders, useMenus, useDrinks, useIngredients, useAnalytics, useDashboardAuth) for better code organization
    - **Navigation**: AppSidebar uses wouter Link components for client-side routing with automatic active state management
    - **Authentication**: DashboardLayout protects all routes with session-based auth, redirecting to `/dashboard-login` when unauthenticated
    - **Layout Pattern**: SidebarProvider at root level, pages manage their own scrolling and height constraints for flexible content
    - **Mobile Optimizations**: 
      - Queue page: Collapsible card layout on mobile with inline expansion for order details and actions
      - Inventory page: Card-based layout on mobile (hidden on desktop, table on desktop)
      - Responsive breakpoint at md: (768px) switches between mobile card view and desktop table view
    - **Batch Order Operations**: Queue page supports checkbox selection with bulk "Start Preparing", "Mark Served", and "Clear Served" actions
    - **Waiting Time Indicators**: Order queue displays color-coded waiting time badges with configurable thresholds (default: gray <3min, yellow 3-5min, red 5+ min). Thresholds can be customized in Settings → Queue Settings.
    - **Quick 86 Action**: Drinks page has one-tap "86" button to mark drinks out-of-stock (shows "Restock" when already 86'd)
    - **Queue 86 Toggle**: Order queue allows marking drinks out-of-stock directly from queue cards/rows with immediate visual highlighting
    - **Mobile Queue Optimization**: Compact stacked card layout optimized for 375px screens with checkbox/status rows, smaller badges, and 2-column action grid
    - **Out-of-Stock Highlighting**: Queue orders for 86'd drinks display destructive badge, highlighted row styling, and "alert the guest" helper text
    - **Mobile Inventory Optimization**: Compact card layout with collapsible "Add Ingredient" form, inline +/- stock adjustment buttons, and status-colored borders for low/out items

## External Dependencies

- **UI Component Libraries**: Radix UI primitives, shadcn/ui, Lucide React (icons), class-variance-authority, tailwind-merge, clsx.
- **Data Visualization**: Recharts for analytics bar charts.
- **Form Management**: React Hook Form with Zod resolvers.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-kit, ws.
- **Carousel/Slider**: embla-carousel-react.
- **QR Code Generation**: qrcode.react.
- **Barcode Scanning**: react-zxing for camera-based barcode decoding.
- **Drag-and-Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities.
- **Date Utilities**: date-fns.
- **Build Tools**: Vite, esbuild, TypeScript, PostCSS with Autoprefixer.
- **Session Management**: connect-pg-simple (for Express sessions).
- **Third-Party Services**: Google Fonts (Playfair Display, Inter, Roboto, Open Sans, Lora).

## Operational Notes

- **Bundle layout**: All `/dashboard/*` pages are lazy-loaded via `React.lazy`. Guest pages (`/`, `/menu/:slug`, `/dashboard-login`) are eager. Inventory (barcode scanner) and Analytics (recharts) ship as their own chunks (~116KB and ~104KB gzipped respectively) and don't reach guests.
- **Polling**: The queue refetches every 5s; analytics every 10s. `OrderStatusBanner` makes a single `/api/orders/by-ids` batch request per cycle regardless of how many orders the guest is tracking.
- **CSV imports**: Capped at 2MB payload and 5000 rows (enforced both at `express.json` and via `csvImportSchema`).
- **Request logging**: Method/path/status/duration only — response bodies are not captured (they leaked session info and order details in earlier versions).
- **Database**: At current scale (single-digit menus, ~50 drinks, ~20 orders) the Postgres planner correctly prefers sequential scans for every query. Secondary indexes on `orders`, `drinks.menu_id`, etc. should be added when `orders` crosses ~5–10k rows; until then they'd add write overhead without read benefit.