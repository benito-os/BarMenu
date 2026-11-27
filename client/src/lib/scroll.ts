/** Smooth unless the user asked the OS for reduced motion. */
export function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  } catch {
    return "auto";
  }
}

/**
 * Height of everything pinned to the top of the viewport (the dashboard
 * header plus any sticky chip bar). Elements opt in with `data-sticky-top`.
 */
export function stickyTopOffset(): number {
  let max = 0;
  document.querySelectorAll<HTMLElement>("[data-sticky-top]").forEach((el) => {
    if (el.offsetHeight === 0) return; // hidden at this breakpoint
    // Where it will sit once stuck, not where it is now.
    const top = parseFloat(getComputedStyle(el).top) || 0;
    max = Math.max(max, top + el.offsetHeight);
  });
  return max;
}

/** Scroll the page so the element with this id sits just below the sticky bars. */
export function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - stickyTopOffset() - 8;
  window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

/** Turn any label into a safe DOM id fragment. */
export function anchorId(prefix: string, label: string): string {
  return `${prefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x"}`;
}
