import { cn } from "@/lib/utils";

export type StatTile = {
  id: string;
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "destructive" | "success" | "info";
  testId?: string;
};

const TONE_DOT: Record<NonNullable<StatTile["tone"]>, string> = {
  default: "bg-brass-bright",
  warning: "bg-warning",
  destructive: "bg-destructive",
  success: "bg-success",
  info: "bg-info",
};

/**
 * One compact row of tappable summary tiles that double as filters. Replaces
 * stacks of full-width stat cards on phones: a whole row costs ~64px instead
 * of ~900px, and tapping "Low 6" shows the six low items.
 */
export function StatTiles({
  tiles,
  activeId,
  onSelect,
  ariaLabel,
  className,
}: {
  tiles: StatTile[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="toolbar" aria-label={ariaLabel} className={cn("grid divide-x divide-border border-y border-border", className)} style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
      {tiles.map((tile) => {
        const active = tile.id === activeId;
        return (
          <button
            key={tile.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(tile.id)}
            data-testid={tile.testId}
            className={cn(
              "min-h-14 px-2.5 py-1.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active
                ? "bg-secondary shadow-[inset_0_-3px_0_hsl(var(--brass))]"
                : "hover:bg-secondary/60",
            )}
          >
            <span className="block font-serif text-xl font-bold leading-tight tabular-nums lining-nums">{tile.value}</span>
            <span className={cn("flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em]", active ? "text-foreground" : "text-muted-foreground")}>
              <span aria-hidden className={cn("h-2 w-2 rotate-45", TONE_DOT[tile.tone ?? "default"])} />
              {tile.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
