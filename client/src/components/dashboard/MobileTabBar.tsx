import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, LogOut, MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_NAV,
  MOBILE_PRIMARY_PATHS,
  isNavItemActive,
  type DashboardNavItem,
} from "@/lib/dashboardNav";
import { scrollToTop } from "@/lib/scroll";
import type { OrderWithDrink } from "@shared/validation";

const PRIMARY = MOBILE_PRIMARY_PATHS.map((p) => DASHBOARD_NAV.find((i) => i.path === p)!).filter(Boolean);
const SECONDARY = DASHBOARD_NAV.filter((i) => !MOBILE_PRIMARY_PATHS.includes(i.path));

function slug(path: string) {
  return path === "/dashboard" ? "queue" : path.split("/").pop()!;
}

/**
 * Phone-only bottom navigation: the four destinations an owner uses most,
 * plus "More" for the rest. Hidden from md up, where the sidebar takes over.
 * Shows the open-order count on Queue from any page (same query key as the
 * queue page, so the cache is shared).
 */
export function MobileTabBar({ barName, onLogout }: { barName: string; onLogout: () => void }) {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: queue } = useQuery<OrderWithDrink[]>({
    queryKey: ["/api/orders/queue"],
    refetchInterval: 15000,
  });
  const openCount = (queue ?? []).filter((o) => o.status === "requested" || o.status === "in_progress").length;
  const secondaryActive = SECONDARY.some((i) => isNavItemActive(location, i.path));

  return (
    <>
      <nav
        aria-label="Dashboard"
        data-testid="mobile-tab-bar"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="grid grid-cols-5 h-16">
          {PRIMARY.map((item) => (
            <li key={item.path}>
              <TabLink
                item={item}
                active={isNavItemActive(location, item.path)}
                badge={item.path === "/dashboard" ? openCount : 0}
              />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              data-testid="mobile-tab-more"
              className={cn(
                "tab-item",
                secondaryActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              <span>More</span>
              {secondaryActive && <span className="sr-only">(current page is in More)</span>}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] max-h-[85dvh] overflow-y-auto"
          data-testid="sheet-more"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="font-serif text-xl">{barName}</SheetTitle>
            <SheetDescription className="sr-only">Other dashboard pages</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {SECONDARY.map((item) => {
              const active = isNavItemActive(location, item.path);
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    data-testid={`more-${slug(item.path)}`}
                    className={cn(
                      "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm text-center px-1",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "border-primary bg-primary/10 text-primary font-medium" : "bg-card hover:bg-muted",
                    )}
                  >
                    <item.icon className="h-5 w-5" aria-hidden />
                    {item.short ?? item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={() => setMoreOpen(false)}
              data-testid="more-guest-home"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-card text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Home className="h-4 w-4" aria-hidden />
              Guest home
            </Link>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onLogout();
              }}
              data-testid="more-logout"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-card text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TabLink({ item, active, badge }: { item: DashboardNavItem; active: boolean; badge: number }) {
  return (
    <Link
      href={item.path}
      aria-current={active ? "page" : undefined}
      data-testid={`mobile-tab-${slug(item.path)}`}
      onClick={(e) => {
        // Tapping the tab you're on scrolls back to the top (iOS convention).
        if (active) {
          e.preventDefault();
          scrollToTop();
        }
      }}
      className={cn("tab-item", active ? "text-primary" : "text-muted-foreground")}
    >
      <span className="relative">
        <item.icon className="h-5 w-5" aria-hidden />
        {badge > 0 && (
          <span
            className="absolute -right-2.5 -top-1.5 min-w-[1.125rem] h-[1.125rem] rounded-full bg-primary px-1 text-[0.6875rem] font-semibold leading-[1.125rem] text-primary-foreground text-center tabular-nums"
            data-testid="mobile-tab-queue-count"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span>{item.title}</span>
      {badge > 0 && <span className="sr-only">, {badge} open orders</span>}
      {active && <span aria-hidden className="absolute top-0 inset-x-5 h-0.5 rounded-full bg-primary" />}
    </Link>
  );
}
