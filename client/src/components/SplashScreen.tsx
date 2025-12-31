import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/hooks/useSettings";
import defaultLogo from "@assets/generated_images/elegant_bf_cocktail_bar_logo.png";

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  show?: boolean;
}

export function SplashScreen({ 
  onComplete, 
  duration = 2000,
  show = true 
}: SplashScreenProps) {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(show);

  const logoImage = settings.brandingLogoUrl || defaultLogo;
  const welcomeMessage = settings.welcomeMessage || "Welcome to Bar Flores";

  useEffect(() => {
    if (!show) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          data-testid="splash-screen"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.22, 1, 0.36, 1],
              delay: 0.1 
            }}
            className="flex flex-col items-center gap-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-card shadow-lg flex items-center justify-center p-4 border"
            >
              <img 
                src={logoImage} 
                alt="Bar Flores" 
                className="w-full h-full object-contain"
                data-testid="splash-logo"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center space-y-3"
            >
              <h1 
                className="text-3xl md:text-4xl font-serif font-bold text-foreground"
                data-testid="splash-title"
              >
                Bar Flores
              </h1>
              {welcomeMessage && (
                <p 
                  className="text-lg text-muted-foreground max-w-sm px-4"
                  data-testid="splash-message"
                >
                  {welcomeMessage}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
              className="flex gap-1"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
