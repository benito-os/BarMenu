import { LayoutDashboard, BarChart3, Menu as MenuIcon, Wine, QrCode, Settings, LogOut } from "lucide-react";
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
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Live Queue",
    icon: LayoutDashboard,
    value: "queue",
    testId: "sidebar-queue",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    value: "analytics",
    testId: "sidebar-analytics",
  },
  {
    title: "Menus",
    icon: MenuIcon,
    value: "menus",
    testId: "sidebar-menus",
  },
  {
    title: "Drinks",
    icon: Wine,
    value: "drinks",
    testId: "sidebar-drinks",
  },
  {
    title: "QR Codes",
    icon: QrCode,
    value: "qr-codes",
    testId: "sidebar-qr-codes",
  },
  {
    title: "Settings",
    icon: Settings,
    value: "settings",
    testId: "sidebar-settings",
  },
];

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

export function AppSidebar({ activeSection, onSectionChange, onLogout }: AppSidebarProps) {
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
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.value)}
                    isActive={activeSection === item.value}
                    data-testid={item.testId}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
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
