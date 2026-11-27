import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_BAR_NAME, type Settings, type InsertSettings } from "@shared/schema";

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
    barName: null,
    brandingLogoUrl: null,
    welcomeMessage: null,
    headlineFont: "playfair",
    bodyFont: "inter",
    qrDotStyle: "dots",
    qrEyeStyle: "rounded",
    orderRateLimitPerHour: 10,
    updatedAt: new Date(),
  };

  const resolved = settings ?? defaultSettings;

  return {
    settings: resolved,
    // The name to display: the owner's, or the default until they set one.
    barName: resolved.barName?.trim() || DEFAULT_BAR_NAME,
    settingsLoading,
    updateSettings: updateSettingsMutation.mutate,
    updateSettingsPending: updateSettingsMutation.isPending,
  };
}
