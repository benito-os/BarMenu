import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Settings, InsertSettings } from "@shared/schema";

export function useSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<InsertSettings>) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const defaultSettings: Settings = {
    id: "default",
    waitingWarningMinutes: 3,
    waitingUrgentMinutes: 5,
    brandingLogoUrl: null,
    welcomeMessage: null,
    headlineFont: "playfair",
    bodyFont: "inter",
    qrDotStyle: "dots",
    qrEyeStyle: "rounded",
    updatedAt: new Date(),
  };

  return {
    settings: settings ?? defaultSettings,
    settingsLoading,
    updateSettings: updateSettingsMutation.mutate,
    updateSettingsPending: updateSettingsMutation.isPending,
  };
}
