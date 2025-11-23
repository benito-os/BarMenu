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
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authStatus?.isAuthenticated) {
      setLocation("/dashboard-login");
    }
  }, [authStatus, authLoading, setLocation]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!authStatus?.isAuthenticated) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider style={style as React.CSSProperties}>
        <AppSidebar onLogout={logout} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex-shrink-0 flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                Bar Flores Dashboard
              </h1>
            </div>
            <Link href="/">
              <Button 
                variant="outline" 
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
      </SidebarProvider>
    </div>
  );
}
