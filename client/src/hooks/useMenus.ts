import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Menu, InsertMenu } from "@shared/validation";
import { useMemo } from "react";

export function useMenus(enabled = true) {
  const { toast } = useToast();

  const { data: menus, isLoading: menusLoading } = useQuery<Menu[]>({
    queryKey: ["/api/menus"],
    enabled,
  });

  const defaultMenu = useMemo(() => {
    if (!menus || menus.length === 0) return null;
    return menus.find(menu => menu.isActive) ?? menus[0];
  }, [menus]);

  const createMenuMutation = useMutation({
    mutationFn: async (menuData: InsertMenu) => {
      return apiRequest("POST", "/api/menus", menuData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu Created",
        description: "New menu has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create menu",
        variant: "destructive",
      });
    },
  });

  const toggleMenuMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/menus/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu Updated",
        description: "Menu status has been updated",
      });
    },
  });

  const updateMenuMutation = useMutation({
    mutationFn: async (menu: Menu) => {
      const { id, name, slug, description, isActive, heroImageUrl, backgroundColor, accentColor, sectionHeaderColor, menuTitleColor, typography, sections } = menu;
      const updateData = { name, slug, description, isActive, heroImageUrl, backgroundColor, accentColor, sectionHeaderColor, menuTitleColor, typography, sections };
      return apiRequest("PATCH", `/api/menus/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu Updated",
        description: "Menu has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu",
        variant: "destructive",
      });
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: string) => {
      return apiRequest("DELETE", `/api/menus/${menuId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu Deleted",
        description: "Menu has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete menu",
        variant: "destructive",
      });
    },
  });

  return {
    menus: menus || [],
    menusLoading,
    defaultMenu,
    createMenu: createMenuMutation.mutate,
    createMenuPending: createMenuMutation.isPending,
    toggleMenu: toggleMenuMutation.mutate,
    updateMenu: updateMenuMutation.mutate,
    updateMenuPending: updateMenuMutation.isPending,
    deleteMenu: deleteMenuMutation.mutate,
    deleteMenuPending: deleteMenuMutation.isPending,
  };
}
