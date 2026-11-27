import { useQuery } from "@tanstack/react-query";

export interface ShoppingListItem {
  name: string;
  category: string | null;
  unit: string;
  onHand: number;
  parLevel: number;
  buy: number;
  blocksDrinks: string[];
}

interface ShoppingListResponse {
  count: number;
  items: ShoppingListItem[];
}

/**
 * Plain text for the clipboard, one item per line, in the order given (the
 * server already puts drink-blocking items first):
 *   Campari: buy 2 (blocks Negroni, Boulevardier)
 */
export function formatShoppingListText(items: ShoppingListItem[]): string {
  return items
    .map((item) => {
      const blocks =
        item.blocksDrinks.length > 0 ? ` (blocks ${item.blocksDrinks.join(", ")})` : "";
      return `${item.name}: buy ${item.buy}${blocks}`;
    })
    .join("\n");
}

/** Fetches the list only while `enabled` (sheet open), and always fresh. */
export function useShoppingList(enabled: boolean) {
  return useQuery<ShoppingListResponse>({
    queryKey: ["/api/shopping-list"],
    enabled,
    staleTime: 0,
  });
}
