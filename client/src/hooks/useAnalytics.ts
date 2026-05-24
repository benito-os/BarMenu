import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { DrinkAnalytics } from "@shared/validation";

export function useAnalytics(menuId?: string, enabled = true) {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<DrinkAnalytics[]>({
    queryKey: ["/api/analytics", menuId ?? "all"],
    refetchInterval: 10000,
    enabled,
    queryFn: async () => {
      const url = menuId
        ? `/api/analytics?menuId=${encodeURIComponent(menuId)}`
        : "/api/analytics";
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  return {
    analytics: analytics || [],
    analyticsLoading,
  };
}
