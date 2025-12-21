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
- Basic session-based authentication for the dashboard (`admin` username with a configurable password) for internal use, not production-grade security. The public-facing menu operates without authentication.

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
      - Uses react-zxing library for camera access and barcode decoding
      - POST /api/barcode/lookup queries Open Food Facts and UPCitemdb APIs
      - Pre-fills ingredient form with product name, brand, category when found
      - Fallback to manual entry when barcode not recognized
      - Dialog resets properly on reopen for multiple scans
    - **Dynamic Theming**: Menus can be customized with specific hero images, background colors, accent colors, and typography, which are applied to their public-facing pages.
    - **Drink Attributes**: Support for `temperature` (Hot, Cold, Room Temp, Not Specified), `isMocktail` (exclusively non-alcoholic), and `canBeMocktail` (can be made as a mocktail) with corresponding UI badges.
- **Technical Implementations**: Frontend uses optimistic UI updates for smooth interactions. Backend enforces order workflow transitions and handles data validation. Query invalidation ensures UI synchronization after mutations. Event-driven cookie updates trigger immediate order status display without page reload.
- **Dashboard Layout Implementation**: Dashboard has been refactored from single-page conditional rendering to a multi-page routing structure for better performance, cleaner URLs, and optimal layouts. The architecture includes:
    - **Routing Structure**: 6 separate dashboard pages at `/dashboard/*` (Queue, Analytics, Menus, Drinks, QR Codes, Settings)
    - **Shared Components**: DashboardLayout wrapper provides consistent header, sidebar, and navigation across all pages
    - **Reusable Hooks**: Extracted shared logic into custom hooks (useOrders, useMenus, useDrinks, useAnalytics, useDashboardAuth) for better code organization
    - **Navigation**: AppSidebar uses wouter Link components for client-side routing with automatic active state management
    - **Authentication**: DashboardLayout protects all routes with session-based auth, redirecting to `/dashboard-login` when unauthenticated
    - **Layout Pattern**: SidebarProvider at root level, pages manage their own scrolling and height constraints for flexible content

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