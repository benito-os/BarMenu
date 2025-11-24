import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, ChefHat, X } from "lucide-react";
import { getTrackedOrders, removeTrackedOrder } from "@/lib/orderCookies";
import { useState, useEffect } from "react";

interface Order {
  id: string;
  drinkId: string;
  guestName: string | null;
  comments: string | null;
  asMocktail: boolean;
  status: "requested" | "in_progress" | "served" | "cancelled";
  requestedAt: string;
}

export function OrderStatusBanner() {
  const [trackedOrderIds, setTrackedOrderIds] = useState<string[]>([]);

  // Load tracked orders from cookies on mount
  useEffect(() => {
    const orders = getTrackedOrders();
    setTrackedOrderIds(orders.map(o => o.orderId));
  }, []);

  // Query to fetch order details
  const { data: orders, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders/status", trackedOrderIds],
    enabled: trackedOrderIds.length > 0,
    refetchInterval: 5000, // Refetch every 5 seconds to check for status updates
    queryFn: async () => {
      if (trackedOrderIds.length === 0) return [];
      
      // Fetch each order's status
      const promises = trackedOrderIds.map(async (orderId) => {
        try {
          const response = await fetch(`/api/orders/${orderId}`);
          if (!response.ok) {
            // If order not found (404), remove it from tracked orders
            if (response.status === 404) {
              removeTrackedOrder(orderId);
              return null;
            }
            throw new Error("Failed to fetch order");
          }
          return response.json();
        } catch (error) {
          console.error(`Error fetching order ${orderId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((order): order is Order => order !== null);
    },
  });

  // Filter out completed/cancelled orders and update tracked list
  const activeOrders = orders?.filter(order => 
    order.status !== "served" && order.status !== "cancelled"
  ) || [];

  // Update tracked orders when orders become served/cancelled
  useEffect(() => {
    if (orders) {
      const servedOrCancelled = orders.filter(
        order => order.status === "served" || order.status === "cancelled"
      );
      
      servedOrCancelled.forEach(order => {
        removeTrackedOrder(order.id);
      });

      // Update local state to reflect removed orders
      const remainingIds = orders
        .filter(order => order.status !== "served" && order.status !== "cancelled")
        .map(order => order.id);
      
      if (remainingIds.length !== trackedOrderIds.length) {
        setTrackedOrderIds(remainingIds);
      }
    }
  }, [orders, trackedOrderIds.length]);

  if (activeOrders.length === 0) {
    return null;
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "requested":
        return {
          icon: Clock,
          label: "Requested",
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
        };
      case "in_progress":
        return {
          icon: ChefHat,
          label: "In Progress",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950",
        };
      default:
        return {
          icon: Clock,
          label: "Pending",
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-950",
        };
    }
  };

  return (
    <div className="mb-8" data-testid="order-status-banner">
      <Card className="border-primary/20 bg-primary/5">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Your Active Orders
            </h3>
            <Badge variant="secondary" data-testid="order-count-badge">
              {activeOrders.length} {activeOrders.length === 1 ? "order" : "orders"}
            </Badge>
          </div>

          <div className="space-y-3">
            {activeOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              const trackedOrder = getTrackedOrders().find(o => o.orderId === order.id);

              return (
                <div
                  key={order.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${statusInfo.bgColor}`}
                  data-testid={`order-item-${order.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {trackedOrder?.drinkName || "Your Drink"}
                      </p>
                      {order.guestName && (
                        <p className="text-sm text-muted-foreground">
                          For: {order.guestName}
                        </p>
                      )}
                      {order.asMocktail && (
                        <p className="text-sm text-muted-foreground">
                          ✨ Mocktail version
                        </p>
                      )}
                      {order.comments && (
                        <p className="text-sm text-muted-foreground italic">
                          Note: {order.comments}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge 
                    variant="outline" 
                    className={statusInfo.color}
                    data-testid={`order-status-${order.id}`}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Order status updates automatically. Completed orders will be removed from this list.
          </p>
        </div>
      </Card>
    </div>
  );
}
