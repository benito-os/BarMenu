import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMenus } from "@/hooks/useMenus";
import { useIngredients } from "@/hooks/useIngredients";
import { apiRequest } from "@/lib/queryClient";
import { splitRecipe } from "@/lib/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search } from "lucide-react";
import { ChipRow, StickyToolbar, useScrollSpy } from "@/components/dashboard/ChipRow";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useIsMobile } from "@/hooks/use-mobile";
import { scrollToAnchor } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import type { DrinkAvailability } from "@shared/validation";

const ALL_MENUS = "__all__";

const TEMPERATURE_LABELS: Record<string, string> = {
  hot: "Hot",
  cold: "Cold",
  room_temp: "Room Temp",
};

type RecipeEntry = {
  key: string;
  drink: DrinkAvailability;
  menuNames: string[];
  ingredientNames: string[];
};

/**
 * Read-only recipe book. Pulls every drink from every menu (including
 * inactive ones) so the bartender has one place to look up how something
 * is made. Drinks copied between menus (seasonal duplication) collapse into
 * a single card listing every menu they appear on.
 */
export default function RecipesPage() {
  const { menus, menusLoading } = useMenus(true);
  const { ingredients } = useIngredients();
  const [search, setSearch] = useState("");
  // Remembered per browser: the owner usually works from one menu.
  const [makeableOnly, setMakeableOnly] = usePersistentState("barflores.recipes.makeable", false);
  const [storedMenuId, setSelectedMenuId] = usePersistentState<string>("barflores.recipes.menu", ALL_MENUS);
  // A remembered menu that has since been deleted falls back to "All".
  const selectedMenuId =
    storedMenuId === ALL_MENUS || menus.some((m) => m.id === storedMenuId) || menusLoading ? storedMenuId : ALL_MENUS;

  // Same query key as useDrinks so the cache is shared with the Drinks page.
  const drinkQueries = useQueries({
    queries: menus.map((menu) => ({
      queryKey: ["/api/drinks/all", menu.id],
      queryFn: async (): Promise<DrinkAvailability[]> => {
        const response = await apiRequest("GET", `/api/drinks/all?menuId=${menu.id}`);
        return response.json();
      },
    })),
  });
  const drinksLoading = menusLoading || drinkQueries.some((q) => q.isLoading);

  const ingredientNameById = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i.name])),
    [ingredients],
  );

  const entries = useMemo(() => {
    const byKey = new Map<string, RecipeEntry>();
    menus.forEach((menu, idx) => {
      if (selectedMenuId !== ALL_MENUS && menu.id !== selectedMenuId) return;
      const drinks = drinkQueries[idx]?.data ?? [];
      for (const drink of drinks) {
        const key = `${drink.name.trim().toLowerCase()}|${(drink.recipe ?? "").trim()}`;
        const existing = byKey.get(key);
        if (existing) {
          if (!existing.menuNames.includes(menu.name)) existing.menuNames.push(menu.name);
          continue;
        }
        byKey.set(key, {
          key,
          drink,
          menuNames: [menu.name],
          ingredientNames: drink.ingredientIds
            .map((id) => ingredientNameById.get(id))
            .filter((n): n is string => !!n),
        });
      }
    });
    return Array.from(byKey.values()).sort((a, b) => a.drink.name.localeCompare(b.drink.name));
  }, [menus, drinkQueries, selectedMenuId, ingredientNameById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(({ drink, ingredientNames }) => {
      if (makeableOnly && !drink.isMakeable) return false;
      if (!q) return true;
      return [drink.name, drink.recipe, drink.baseSpirit, drink.style, drink.section, ...ingredientNames]
        .some((field) => field?.toLowerCase().includes(q));
    });
  }, [entries, search, makeableOnly]);

  // Letter index for the phone jump row: first recipe of each initial.
  const letters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entry of filtered) {
      const ch = entry.drink.name.trim().charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(ch) ? ch : "#";
      if (!seen.has(letter)) seen.set(letter, `recipe-letter-${letter === "#" ? "num" : letter}`);
    }
    return Array.from(seen.entries()).map(([letter, id]) => ({ letter, id }));
  }, [filtered]);
  const activeLetter = useScrollSpy(letters.map((l) => l.id));
  const isMobile = useIsMobile();
  // One instance only (it carries a data-testid): in the phone filter row or
  // the desktop toolbar.
  const makeableSwitch = (
    <div className="flex shrink-0 items-center gap-2 min-h-11">
      <Switch
        id="recipes-makeable-only"
        checked={makeableOnly}
        onCheckedChange={setMakeableOnly}
        data-testid="switch-recipe-makeable"
      />
      <Label htmlFor="recipes-makeable-only" className="whitespace-nowrap max-md:text-sm">Can make now</Label>
    </div>
  );
  // With only a couple of matches (a search), open them straight away.
  const autoExpand = filtered.length <= 2;
  // Tracks which letters already got their anchor during this render.
  const seenLetters = new Set<string>();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-4">
        <div className="hidden md:block space-y-1">
          <h2 className="font-serif text-2xl font-semibold">Recipes</h2>
          <p className="text-sm text-muted-foreground">
            Read-only reference for every drink across all menus. Edit recipes on the Drinks page.
          </p>
        </div>

        {/* Phone: menu chips + "Can make now" on one line (filters you set
            once), then a pinned search + A-Z jump row (what you use while
            looking something up). Desktop keeps the original single row. */}
        <div className="md:hidden flex items-center gap-2 max-md:!mt-0">
          {isMobile && makeableSwitch}
          <ChipRow
            className="min-w-0 flex-1"
            ariaLabel="Filter by menu"
            testIdPrefix="chip-recipe-menu"
            activeId={selectedMenuId}
            onSelect={setSelectedMenuId}
            items={[
              { id: ALL_MENUS, label: "All menus" },
              ...menus.map((m) => ({ id: m.id, label: m.isActive ? m.name : `${m.name} (inactive)`, dot: m.accentColor })),
            ]}
          />
        </div>

        <StickyToolbar
          className="py-2 space-y-1 md:static md:mx-0 md:px-0 md:py-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:space-y-0"
          testId="recipes-toolbar"
        >
        <div className="flex flex-col sm:flex-row gap-3 max-md:gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, spirit, ingredient…"
              aria-label="Search recipes"
              className="pl-9"
              data-testid="input-recipe-search"
            />
          </div>
          <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
            <SelectTrigger className="hidden md:flex sm:w-64" data-testid="select-recipe-menu">
              <SelectValue placeholder="All menus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MENUS}>All menus</SelectItem>
              {menus.map((menu) => (
                <SelectItem key={menu.id} value={menu.id}>
                  {menu.name}
                  {!menu.isActive && " (inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isMobile && makeableSwitch}
        </div>
        {letters.length > 1 && (
          <ChipRow
            className="md:hidden"
            ariaLabel="Jump to letter"
            testIdPrefix="chip-recipe-letter"
            activeId={activeLetter}
            onSelect={scrollToAnchor}
            items={letters.map(({ letter, id }) => ({ id, label: letter }))}
          />
        )}
        </StickyToolbar>

        {drinksLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {entries.length === 0
                ? "No drinks yet."
                : makeableOnly
                  ? "Nothing matches that can be made right now. Turn off \"Can make now\" or restock ingredients."
                  : "No recipes match your search."}
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground" data-testid="text-recipe-count">
              {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
            </p>
            <div className="grid max-md:gap-0 max-md:border-t md:gap-x-8 md:gap-y-2 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((entry) => {
                const ch = entry.drink.name.trim().charAt(0).toUpperCase();
                const id = `recipe-letter-${/[A-Z]/.test(ch) ? ch : "num"}`;
                const isFirst = !seenLetters.has(id);
                if (isFirst) seenLetters.add(id);
                return (
                  <RecipeCard
                    key={entry.key}
                    entry={entry}
                    anchorId={isFirst ? id : undefined}
                    defaultOpen={autoExpand}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function RecipeCard({
  entry,
  anchorId,
  defaultOpen = false,
}: {
  entry: RecipeEntry;
  anchorId?: string;
  defaultOpen?: boolean;
}) {
  const { drink, menuNames, ingredientNames } = entry;
  const steps = drink.recipe ? splitRecipe(drink.recipe) : [];
  const temperature = drink.temperature ? TEMPERATURE_LABELS[drink.temperature] : null;
  // Phones show a compact row that opens on tap; desktop always shows the
  // full card (the toggle is inert there).
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  const cantMake = !drink.isMakeable && (drink.missingIngredients.length > 0 || drink.isOutOfStock);
  const bodyId = `recipe-body-${drink.id}`;

  return (
    <Card data-testid={`card-recipe-${drink.id}`} id={anchorId} className="max-md:border-0 max-md:border-b">
      <CardHeader className="pb-3 space-y-2 max-md:p-0 max-md:space-y-0">
        <button
          type="button"
          className="md:pointer-events-none flex w-full items-start gap-2 text-left max-md:min-h-14 max-md:px-3 max-md:py-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <div className="min-w-0 flex-1 space-y-1.5 max-md:space-y-1">
            <CardTitle className="font-serif text-xl max-md:text-[1.0625rem] max-md:leading-snug">{drink.name}</CardTitle>
            <div className="flex flex-wrap gap-1.5 max-md:gap-1">
              {cantMake && (
                <Badge variant="destructive" className="md:hidden text-[0.6875rem] px-1.5 py-0">
                  {drink.missingIngredients.length > 0 ? "Missing" : "86"}
                </Badge>
              )}
              {drink.baseSpirit && <Badge variant="secondary" className="max-md:text-[0.6875rem] max-md:px-1.5 max-md:py-0">{drink.baseSpirit}</Badge>}
              {drink.isShaken && <Badge variant="outline" className="max-md:text-[0.6875rem] max-md:px-1.5 max-md:py-0">Shaken</Badge>}
              {drink.isStirred && <Badge variant="outline" className="max-md:text-[0.6875rem] max-md:px-1.5 max-md:py-0">Stirred</Badge>}
              {temperature && <Badge variant="outline" className="max-md:hidden">{temperature}</Badge>}
              {drink.isMocktail && <Badge variant="outline" className="max-md:text-[0.6875rem] max-md:px-1.5 max-md:py-0">Mocktail</Badge>}
              {drink.canBeMocktail && !drink.isMocktail && <Badge variant="outline" className="max-md:hidden">Mocktail option</Badge>}
            </div>
          </div>
          <ChevronDown
            aria-hidden
            className={cn("md:hidden mt-1 h-5 w-5 shrink-0 text-brass transition-transform", open && "rotate-180")}
          />
        </button>
      </CardHeader>
      <CardContent id={bodyId} className={cn("space-y-3 text-sm max-md:px-3 max-md:pb-4 max-md:pt-3 max-md:border-t max-md:border-dashed max-md:bg-secondary/40", open ? "block" : "hidden md:block")}>
        {steps.length === 0 ? (
          <p className="text-muted-foreground italic">No recipe recorded.</p>
        ) : steps.length === 1 ? (
          <p className="leading-relaxed whitespace-pre-wrap max-md:text-[0.9375rem]">{steps[0]}</p>
        ) : (
          <ul className="leading-relaxed space-y-1 list-disc list-inside marker:text-brass max-md:text-[0.9375rem]">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        )}

        {ingredientNames.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Inventory: </span>
            {ingredientNames.join(", ")}
          </p>
        )}

        {cantMake && (
          <p className="text-xs text-destructive" data-testid={`text-missing-${drink.id}`}>
            {drink.missingIngredients.length > 0
              ? `Missing: ${drink.missingIngredients.join(", ")}`
              : "Marked out of stock"}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {menuNames.join(" · ")}
          {drink.section && ` — ${drink.section}`}
        </p>
      </CardContent>
    </Card>
  );
}
