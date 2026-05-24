import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FONT_PRESETS } from "@shared/schema";

/**
 * Mirror the admin Settings page's headlineFont / bodyFont selections into
 * CSS variables on <html> so the .font-headline / .font-body utility classes
 * (defined in index.css) actually pick up the chosen presets.
 *
 * Mounted once near the root of App. Restores defaults on unmount so any
 * mid-session reset (e.g., the user clears the field) reverts immediately.
 */
export function useApplyBrandSettings(): void {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;

    const headline = FONT_PRESETS.headline.find((p) => p.id === settings.headlineFont);
    const body = FONT_PRESETS.body.find((p) => p.id === settings.bodyFont);

    if (headline) {
      root.style.setProperty("--font-headline", headline.family);
    } else {
      root.style.removeProperty("--font-headline");
    }

    if (body) {
      root.style.setProperty("--font-body", body.family);
    } else {
      root.style.removeProperty("--font-body");
    }

    return () => {
      root.style.removeProperty("--font-headline");
      root.style.removeProperty("--font-body");
    };
  }, [settings.headlineFont, settings.bodyFont]);
}
