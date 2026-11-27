import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { FONT_PRESETS, DEFAULT_BAR_NAME } from "@shared/schema";

/** Families already loaded by client/index.html. */
const DEFAULT_FAMILIES = new Set(["inter", "playfair display"]);
const WEIGHTS = "400;500;600;700";

/** Pull the first family name out of a CSS font-family value or preset family string. */
function primaryFamily(value: string): string {
  return value.split(",")[0].replace(/['"]/g, "").trim();
}

/**
 * Make sure a Google Font is loaded. Accepts a FONT_PRESETS id ("lora"), a
 * preset family ("'Lora', serif") or a free-form value ("Lora, serif", as stored
 * in a menu's `typography`). Defaults and unknown families are no-ops. Injects
 * at most one <link> per family.
 */
export function ensureFontLoaded(presetIdOrFamily: string | null | undefined): void {
  if (!presetIdOrFamily || typeof document === "undefined") return;
  const all = [...FONT_PRESETS.headline, ...FONT_PRESETS.body];
  const preset = all.find((p) => p.id === presetIdOrFamily);
  const family = preset ? primaryFamily(preset.family) : primaryFamily(presetIdOrFamily);
  const known = all.some((p) => primaryFamily(p.family).toLowerCase() === family.toLowerCase());
  if (!family || !known || DEFAULT_FAMILIES.has(family.toLowerCase())) return;

  const id = `font-${family.toLowerCase().replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${WEIGHTS}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Mirror the admin Settings page's headlineFont / bodyFont selections into
 * CSS variables on <html> so the .font-headline / .font-body utility classes
 * (defined in index.css) actually pick up the chosen presets.
 *
 * Mounted once near the root of App. Restores defaults on unmount so any
 * mid-session reset (e.g., the user clears the field) reverts immediately.
 */
export function useApplyBrandSettings(): void {
  const { settings, barName } = useSettings();

  // The static <title> in index.html says "Bar Flores"; follow the setting
  // once it is known. Only the leading name is swapped, so the rest of the
  // title stays as authored.
  useEffect(() => {
    if (document.title.startsWith(DEFAULT_BAR_NAME) && barName !== DEFAULT_BAR_NAME) {
      document.title = barName + document.title.slice(DEFAULT_BAR_NAME.length);
    }
  }, [barName]);

  useEffect(() => {
    const root = document.documentElement;

    const headline = FONT_PRESETS.headline.find((p) => p.id === settings.headlineFont);
    const body = FONT_PRESETS.body.find((p) => p.id === settings.bodyFont);

    ensureFontLoaded(headline?.id);
    ensureFontLoaded(body?.id);

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
