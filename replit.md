# Bar Flores - Cocktail Menu Management System

## Overview

Bar Flores is a mobile-first web application for managing and displaying experimental cocktail menus. The system allows bartenders to create themed menus (e.g., NYE, Spring), showcase drinks with detailed information, accept orders from guests via QR codes, and track analytics on drink popularity. The application emphasizes a premium hospitality design aesthetic with clean typography and sophisticated layouts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety and component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design System:**
- Typography: Playfair Display (serif) for headers/drink names, Inter (sans-serif) for body text
- Mobile-first responsive design with breakpoints for tablet and desktop
- Custom color scheme using CSS variables for theming
- Container max-widths: 7xl for landing/dashboard, 6xl for menu pages
- Spacing system based on Tailwind's default scale (2, 4, 6, 8, 12, 16, 24)

**Page Structure:**
- Landing page: Hero section with background image and menu showcase
- Menu detail page: Displays drinks organized by sections with order functionality
- Dashboard page: Real-time order queue and drink analytics with filtering options
- 404 Not Found page for error handling

**State Management:**
- React Query handles all server state with automatic refetching intervals
- Local component state using React hooks for UI interactions (e.g., ordered drinks tracking)
- Toast notifications for user feedback on actions

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Node.js runtime environment
- RESTful API design pattern
- Vite middleware integration for development HMR

**API Endpoints:**
- `GET /api/menus` - Retrieve all menus
- `GET /api/menus/:slug` - Get specific menu by slug
- `POST /api/menus` - Create new menu
- `GET /api/drinks/:menuId` - Get drinks for a menu
- `POST /api/drinks` - Create new drink
- `POST /api/orders` - Place drink order
- `GET /api/orders/queue` - Get pending orders
- `PATCH /api/orders/:id` - Update order status
- `GET /api/analytics` - Get drink popularity analytics

**Data Layer:**
- Storage abstraction through IStorage interface for flexibility
- DatabaseStorage implementation using Drizzle ORM
- Schema validation using Zod with drizzle-zod integration

**Request Handling:**
- JSON body parsing with raw body capture for webhook support
- Request/response logging middleware with duration tracking
- Error handling with appropriate HTTP status codes

### Data Storage

**Database:**
- PostgreSQL via Neon serverless driver
- Connection pooling for performance
- WebSocket support for serverless environments

**ORM:**
- Drizzle ORM for type-safe database queries
- Schema-first approach with TypeScript inference
- Migration system via drizzle-kit

**Schema Design:**
- `menus` table: Stores menu metadata (slug, name, description, active status)
- `drinks` table: Drink details with foreign key to menus, includes recipe, style, preparation method, base spirit
- `orders` table: Order tracking with status workflow and timestamps
- UUID primary keys using PostgreSQL's `gen_random_uuid()`
- Cascade delete for menu-drink relationships

**Data Types:**
- Boolean flags for drink characteristics (isMocktail, isStirred, isShaken, isActive)
- Text fields for flexible content (descriptions, recipes)
- Integer sort order for drink display sequencing
- Timestamps for audit trails (createdAt, completedAt)

### Authentication and Authorization

Currently not implemented - the application operates in an open access model suitable for public-facing menu displays and internal dashboard use without authentication requirements.

### External Dependencies

**UI Component Libraries:**
- Radix UI primitives (@radix-ui/*) - Accessible, unstyled component primitives for dialogs, dropdowns, tooltips, etc.
- shadcn/ui - Pre-styled component library built on Radix UI with customizable variants
- Lucide React - Icon library for consistent iconography
- class-variance-authority - Utility for managing component variants
- tailwind-merge and clsx - Classname utilities for Tailwind CSS

**Data Visualization:**
- Recharts - Composable charting library for analytics bar charts

**Form Management:**
- React Hook Form - Form state and validation
- @hookform/resolvers - Zod schema integration for form validation

**Database and ORM:**
- @neondatabase/serverless - Serverless PostgreSQL driver with WebSocket support
- Drizzle ORM - Type-safe database toolkit
- drizzle-kit - Migration and schema management CLI
- ws - WebSocket library for Neon database connections

**Carousel/Slider:**
- embla-carousel-react - Touch-friendly carousel component

**Date Utilities:**
- date-fns - Date manipulation and formatting

**Build Tools:**
- Vite - Fast build tool and dev server
- esbuild - Fast JavaScript bundler for production builds
- TypeScript - Type checking and compilation
- PostCSS with Autoprefixer - CSS processing

**Development Tools:**
- @replit/vite-plugin-runtime-error-modal - Development error overlay
- @replit/vite-plugin-cartographer - Code mapping for Replit
- @replit/vite-plugin-dev-banner - Development environment banner

**Session Management:**
- connect-pg-simple - PostgreSQL session store for Express (prepared for future auth)

**Third-Party Services:**
- Google Fonts - Playfair Display and Inter font families loaded via CDN