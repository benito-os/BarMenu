import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useDashboardAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ["/api/auth/check"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/dashboard-login");
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
    },
  });

  return {
    authStatus,
    authLoading,
    isAuthenticated: authStatus?.isAuthenticated || false,
    logout: () => logoutMutation.mutate(),
    logoutPending: logoutMutation.isPending,
  };
}
