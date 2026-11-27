import { LogOut } from "lucide-react";
import { DASHBOARD_NAV } from "@/lib/dashboardNav";
import { useSettings } from "@/hooks/useSettings";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = DASHBOARD_NAV;

interface AppSidebarProps {
  activeSection?: string;
  mainTab?: string;
  onSectionChange?: (section: string) => void;
  onTabChange?: (tab: string) => void;
  onLogout: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  const { barName } = useSettings();

  const isItemActive = (path: string) => {
    if (path === "/dashboard") {
      return location === "/dashboard";
    }
    return location.startsWith(path);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-auto px-3 pb-5 pt-6 font-serif text-xl font-semibold leading-tight text-sidebar-foreground">
            {barName}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Link href={item.path}>
                    <SidebarMenuButton
                      isActive={isItemActive(item.path)}
                      data-testid={item.testId}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
