import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "@/lib/scroll";

/**
 * Phone-only "back to top" pill. Appears after about 1.5 screens of scroll,
 * sits above the tab bar on the left so it never fights a page's primary
 * action button on the right.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * 1.5);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      data-testid="button-back-to-top"
      className="md:hidden fixed left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-popover/95 text-brass shadow-md backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ bottom: "calc(var(--mobile-tabbar-h) + 0.75rem)" }}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </button>
  );
}
