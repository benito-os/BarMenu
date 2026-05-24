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

  // Load tracked orders from cookies on mount and when they change
  useEffect(() => {
    const loadOrders = () => {
      const orders = getTrackedOrders();
      setTrackedOrderIds(orders.map(o => o.orderId));
    };

    // Load on mount
    loadOrders();

    // Listen for order updates
    window.addEventListener('ordersUpdated', loadOrders);

    return () => {
      window.removeEventListener('ordersUpdated', loadOrders);
    };
  }, []);

  // Single batch fetch for all tracked orders. Replaces the previous
  // one-request-per-order pattern (10 orders => 10 requests every 5s).
  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders/by-ids", trackedOrderIds],
    enabled: trackedOrderIds.length > 0,
    refetchInterval: 5000,
    queryFn: async () => {
      if (trackedOrderIds.length === 0) return [];

      const response = await fetch(
        `/api/orders/by-ids?ids=${encodeURIComponent(trackedOrderIds.join(","))}`,
      );

      // Network failure or server error: keep all orders tracked, return empty.
      // The banner will fall through to the "loading" state for unmatched ids.
      if (!response.ok) {
        console.warn(`Batch order fetch returned ${response.status}, will retry`);
        return [];
      }

      const fetched: Order[] = await response.json();

      // Orders that were tracked but no longer exist server-side are 404-equivalent:
      // remove from cookies so we stop asking for them.
      const returnedIds = new Set(fetched.map((o) => o.id));
      for (const id of trackedOrderIds) {
        if (!returnedIds.has(id)) {
          removeTrackedOrder(id);
        }
      }

      return fetched;
    },
  });

  // Filter out completed/cancelled orders
  const activeOrders = orders?.filter(order => 
    order.status !== "served" && order.status !== "cancelled"
  ) || [];

  // Update tracked orders when orders become served/cancelled
  useEffect(() => {
    if (orders) {
      const servedOrCancelled = orders.filter(
        order => order.status === "served" || order.status === "cancelled"
      );
      
      // Remove completed orders from tracking
      servedOrCancelled.forEach(order => {
        removeTrackedOrder(order.id);
      });
    }
  }, [orders]);

  // Find orders that are tracked but couldn't be fetched (for error display)
  const fetchedOrderIds = new Set(orders?.map(o => o.id) || []);
  const failedToFetchIds = trackedOrderIds.filter(id => !fetchedOrderIds.has(id));

  // Don't show banner if no active orders and no failed fetches
  if (activeOrders.length === 0 && failedToFetchIds.length === 0) {
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

            {/* Show orders that failed to fetch (network issues) */}
            {failedToFetchIds.map((orderId) => {
              const trackedOrder = getTrackedOrders().find(o => o.orderId === orderId);
              return (
                <div
                  key={orderId}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950"
                  data-testid={`order-item-loading-${orderId}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Clock className="w-5 h-5 text-gray-400 animate-pulse" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {trackedOrder?.drinkName || "Your Drink"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status temporarily unavailable, retrying...
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
                    Loading
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
