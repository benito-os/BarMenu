import { LayoutDashboard, BarChart3, Menu as MenuIcon, Wine, QrCode, Settings, LogOut } from "lucide-react";
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
    href: "/dashboard",
    testId: "sidebar-queue",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    testId: "sidebar-analytics",
  },
  {
    title: "Menus",
    icon: MenuIcon,
    href: "/dashboard/menus",
    testId: "sidebar-menus",
  },
  {
    title: "Drinks",
    icon: Wine,
    href: "/dashboard/drinks",
    testId: "sidebar-drinks",
  },
  {
    title: "QR Codes",
    icon: QrCode,
    href: "/dashboard/qr-codes",
    testId: "sidebar-qr-codes",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    testId: "sidebar-settings",
  },
];

interface AppSidebarProps {
  onLogout: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const [location] = useLocation();

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
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    data-testid={item.testId}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
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
