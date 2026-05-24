import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { authStatus, authLoading, logout } = useDashboardAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && authStatus && !authStatus.isAuthenticated) {
      setLocation("/dashboard-login");
    }
  }, [authStatus, authLoading, setLocation]);

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

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex w-full min-h-svh flex-1">
        <AppSidebar onLogout={logout} />
        <div className="flex flex-col flex-1 min-h-0">
          <header className="flex items-center justify-between px-4 py-2 border-b">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="font-serif text-lg md:text-xl font-semibold text-foreground">
                Bar Flores
              </h1>
            </div>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
