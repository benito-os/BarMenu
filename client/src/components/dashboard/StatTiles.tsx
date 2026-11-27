import { cn } from "@/lib/utils";

export type StatTile = {
  id: string;
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "destructive" | "success" | "info";
  testId?: string;
};

const TONE_DOT: Record<NonNullable<StatTile["tone"]>, string> = {
  default: "bg-muted-foreground/40",
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
              "min-h-14 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "bg-card hover:bg-muted",
            )}
          >
            <span className="block text-lg font-semibold leading-tight tabular-nums">{tile.value}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tile.tone ?? "default"])} />
              {tile.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
