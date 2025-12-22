import { LayoutDashboard, BarChart3, Menu as MenuIcon, Wine, QrCode, Settings, LogOut, Boxes, FileDown } from "lucide-react";
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

const menuItems = [
  {
    title: "Queue",
    icon: LayoutDashboard,
    path: "/dashboard",
    testId: "sidebar-queue",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    path: "/dashboard/analytics",
    testId: "sidebar-analytics",
  },
  {
    title: "Menus",
    icon: MenuIcon,
    path: "/dashboard/menus",
    testId: "sidebar-menus",
  },
  {
    title: "Drinks",
    icon: Wine,
    path: "/dashboard/drinks",
    testId: "sidebar-drinks",
  },
  {
    title: "Inventory",
    icon: Boxes,
    path: "/dashboard/inventory",
    testId: "sidebar-inventory",
  },
  {
    title: "QR Codes",
    icon: QrCode,
    path: "/dashboard/qr-codes",
    testId: "sidebar-qr-codes",
  },
  {
    title: "Import/Export",
    icon: FileDown,
    path: "/dashboard/import-export",
    testId: "sidebar-import-export",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/dashboard/settings",
    testId: "sidebar-settings",
  },
];

interface AppSidebarProps {
  activeSection?: string;
  mainTab?: string;
  onSectionChange?: (section: string) => void;
  onTabChange?: (tab: string) => void;
  onLogout: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const [location] = useLocation();

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
          <SidebarGroupLabel className="text-lg font-serif px-4 py-6">
            Bar Flores
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
