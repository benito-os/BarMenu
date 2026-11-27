// Pure shopping-list computation, shared by the MCP `get_shopping_list` tool
// and `GET /api/shopping-list`. No database access: callers pass in the
// ingredients and the active-menu drink alerts.
import type { Ingredient } from "@shared/schema";

export type StockStatus = "out" | "low" | "ok";

/** Same thresholds the Inventory page uses. */
export function stockStatus(item: Pick<Ingredient, "onHand" | "parLevel">): StockStatus {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= item.parLevel) return "low";
  return "ok";
}

export interface ShoppingAlert {
  drinkName: string;
  missingIngredients: string[];
}

export interface ShoppingListItem {
  name: string;
  category: string | null;
  unit: string;
  onHand: number;
  parLevel: number;
  buy: number;
  blocksDrinks: string[];
}

/**
 * Every active ingredient at or below its par level, how many to buy to get
 * back above par, and which active-menu drinks it blocks. Items that block
 * drinks come first, then alphabetical.
 */
export function buildShoppingList(
  ingredients: Array<
    Pick<Ingredient, "name" | "category" | "unit" | "onHand" | "parLevel" | "isActive">
  >,
  alerts: ShoppingAlert[],
): ShoppingListItem[] {
  const blocking = new Map<string, string[]>();
  for (const alert of alerts) {
    for (const name of alert.missingIngredients) {
      blocking.set(name, [...(blocking.get(name) ?? []), alert.drinkName]);
    }
  }
  return ingredients
    .filter((item) => item.isActive && stockStatus(item) !== "ok")
    .map((item) => ({
      name: item.name,
      category: item.category,
      unit: item.unit,
      onHand: item.onHand,
      parLevel: item.parLevel,
      buy: Math.max(1, item.parLevel - item.onHand + 1),
      blocksDrinks: blocking.get(item.name) ?? [],
    }))
    .sort((a, b) => b.blocksDrinks.length - a.blocksDrinks.length || a.name.localeCompare(b.name));
}
