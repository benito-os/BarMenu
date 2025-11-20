# Bar Flores Design Guidelines

## Design Approach

**Reference-Based Hospitality Design**

Drawing inspiration from premium hospitality brands (Airbnb, high-end restaurant sites, Spotify's content organization) to create an elevated yet approachable bar experience. The design balances sophisticated cocktail culture aesthetics with practical ordering functionality.

**Key Design Principles:**
- Mobile-first for guest QR code experience
- Clean, sophisticated aesthetic befitting craft cocktails
- Clear information hierarchy for quick drink discovery
- Purposeful use of whitespace and photography

---

## Typography

**Font Stack:**
- Headers: 'Playfair Display' (serif, elegant) - for menu names, drink names
- Body: 'Inter' (sans-serif, clean) - for descriptions, UI elements, dashboard
- Accent: 'Inter' medium weight for labels and badges

**Hierarchy:**
- H1 (Menu titles): 3xl to 4xl, Playfair Display
- H2 (Section names): xl to 2xl, Inter semibold, uppercase, letter-spacing
- H3 (Drink names): lg to xl, Playfair Display
- Body (descriptions): base, Inter regular
- Labels/badges: sm, Inter medium

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24

**Grid System:**
- Mobile: Single column for drinks, full-width cards
- Tablet: 2-column drink grid
- Desktop: 3-column drink grid for menus, 2-column for landing page menu showcase

**Container Constraints:**
- Landing page: max-w-7xl
- Menu pages: max-w-6xl
- Dashboard: max-w-7xl (wider for data tables)

---

## Component Library

### Landing Page
**Hero Section (60vh):**
- Full-width image showcasing elegant cocktails or bar atmosphere
- Centered overlay with site title and tagline
- Subtle dark gradient overlay for text legibility
- Primary CTA: "View Tonight's Menu"

**Menu Grid:**
- Card-based layout showing available menus
- Each card: menu name, theme description, date, "Active Tonight" badge if applicable
- Hover state: subtle lift and shadow enhancement

### Menu Detail Pages (/menu/[slug])

**Menu Header:**
- Menu name (large, Playfair)
- Brief theme description
- Date or event context
- Fixed mobile bottom nav with section jump links

**Drink Cards:**
- High-quality cocktail photography (3:4 ratio) or elegant placeholder gradients
- Drink name prominently displayed
- Section tag (e.g., "STAYING AWAKE!", "FESTIVE AND FRUITY")
- 2-3 line description
- Badge row: mocktail, stirred/shaken, base spirit icons
- "Request This Drink" button (primary action)

**Section Organization:**
- Clear section headers with visual dividers
- Drinks grouped within sections
- Smooth scroll behavior between sections

### Ordering Interaction

**Request Button:**
- Full-width on mobile, prominent on card
- When tapped: immediate visual feedback
- Confirmation toast: "Your [Drink Name] is in the queue" with checkmark icon
- Subtle success animation

### Host Dashboard

**Navigation Tabs:**
- "Live Queue" and "Analytics" as primary tabs
- Clean tab bar with active state indicator

**Queue View:**
- Table layout with columns: Time, Drink Name, Status, Actions
- Status badges: color-coded (Requested: blue, In Progress: yellow, Served: green)
- "Mark as Served" button per row
- Auto-refresh indicator
- Empty state: "No pending orders"

**Analytics View:**
- Bar chart showing drink popularity
- Data table below with sortable columns
- Filter pills: "Never Made" (highlighted), "Least Ordered", Time range selector
- Visual indicators: red badge for 0 orders, subtle highlight for bottom 25%

---

## Interaction Patterns

**Navigation:**
- Sticky header on scroll for menu pages
- Floating section navigation on mobile menus
- Breadcrumb on menu pages: "Home > NYE 2025 Menu"

**Feedback:**
- Toast notifications for order confirmations
- Loading states on buttons during submission
- Success checkmarks and subtle micro-animations
- Real-time counter updates on dashboard

**Mobile Optimization:**
- Touch-friendly button sizes (minimum 44px tap targets)
- Swipe-friendly card interactions
- Fixed bottom CTA bars where appropriate
- Optimized for one-handed use

---

## Images

**Landing Page Hero:**
- Single high-quality image: overhead shot of multiple craft cocktails on dark marble or wood surface, sophisticated bar atmosphere
- Dimensions: 1920x1080, optimized for web
- Position: Center-focused composition

**Menu Page Drink Cards:**
- Individual cocktail photos for each drink (3:4 ratio, portrait orientation)
- Clean, professional styling with consistent lighting
- Alternative: If photos unavailable, use gradient backgrounds with glass iconography
- Each drink should feel premium and inviting

**Dashboard:**
- No images needed - data-focused interface

**Image Treatment:**
- Subtle vignette on hero images
- Consistent editing style across all cocktail photos
- Dark overlays (30-40% opacity) when text overlays images