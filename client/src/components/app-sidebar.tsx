import { LayoutDashboard, BarChart3, Menu as MenuIcon, Wine, QrCode, Settings, LogOut, Boxes } from "lucide-react";
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
    section: "queue",
    testId: "sidebar-queue",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    section: "analytics",
    testId: "sidebar-analytics",
  },
  {
    title: "Menus",
    icon: MenuIcon,
    section: "menus",
    testId: "sidebar-menus",
  },
  {
    title: "Drinks",
    icon: Wine,
    section: "drinks",
    testId: "sidebar-drinks",
  },
  {
    title: "Inventory",
    icon: Boxes,
    href: "/dashboard/inventory",
    testId: "sidebar-inventory",
  },
  {
    title: "QR Codes",
    icon: QrCode,
    section: "qr-codes",
    testId: "sidebar-qr-codes",
  },
  {
    title: "Settings",
    icon: Settings,
    section: "settings",
    testId: "sidebar-settings",
  },
];

interface AppSidebarProps {
  activeSection: string;
  mainTab: string;
  onSectionChange: (section: string) => void;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function AppSidebar({ activeSection, mainTab, onSectionChange, onTabChange, onLogout }: AppSidebarProps) {
  const handleItemClick = (section: string) => {
    if (section === "queue") {
      onTabChange("queue");
    } else {
      onTabChange("management");
      onSectionChange(section);
    }
  };

  const isItemActive = (section: string) => {
    if (section === "queue") {
      return mainTab === "queue";
    }
    return mainTab === "management" && activeSection === section;
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
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    isActive={isItemActive(item.section)}
                    onClick={() => handleItemClick(item.section)}
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
