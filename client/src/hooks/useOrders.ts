import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OrderWithDrink } from "@shared/validation";

export function useOrders(enabled = true) {
  const { toast } = useToast();

  const { data: queue, isLoading: queueLoading } = useQuery<OrderWithDrink[]>({
    queryKey: ["/api/orders/queue"],
    refetchInterval: 5000,
    enabled,
  });

  const inProgressMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("PATCH", `/api/orders/${orderId}`, { status: "in_progress" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      toast({
        title: "Order Updated",
        description: "Drink is now being prepared",
      });
    },
  });

  const serveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("PATCH", `/api/orders/${orderId}`, { status: "served" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Order Completed",
        description: "Drink marked as served",
      });
    },
  });

  return {
    queue: queue || [],
    queueLoading,
    markInProgress: inProgressMutation.mutate,
    markServed: serveMutation.mutate,
    inProgressPending: inProgressMutation.isPending,
    servedPending: serveMutation.isPending,
  };
}
