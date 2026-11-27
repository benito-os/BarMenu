import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";
import { barLogoDataUrl } from "@/lib/barLogo";

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  show?: boolean;
}

const EXIT_MS = 300;

// Pure CSS animation (no animation library). prefers-reduced-motion is handled
// globally in index.css, which shortens every animation to ~0ms.
const SPLASH_CSS = `
@keyframes splash-fade-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes splash-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes splash-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
.splash-root { transition: opacity ${EXIT_MS}ms ease-out; }
.splash-root[data-leaving="true"] { opacity: 0; pointer-events: none; }
.splash-content { animation: splash-fade-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.splash-logo { animation: splash-rise 350ms ease-out 80ms both; }
.splash-text { animation: splash-rise 350ms ease-out 160ms both; }
.splash-dot { animation: splash-pulse 900ms ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .splash-content, .splash-logo, .splash-text, .splash-dot { animation: none !important; }
  .splash-root { transition: none; }
}
`;

export function SplashScreen({
  onComplete,
  duration = 900,
  show = true,
}: SplashScreenProps) {
  const { settings, barName } = useSettings();
  // "visible" -> "leaving" (fade out) -> "gone" (unmounted)
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">(show ? "visible" : "gone");

  const logoImage = settings.brandingLogoUrl || barLogoDataUrl(barName);
  const welcomeMessage = settings.welcomeMessage || `Welcome to ${barName}`;

  const dismiss = useCallback(() => {
    setPhase((p) => (p === "visible" ? "leaving" : p));
  }, []);

  useEffect(() => {
    if (!show) {
      setPhase("gone");
      return;
    }
    setPhase("visible");
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [show, duration, dismiss]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(() => {
      setPhase("gone");
      onComplete?.();
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  if (phase === "gone") return null;

  return (
    <div
      className="splash-root fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black cursor-pointer"
      data-leaving={phase === "leaving"}
      data-testid="splash-screen"
      role="presentation"
      onClick={dismiss}
    >
      <style>{SPLASH_CSS}</style>
      <div className="splash-content flex flex-col items-center gap-6">
        <div className="splash-logo w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
          <img
            src={logoImage}
            alt={barName}
            width={512}
            height={512}
            className="w-full h-full object-contain"
            data-testid="splash-logo"
          />
        </div>

        <div className="splash-text text-center space-y-3">
          <h1
            className="font-headline text-3xl md:text-4xl font-bold text-primary"
            data-testid="splash-title"
          >
            {barName}
          </h1>
          {welcomeMessage && (
            <p
              className="font-body text-lg max-w-sm px-4 text-primary/80"
              data-testid="splash-message"
            >
              {welcomeMessage}
            </p>
          )}
        </div>

        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="splash-dot w-2 h-2 rounded-full bg-primary"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasShownOnce, setHasShownOnce] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("bar_flores_splash_seen");
    if (hasSeenSplash) {
      setShowSplash(false);
      setHasShownOnce(true);
    }
  }, []);

  const dismissSplash = () => {
    setShowSplash(false);
    setHasShownOnce(true);
    sessionStorage.setItem("bar_flores_splash_seen", "true");
  };

  const triggerSplash = () => {
    setShowSplash(true);
  };

  return {
    showSplash,
    hasShownOnce,
    dismissSplash,
    triggerSplash,
  };
}
