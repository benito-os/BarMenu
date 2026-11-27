import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplyBrandSettings } from "@/hooks/useApplyBrandSettings";

// Eager-load the public/guest pages — they're the highest-traffic entry points
// and frequently hit from QR-code scans where extra round-trips hurt most.
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import MenuDetail from "@/pages/menu-detail";
import About from "@/pages/about";
import DashboardLogin from "@/pages/dashboard-login";

// Lazy-load the dashboard pages so guests never download admin code.
// Vite splits each into its own chunk.
const QueuePage = lazy(() => import("@/pages/dashboard/index"));
const AnalyticsPage = lazy(() => import("@/pages/dashboard/analytics"));
const MenusPage = lazy(() => import("@/pages/dashboard/menus"));
const DrinksPage = lazy(() => import("@/pages/dashboard/drinks"));
const RecipesPage = lazy(() => import("@/pages/dashboard/recipes"));
const InventoryPage = lazy(() => import("@/pages/dashboard/inventory"));
const QRCodesPage = lazy(() => import("@/pages/dashboard/qr-codes"));
const SettingsPage = lazy(() => import("@/pages/dashboard/settings"));
const ImportExportPage = lazy(() => import("@/pages/dashboard/import-export"));

function RouteFallback() {
  return (
    <div className="p-4 md:p-6 space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/menu/:slug" component={MenuDetail} />
        <Route path="/about" component={About} />
        <Route path="/dashboard-login" component={DashboardLogin} />
        <Route path="/dashboard/analytics" component={AnalyticsPage} />
        <Route path="/dashboard/menus" component={MenusPage} />
        <Route path="/dashboard/drinks" component={DrinksPage} />
        <Route path="/dashboard/recipes" component={RecipesPage} />
        <Route path="/dashboard/inventory" component={InventoryPage} />
        <Route path="/dashboard/qr-codes" component={QRCodesPage} />
        <Route path="/dashboard/settings" component={SettingsPage} />
        <Route path="/dashboard/import-export" component={ImportExportPage} />
        <Route path="/dashboard" component={QueuePage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Inner component so useApplyBrandSettings runs INSIDE the QueryClientProvider
// (it consumes useSettings, which needs the query client in context).
function BrandedApp() {
  useApplyBrandSettings();
  return (
    <TooltipProvider>
      <Toaster />
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandedApp />
    </QueryClientProvider>
  );
}

export default App;
