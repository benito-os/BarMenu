import { useMemo, useState } from "react";
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
import { Search } from "lucide-react";
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
  const [selectedMenuId, setSelectedMenuId] = useState<string>(ALL_MENUS);

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
    if (!q) return entries;
    return entries.filter(({ drink, ingredientNames }) =>
      [drink.name, drink.recipe, drink.baseSpirit, drink.style, drink.section, ...ingredientNames]
        .some((field) => field?.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold">Recipes</h2>
          <p className="text-sm text-muted-foreground">
            Read-only reference for every drink across all menus. Edit recipes on the Drinks page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, spirit, ingredient…"
              className="pl-9"
              data-testid="input-recipe-search"
            />
          </div>
          <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
            <SelectTrigger className="sm:w-64" data-testid="select-recipe-menu">
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
        </div>

        {drinksLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {entries.length === 0 ? "No drinks yet." : "No recipes match your search."}
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground" data-testid="text-recipe-count">
              {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((entry) => (
                <RecipeCard key={entry.key} entry={entry} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function RecipeCard({ entry }: { entry: RecipeEntry }) {
  const { drink, menuNames, ingredientNames } = entry;
  const steps = drink.recipe ? splitRecipe(drink.recipe) : [];
  const temperature = drink.temperature ? TEMPERATURE_LABELS[drink.temperature] : null;

  return (
    <Card data-testid={`card-recipe-${drink.id}`}>
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="font-serif text-lg">{drink.name}</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {drink.baseSpirit && <Badge variant="secondary">{drink.baseSpirit}</Badge>}
          {drink.isShaken && <Badge variant="outline">Shaken</Badge>}
          {drink.isStirred && <Badge variant="outline">Stirred</Badge>}
          {temperature && <Badge variant="outline">{temperature}</Badge>}
          {drink.isMocktail && <Badge variant="outline">Mocktail</Badge>}
          {drink.canBeMocktail && !drink.isMocktail && <Badge variant="outline">Mocktail option</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {steps.length === 0 ? (
          <p className="text-muted-foreground italic">No recipe recorded.</p>
        ) : steps.length === 1 ? (
          <p className="leading-relaxed whitespace-pre-wrap">{steps[0]}</p>
        ) : (
          <ul className="leading-relaxed space-y-1 list-disc list-inside marker:text-muted-foreground">
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

        <p className="text-xs text-muted-foreground">
          {menuNames.join(" · ")}
          {drink.section && ` — ${drink.section}`}
        </p>
      </CardContent>
    </Card>
  );
}
