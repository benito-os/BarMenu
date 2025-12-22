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

  const batchUpdateMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: string }) => {
      return apiRequest("POST", "/api/orders/batch", { orderIds, status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      if (variables.status === "served") {
        queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      }
      toast({
        title: "Orders Updated",
        description: `${variables.orderIds.length} orders marked as ${variables.status === "in_progress" ? "in progress" : "served"}`,
      });
    },
  });

  const clearServedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/orders/served");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      toast({
        title: "Queue Cleared",
        description: "All served orders have been removed",
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
    batchUpdate: batchUpdateMutation.mutate,
    batchUpdatePending: batchUpdateMutation.isPending,
    clearServed: clearServedMutation.mutate,
    clearServedPending: clearServedMutation.isPending,
  };
}
