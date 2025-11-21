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
    - **Guest Ordering**: QR code-based ordering, optional guest name capture, three-state order workflow (requested → in_progress → served).
    - **Dashboard**: Real-time order queue, drink analytics (popularity, "never made," "least ordered"), and admin functionalities.
    - **Admin Controls**: Create, edit, activate/deactivate, delete menus and drinks; drag-and-drop reordering for drinks; bulk operations (activate, deactivate, delete) for drinks.
    - **Dynamic Theming**: Menus can be customized with specific hero images, background colors, accent colors, and typography, which are applied to their public-facing pages.
    - **Drink Attributes**: Support for `temperature` (Hot, Cold, Room Temp, Not Specified), `isMocktail` (exclusively non-alcoholic), and `canBeMocktail` (can be made as a mocktail) with corresponding UI badges.
- **Technical Implementations**: Frontend uses optimistic UI updates for smooth interactions. Backend enforces order workflow transitions and handles data validation. Query invalidation ensures UI synchronization after mutations.

## External Dependencies

- **UI Component Libraries**: Radix UI primitives, shadcn/ui, Lucide React (icons), class-variance-authority, tailwind-merge, clsx.
- **Data Visualization**: Recharts for analytics bar charts.
- **Form Management**: React Hook Form with Zod resolvers.
- **Database & ORM**: @neondatabase/serverless, Drizzle ORM, drizzle-kit, ws.
- **Carousel/Slider**: embla-carousel-react.
- **QR Code Generation**: qrcode.react.
- **Drag-and-Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities.
- **Date Utilities**: date-fns.
- **Build Tools**: Vite, esbuild, TypeScript, PostCSS with Autoprefixer.
- **Session Management**: connect-pg-simple (for Express sessions).
- **Third-Party Services**: Google Fonts (Playfair Display, Inter, Roboto, Open Sans, Lora).