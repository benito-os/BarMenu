import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Drink } from "@shared/validation";

export function useDrinks(menuId?: string, enabled = true) {
  const { toast } = useToast();

  const { data: allDrinks, isLoading: allDrinksLoading } = useQuery<Drink[]>({
    queryKey: ["/api/drinks/all", menuId],
    queryFn: async () => {
      if (!menuId) return [];
      const response = await apiRequest("GET", `/api/drinks/all?menuId=${menuId}`);
      if (!response.ok) throw new Error("Failed to fetch drinks");
      return response.json();
    },
    enabled: enabled && !!menuId,
  });

  const createDrinkMutation = useMutation({
    mutationFn: async (drinkData: any) => {
      const payload = {
        ...drinkData,
        sortOrder: Number(drinkData.sortOrder) || 0,
      };
      return apiRequest("POST", "/api/drinks", payload);
    },
    onSuccess: (_data, variables) => {
      const mId = variables.menuId || menuId;
      if (mId) {
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", mId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all"] });
      }
      toast({
        title: "Drink Created",
        description: "New drink has been added to the menu",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create drink",
        variant: "destructive",
      });
    },
  });

  const updateDrinkMutation = useMutation({
    mutationFn: async (drink: Drink) => {
      const { id, menuId: dMenuId, name, section, description, recipe, style, temperature, 
              isMocktail, canBeMocktail, isStirred, isShaken, baseSpirit, isActive, sortOrder } = drink;
      const updateData = { menuId: dMenuId, name, section, description, recipe, style, temperature, 
                          isMocktail, canBeMocktail, isStirred, isShaken, baseSpirit, isActive, sortOrder };
      return apiRequest("PATCH", `/api/drinks/${id}`, updateData);
    },
    onSuccess: (_data, drink) => {
      const mId = drink.menuId || menuId;
      if (mId) {
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", mId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all"] });
      }
      toast({
        title: "Drink Updated",
        description: "Drink has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update drink",
        variant: "destructive",
      });
    },
  });

  const reorderDrinksMutation = useMutation({
    mutationFn: async (drinks: Array<{ id: string; sortOrder: number }>) => {
      return await apiRequest("PATCH", "/api/drinks/reorder", { drinks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", menuId] });
      toast({
        title: "Drinks reordered",
        description: "Drink order has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to reorder drinks: ${error.message}`,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", menuId] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (drinkIds: string[]) => {
      return await apiRequest("DELETE", "/api/drinks/bulk", { drinkIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", menuId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Drinks deleted",
        description: "Selected drinks have been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete drinks",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ drinkIds, isActive }: { drinkIds: string[]; isActive: boolean }) => {
      return await apiRequest("PATCH", "/api/drinks/bulk", { drinkIds, isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks/all", menuId] });
      toast({
        title: "Drinks updated",
        description: "Selected drinks have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update drinks",
        variant: "destructive",
      });
    },
  });

  return {
    drinks: allDrinks || [],
    drinksLoading: allDrinksLoading,
    createDrink: createDrinkMutation.mutate,
    createDrinkPending: createDrinkMutation.isPending,
    updateDrink: updateDrinkMutation.mutate,
    updateDrinkPending: updateDrinkMutation.isPending,
    reorderDrinks: reorderDrinksMutation.mutate,
    reorderPending: reorderDrinksMutation.isPending,
    bulkDelete: bulkDeleteMutation.mutate,
    bulkDeletePending: bulkDeleteMutation.isPending,
    bulkUpdate: bulkUpdateMutation.mutate,
    bulkUpdatePending: bulkUpdateMutation.isPending,
  };
}
