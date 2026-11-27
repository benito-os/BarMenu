import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { useSettings } from "@/hooks/useSettings";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { BackToTop } from "@/components/dashboard/BackToTop";
import { navTitleFor } from "@/lib/dashboardNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { authStatus, authLoading, logout } = useDashboardAuth();
  const { barName } = useSettings();
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && authStatus && !authStatus.isAuthenticated) {
      setLocation("/dashboard-login");
    }
  }, [authStatus, authLoading, setLocation]);

  // Mark the document as "dashboard" so the phone-only CSS (tab bar offset,
  // 44px controls, toast position) applies, including to portalled sheets
  // and dialogs, and is gone again on guest pages.
  useEffect(() => {
    document.documentElement.setAttribute("data-dashboard", "");
    return () => document.documentElement.removeAttribute("data-dashboard");
  }, []);

  // Show loading only while initial auth check is in progress
  if (authLoading) {
    return null; // Return null instead of spinner for cleaner redirect
  }

  // Don't render content if not authenticated (redirect will handle it)
  if (!authStatus?.isAuthenticated) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const pageTitle = navTitleFor(location) ?? barName;

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex w-full min-h-dvh flex-1">
        <AppSidebar onLogout={logout} />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <header
            data-sticky-top
            className="sticky top-0 z-30 flex h-[var(--dash-header-h)] items-center justify-between gap-2 border-b border-brass/30 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/90"
          >
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="hidden md:inline-flex" />
              {/* Desktop: the bar's name. Phone: the page you're on, since the
                  tab bar already tells you which bar's dashboard this is. */}
              <h1 className="hidden md:block font-serif text-xl font-semibold text-foreground truncate" data-testid="text-dashboard-bar-name">
                {barName}
              </h1>
              <h1 className="md:hidden font-serif text-xl font-semibold text-foreground truncate" data-testid="text-mobile-page-title">
                {pageTitle}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="md:hidden max-w-[9rem] truncate smallcaps text-brass" aria-hidden>
                {barName}
              </span>
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-md:h-11 max-md:w-11 max-md:px-0"
                  aria-label="Guest home"
                  data-testid="button-back-home"
                >
                  <Home className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Home</span>
                </Button>
              </Link>
            </div>
          </header>

          <main className="flex-1 pb-[calc(var(--mobile-tabbar-h)+1.5rem)] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar barName={barName} onLogout={logout} />
      <BackToTop />
    </SidebarProvider>
  );
}
