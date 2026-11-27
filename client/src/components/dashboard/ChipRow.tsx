import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { stickyTopOffset } from "@/lib/scroll";

export type Chip = {
  id: string;
  label: string;
  count?: number;
  /** Optional colour dot (menu accent, status tone). */
  dot?: string | null;
};

/**
 * Horizontally scrollable row of pill chips. Each chip has a 44px tap target
 * with a smaller visual pill. Used for jump links (sections, categories,
 * letters) and for single-choice filters (menus).
 */
export function ChipRow({
  items,
  activeId,
  onSelect,
  ariaLabel,
  testIdPrefix,
  className,
}: {
  items: Chip[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  ariaLabel: string;
  testIdPrefix?: string;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the active chip visible when the active id changes (scroll spy).
  useEffect(() => {
    if (!activeId || !rowRef.current) return;
    const el = rowRef.current.querySelector<HTMLElement>(`[data-chip-id="${CSS.escape(activeId)}"]`);
    if (!el) return;
    const row = rowRef.current;
    const left = el.offsetLeft - row.clientWidth / 2 + el.offsetWidth / 2;
    row.scrollTo({ left: Math.max(0, left) });
  }, [activeId]);

  return (
    <div
      ref={rowRef}
      role="toolbar"
      aria-label={ariaLabel}
      className={cn("flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1", className)}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            data-chip-id={item.id}
            data-testid={testIdPrefix ? `${testIdPrefix}-${item.id}` : undefined}
            aria-pressed={active}
            onClick={() => onSelect(item.id)}
            className="group shrink-0 min-h-11 flex items-center focus-visible:outline-none"
          >
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap transition-colors",
                "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-1",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-wash text-foreground group-hover:bg-wash-strong",
              )}
            >
              {item.dot && (
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full ring-1 ring-ink/10"
                  style={{ backgroundColor: item.dot }}
                />
              )}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "tabular-nums text-xs",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sticky block pinned under the dashboard header. Put search and chip rows
 * in it. Registers itself for scroll-offset maths via data-sticky-top.
 */
export function StickyToolbar({
  children,
  className,
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-sticky-top
      data-testid={testId}
      className={cn(
        "sticky top-[var(--dash-header-h)] z-20 -mx-4 px-4 md:-mx-6 md:px-6",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 edge-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Tracks which anchor is currently at the top of the viewport (below the
 * sticky bars). Returns its id, or the first id before any is reached.
 */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join("|");
  useEffect(() => {
    if (ids.length === 0) {
      setActive(null);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = stickyTopOffset() + 16;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 0) current = id;
        else break;
      }
      // At the very bottom, the last short group can never reach the top.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = ids[ids.length - 1];
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Content that loads (or expands) after mount changes the page height
    // without a scroll event; re-check then too.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
    ro?.observe(document.body);
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}
