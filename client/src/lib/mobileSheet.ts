/**
 * Extra classes for a Radix DialogContent that turn the centred dialog into a
 * bottom sheet on phones (below md): pinned to the bottom edge, full width,
 * scrolls inside, slides up, clears the home indicator. Desktop is unchanged.
 */
export const MOBILE_SHEET_DIALOG = [
  "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0",
  "max-md:translate-x-0 max-md:translate-y-0 max-md:max-w-none",
  "max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0",
  "max-md:max-h-[92dvh] max-md:overflow-y-auto max-md:px-4 max-md:pt-5",
  "max-md:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]",
  "max-md:data-[state=open]:slide-in-from-bottom-full max-md:data-[state=closed]:slide-out-to-bottom-full",
  "max-md:data-[state=open]:slide-in-from-left-0 max-md:data-[state=closed]:slide-out-to-left-0",
  "max-md:data-[state=open]:zoom-in-100 max-md:data-[state=closed]:zoom-out-100",
].join(" ");
