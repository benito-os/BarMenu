import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import MenuDetail from "@/pages/menu-detail";
import Dashboard from "@/pages/dashboard";
import DashboardLogin from "@/pages/dashboard-login";
import AnalyticsPage from "@/pages/dashboard/analytics";
import MenusPage from "@/pages/dashboard/menus";
import DrinksPage from "@/pages/dashboard/drinks";
import InventoryPage from "@/pages/dashboard/inventory";
import QRCodesPage from "@/pages/dashboard/qr-codes";
import SettingsPage from "@/pages/dashboard/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/menu/:slug" component={MenuDetail} />
      <Route path="/dashboard-login" component={DashboardLogin} />
      <Route path="/dashboard/analytics" component={AnalyticsPage} />
      <Route path="/dashboard/menus" component={MenusPage} />
      <Route path="/dashboard/drinks" component={DrinksPage} />
      <Route path="/dashboard/inventory" component={InventoryPage} />
      <Route path="/dashboard/qr-codes" component={QRCodesPage} />
      <Route path="/dashboard/qr" component={QRCodesPage} />
      <Route path="/dashboard/settings" component={SettingsPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
