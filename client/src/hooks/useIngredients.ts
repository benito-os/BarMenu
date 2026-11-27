import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ingredient } from "@shared/validation";

const INGREDIENTS_KEY = ["/api/ingredients"];
type UpdateIngredientVars = Partial<Ingredient> & { id: string; silent?: boolean };

// Module-level so the count is shared across hook instances.
let inFlightUpdates = 0;
let lastUpdateErrorToastAt = 0;

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
    mutationKey: ["ingredients", "update"],
    mutationFn: async ({ id, silent: _silent, ...data }: UpdateIngredientVars) => {
      // `silent` is client-only; the server schema is strict and rejects unknown keys.
      return apiRequest("PATCH", `/api/ingredients/${id}`, data);
    },
    onMutate: async ({ id, silent: _silent, ...patch }: UpdateIngredientVars) => {
      inFlightUpdates += 1;
      await queryClient.cancelQueries({ queryKey: INGREDIENTS_KEY });
      const previous = queryClient.getQueryData<Ingredient[]>(INGREDIENTS_KEY);
      queryClient.setQueryData<Ingredient[]>(INGREDIENTS_KEY, (old) =>
        old?.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      return { previous };
    },
    onSuccess: (_data, variables) => {
      if (variables.silent) return;
      toast({
        title: "Ingredient Updated",
        description: "Inventory has been updated",
      });
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(INGREDIENTS_KEY, context.previous);
      }
      // Rapid taps can fail together; show one toast, not one per tap.
      const now = Date.now();
      if (now - lastUpdateErrorToastAt > 3000) {
        lastUpdateErrorToastAt = now;
        toast({
          title: "Error",
          description: error.message || "Failed to update ingredient",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      inFlightUpdates = Math.max(0, inFlightUpdates - 1);
      // Only refetch once the last pending update lands, so a refetch does
      // not overwrite optimistic values of taps still in flight.
      if (inFlightUpdates === 0) {
        queryClient.invalidateQueries({ queryKey: INGREDIENTS_KEY });
        // Stock changes can flip drink availability and menu readiness.
        queryClient.invalidateQueries({ queryKey: ["/api/drinks/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/availability/active-menus"] });
      }
    },
  });

  const { mutate: mutateIngredient } = updateIngredientMutation;

  /**
   * Stepper helper: adds `delta` to the latest cached onHand (not a stale
   * render value), so rapid taps accumulate correctly. Silent: no success toast.
   */
  const adjustStock = (id: string, delta: number) => {
    const current = queryClient
      .getQueryData<Ingredient[]>(INGREDIENTS_KEY)
      ?.find((item) => item.id === id);
    if (!current) return;
    mutateIngredient({ id, onHand: Math.max(0, current.onHand + delta), silent: true });
  };

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
    adjustStock,
    updateIngredientPending: updateIngredientMutation.isPending,
    deleteIngredient: deleteIngredientMutation.mutate,
    deleteIngredientPending: deleteIngredientMutation.isPending,
  };
}
