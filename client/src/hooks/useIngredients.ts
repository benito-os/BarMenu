import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ingredient } from "@shared/validation";

export function useIngredients() {
  const { toast } = useToast();

  const { data: ingredients, isLoading: ingredientsLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/ingredients"],
  });

  const createIngredientMutation = useMutation({
    mutationFn: async (data: Omit<Ingredient, "id" | "createdAt">) => {
      return apiRequest("POST", "/api/ingredients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
      toast({
        title: "Ingredient Created",
        description: "Ingredient has been added to inventory",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ingredient",
        variant: "destructive",
      });
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ingredient> & { id: string }) => {
      return apiRequest("PATCH", `/api/ingredients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
      toast({
        title: "Ingredient Updated",
        description: "Inventory has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ingredient",
        variant: "destructive",
      });
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ingredients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
      toast({
        title: "Ingredient Deleted",
        description: "Ingredient has been removed from inventory",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ingredient",
        variant: "destructive",
      });
    },
  });

  return {
    ingredients: ingredients || [],
    ingredientsLoading,
    createIngredient: createIngredientMutation.mutate,
    createIngredientPending: createIngredientMutation.isPending,
    updateIngredient: updateIngredientMutation.mutate,
    updateIngredientPending: updateIngredientMutation.isPending,
    deleteIngredient: deleteIngredientMutation.mutate,
    deleteIngredientPending: deleteIngredientMutation.isPending,
  };
}
