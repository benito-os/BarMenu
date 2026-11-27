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
    <div role="toolbar" aria-label={ariaLabel} className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
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
              // Soft tablets, no outlines or grid lines. Selected = deeper
              // wash, ink label and a short brass underline.
              "relative min-h-14 rounded-xl px-3 py-1.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "bg-wash-strong" : "bg-wash/60 hover:bg-wash",
            )}
          >
            <span className="block font-serif text-xl font-bold leading-tight tabular-nums lining-nums">{tile.value}</span>
            <span className={cn("flex items-center gap-1.5 text-xs", active ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
              <span aria-hidden className={cn("h-2 w-2 rounded-full", TONE_DOT[tile.tone ?? "default"])} />
              {tile.label}
            </span>
            {active && (
              <span aria-hidden className="absolute bottom-1 left-3 h-[3px] w-5 rounded-full bg-brass" />
            )}
          </button>
        );
      })}
    </div>
  );
}
