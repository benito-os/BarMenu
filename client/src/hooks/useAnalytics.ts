import { useQuery } from "@tanstack/react-query";
import type { DrinkAnalytics } from "@shared/validation";

export function useAnalytics(enabled = true) {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<DrinkAnalytics[]>({
    queryKey: ["/api/analytics"],
    refetchInterval: 10000,
    enabled,
  });

  return {
    analytics: analytics || [],
    analyticsLoading,
  };
}
