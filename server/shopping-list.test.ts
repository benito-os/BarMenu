import { describe, expect, it } from "vitest";
import { buildShoppingList, stockStatus } from "./shopping-list";

const ing = (name: string, onHand: number, parLevel: number, isActive = true) => ({
  name,
  category: "Spirits",
  unit: "bottles",
  onHand,
  parLevel,
  isActive,
});

describe("stockStatus", () => {
  it("classifies out, low and ok", () => {
    expect(stockStatus({ onHand: 0, parLevel: 2 })).toBe("out");
    expect(stockStatus({ onHand: 2, parLevel: 2 })).toBe("low");
    expect(stockStatus({ onHand: 3, parLevel: 2 })).toBe("ok");
  });
});

describe("buildShoppingList", () => {
  it("returns nothing when everything is above par", () => {
    expect(buildShoppingList([ing("Gin", 5, 2)], [])).toEqual([]);
  });
  it("skips inactive ingredients", () => {
    expect(buildShoppingList([ing("Gin", 0, 2, false)], [])).toEqual([]);
  });
  it("computes buy to get back above par, minimum 1", () => {
    const [a, b] = buildShoppingList([ing("Gin", 0, 2), ing("Rum", 2, 2)], []);
    expect(a.buy).toBe(3);
    expect(b.buy).toBe(1);
    expect(buildShoppingList([ing("Odd", 0, 0)], [])[0].buy).toBe(1);
  });
  it("lists blocked drinks and sorts blockers first, then by name", () => {
    const items = buildShoppingList(
      [ing("Zed", 0, 1), ing("Apple", 0, 1), ing("Campari", 0, 1)],
      [
        { drinkName: "Negroni", missingIngredients: ["Campari"] },
        { drinkName: "Boulevardier", missingIngredients: ["Campari"] },
        { drinkName: "Zedtini", missingIngredients: ["Zed"] },
      ],
    );
    expect(items.map((i) => i.name)).toEqual(["Campari", "Zed", "Apple"]);
    expect(items[0].blocksDrinks).toEqual(["Negroni", "Boulevardier"]);
    expect(items[2].blocksDrinks).toEqual([]);
  });
});
