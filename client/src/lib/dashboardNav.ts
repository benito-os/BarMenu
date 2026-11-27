import {
  BarChart3,
  BookOpen,
  Boxes,
  FileDown,
  Info,
  LayoutDashboard,
  Menu as MenuIcon,
  QrCode,
  Settings,
  Wine,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  icon: LucideIcon;
  path: string;
  /** data-testid used by the desktop sidebar (kept stable for tests). */
  testId: string;
  /** Short label for the mobile tab bar / More sheet. */
  short?: string;
};

/**
 * Single source of truth for dashboard destinations. The desktop sidebar
 * lists all of them; the mobile tab bar shows `MOBILE_PRIMARY_PATHS` and puts
 * the rest behind "More".
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { title: "Queue", icon: LayoutDashboard, path: "/dashboard", testId: "sidebar-queue" },
  { title: "Analytics", icon: BarChart3, path: "/dashboard/analytics", testId: "sidebar-analytics" },
  { title: "Menus", icon: MenuIcon, path: "/dashboard/menus", testId: "sidebar-menus" },
  { title: "Drinks", icon: Wine, path: "/dashboard/drinks", testId: "sidebar-drinks" },
  { title: "Recipes", icon: BookOpen, path: "/dashboard/recipes", testId: "sidebar-recipes" },
  { title: "Inventory", icon: Boxes, path: "/dashboard/inventory", testId: "sidebar-inventory" },
  { title: "QR Codes", icon: QrCode, path: "/dashboard/qr-codes", testId: "sidebar-qr-codes" },
  { title: "Import/Export", icon: FileDown, path: "/dashboard/import-export", testId: "sidebar-import-export", short: "Import / Export" },
  { title: "Settings", icon: Settings, path: "/dashboard/settings", testId: "sidebar-settings" },
  { title: "About", icon: Info, path: "/about", testId: "sidebar-about" },
];

/** The four destinations an owner hits most, in thumb order. */
export const MOBILE_PRIMARY_PATHS = [
  "/dashboard",
  "/dashboard/recipes",
  "/dashboard/inventory",
  "/dashboard/drinks",
];

export function isNavItemActive(location: string, path: string): boolean {
  if (path === "/dashboard") return location === "/dashboard";
  return location === path || location.startsWith(path + "/");
}

export function navTitleFor(location: string): string | null {
  const item = DASHBOARD_NAV.find((i) => isNavItemActive(location, i.path));
  return item ? item.title : null;
}
