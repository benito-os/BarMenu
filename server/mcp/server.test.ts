// End-to-end over the real MCP protocol (in-memory transport), against a fake
// store, so no database is needed.
import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Drink, Ingredient, Menu } from "../../shared/schema";
import type { IStorage } from "../storage";
import { createBarMcpServer, resolveOne, slugify, stockStatus } from "./server";

function makeStore() {
  let seq = 0;
  const id = () => `id-${++seq}`;
  const menus: Menu[] = [];
  const drinks: Drink[] = [];
  const ingredients: Ingredient[] = [];
  const links = new Map<string, string[]>();
  const calls: string[] = [];

  const availability = (menuId: string, includeInactive = false) =>
    drinks
      .filter((d) => d.menuId === menuId && (includeInactive || d.isActive))
      .map((d) => {
        const ingredientIds = links.get(d.id) ?? [];
        const missingIngredients = ingredientIds
          .map((i) => ingredients.find((x) => x.id === i)!)
          .filter((i) => i.onHand <= 0 || !i.isActive)
          .map((i) => i.name);
        return { ...d, ingredientIds, missingIngredients, isMakeable: !d.isOutOfStock && missingIngredients.length === 0 };
      });

  const storage = {
    getAllMenus: async () => [...menus],
    createMenu: async (m: any) => {
      const menu = { id: id(), createdAt: new Date(), heroImageUrl: null, backgroundColor: null, accentColor: null, sectionHeaderColor: null, menuTitleColor: null, typography: null, description: null, sections: [], isActive: false, ...m } as Menu;
      menus.push(menu);
      return menu;
    },
    updateMenu: async (mid: string, data: Partial<Menu>) => {
      const m = menus.find((x) => x.id === mid);
      return m ? Object.assign(m, data) : undefined;
    },
    getDrinksWithAvailability: async (menuId: string, inc?: boolean) => availability(menuId, inc),
    createDrink: async (d: any) => {
      const drink = { id: id(), ...d } as Drink;
      drinks.push(drink);
      return drink;
    },
    updateDrink: async (did: string, data: Partial<Drink>) => {
      const d = drinks.find((x) => x.id === did);
      return d ? Object.assign(d, data) : undefined;
    },
    setDrinkIngredients: async (did: string, ids: string[]) => void links.set(did, ids),
    getIngredients: async () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    createIngredient: async (i: any) => {
      const ing = { id: id(), createdAt: new Date(), ...i } as Ingredient;
      ingredients.push(ing);
      return ing;
    },
    updateIngredient: async (iid: string, data: Partial<Ingredient>) => {
      const i = ingredients.find((x) => x.id === iid);
      return i ? Object.assign(i, data) : undefined;
    },
    getActiveMenuDrinkAlerts: async () =>
      menus
        .filter((m) => m.isActive)
        .flatMap((m) =>
          availability(m.id)
            .filter((d) => !d.isMakeable)
            .map((d) => ({ menuId: m.id, menuName: m.name, drinkId: d.id, drinkName: d.name, missingIngredients: d.missingIngredients, isOutOfStock: d.isOutOfStock })),
        ),
    getOrderQueue: async () => [],
    getDrinkAnalytics: async () => drinks.map((d) => ({ id: d.id, name: d.name, section: d.section, menuId: d.menuId, orderCount: d.name === "Negroni" ? 4 : 0, isNeverMade: d.name !== "Negroni" })),
  };

  // Any storage method the MCP server is not supposed to touch (deletes,
  // orders, settings) throws, so a test fails loudly if one is ever called.
  const guarded = new Proxy(storage, {
    get(target, prop: string) {
      if (prop in target) {
        calls.push(prop);
        return (target as any)[prop];
      }
      return () => {
        throw new Error(`MCP server must not call storage.${prop}`);
      };
    },
  }) as unknown as IStorage;

  return { storage: guarded, menus, drinks, ingredients, links, calls };
}

async function connect(storage: IStorage, readOnly = false) {
  const server = createBarMcpServer(storage, { readOnly });
  const client = new Client({ name: "test", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res: any = await client.callTool({ name, arguments: args });
    const text = res.content[0].text as string;
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {}
    return { isError: Boolean(res.isError), data, text };
  };
  return { client, call };
}

describe("helpers", () => {
  it("stockStatus matches the Inventory page thresholds", () => {
    expect(stockStatus({ onHand: 0, parLevel: 2 })).toBe("out");
    expect(stockStatus({ onHand: 2, parLevel: 2 })).toBe("low");
    expect(stockStatus({ onHand: 3, parLevel: 2 })).toBe("ok");
  });

  it("slugify", () => {
    expect(slugify("Été Indien: Fall '26!")).toBe("ete-indien-fall-26");
    expect(slugify("!!!")).toBe("menu");
  });

  it("resolveOne prefers exact over partial and refuses to guess", () => {
    const items = [
      { id: "1", name: "Rye" },
      { id: "2", name: "Rye Whiskey (overproof)" },
      { id: "3", name: "Campari" },
    ];
    const label = (i: { name: string }) => i.name;
    expect(resolveOne(items, "rye", label)).toMatchObject({ ok: true, item: { id: "1" } });
    expect(resolveOne(items, "camp", label)).toMatchObject({ ok: true, item: { id: "3" } });
    expect(resolveOne(items, "2", label)).toMatchObject({ ok: true, item: { id: "2" } });
    expect(resolveOne(items, "ry", label)).toMatchObject({ ok: false, reason: "ambiguous" });
    expect(resolveOne(items, "gin", label)).toMatchObject({ ok: false, reason: "not_found" });
  });
});

describe("bar MCP server", () => {
  let store: ReturnType<typeof makeStore>;
  let call: Awaited<ReturnType<typeof connect>>["call"];
  let client: Awaited<ReturnType<typeof connect>>["client"];

  beforeEach(async () => {
    store = makeStore();
    const s = store.storage;
    const menu = await s.createMenu({ name: "House Classics", slug: "house", sections: ["Stirred", "Shaken"], isActive: true } as any);
    const gin = await s.createIngredient({ name: "London Dry Gin", category: "Spirits", unit: "bottles", onHand: 2, parLevel: 1, isActive: true });
    const campari = await s.createIngredient({ name: "Campari", category: "Liqueurs", unit: "bottles", onHand: 0, parLevel: 1, isActive: true });
    await s.createIngredient({ name: "Sweet Vermouth", category: "Fortified", unit: "bottles", onHand: 1, parLevel: 1, isActive: true });
    const negroni = await s.createDrink({ menuId: menu.id, name: "Negroni", section: "Stirred", isActive: true, isOutOfStock: false, sortOrder: 1 } as any);
    await s.setDrinkIngredients(negroni.id, [gin.id, campari.id]);
    const martini = await s.createDrink({ menuId: menu.id, name: "Martini", section: "Stirred", recipe: "2.5oz gin", isActive: true, isOutOfStock: false, sortOrder: 2 } as any);
    await s.setDrinkIngredients(martini.id, [gin.id]);
    store.calls.length = 0;
    ({ call, client } = await connect(s));
  });

  it("exposes no delete or order tools, and read-only mode drops every write tool", async () => {
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names.sort()).toEqual([
      "add_ingredients", "create_drink", "create_menu", "get_bar_overview", "get_drink_stats",
      "get_shopping_list", "list_drinks", "list_inventory", "update_drink", "update_inventory", "update_menu",
    ]);
    expect(names.some((n) => /delete|remove|order/.test(n))).toBe(false);

    const ro = await connect(makeStore().storage, true);
    const roTools = (await ro.client.listTools()).tools;
    expect(roTools.map((t) => t.name).sort()).toEqual(["get_bar_overview", "get_drink_stats", "get_shopping_list", "list_drinks", "list_inventory"]);
    expect(roTools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("overview reports low/out stock and blocked drinks", async () => {
    const { data } = await call("get_bar_overview");
    expect(data.menus[0]).toMatchObject({ name: "House Classics", drinks: 2, draftDrinks: 0 });
    expect(data.inventory).toEqual({ total: 3, out: ["Campari"], low: ["Sweet Vermouth"] });
    expect(data.unavailableOnActiveMenus).toEqual([{ drink: "Negroni", menu: "House Classics", reason: "missing Campari" }]);
  });

  it("list_drinks makeableOnly answers 'what can I make'", async () => {
    const { data } = await call("list_drinks", { makeableOnly: true });
    expect(data.drinks.map((d: any) => d.name)).toEqual(["Martini"]);
    expect(data.drinks[0].trackedIngredients).toEqual(["London Dry Gin"]);
  });

  it("shopping list puts drink-blocking items first", async () => {
    const { data } = await call("get_shopping_list");
    expect(data.items.map((i: any) => [i.name, i.buy, i.blocksDrinks])).toEqual([
      ["Campari", 2, ["Negroni"]],
      ["Sweet Vermouth", 1, []],
    ]);
  });

  it("update_inventory applies deltas, clamps at zero, and reports what it skipped", async () => {
    const { data, isError } = await call("update_inventory", {
      changes: [
        { ingredient: "campari", delta: 2 },
        { ingredient: "gin", delta: -5 },
        { ingredient: "Sweet Vermouth", onHand: 3, parLevel: 2 },
        { ingredient: "mezcal", delta: 1 },
        { ingredient: "Campari", delta: 1 },
      ],
    });
    expect(isError).toBe(false);
    expect(data.updated.map((u: any) => [u.name, u.previousOnHand, u.onHand])).toEqual([
      ["Campari", 0, 2],
      ["London Dry Gin", 2, 0],
      ["Sweet Vermouth", 1, 3],
    ]);
    expect(data.skipped.map((s: any) => s.ingredient)).toEqual(["mezcal", "Campari"]);
    expect(data.skipped[0].reason).toMatch(/add_ingredients/);
  });

  it("update_inventory with nothing applied is an error", async () => {
    const res = await call("update_inventory", { changes: [{ ingredient: "Campari", delta: 1, onHand: 4 }] });
    expect(res.isError).toBe(true);
    expect(store.ingredients.find((i) => i.name === "Campari")!.onHand).toBe(0);
  });

  it("add_ingredients skips names that already exist", async () => {
    const { data } = await call("add_ingredients", { ingredients: [{ name: "  campari " }, { name: "Mezcal", onHand: 1, category: "Spirits" }] });
    expect(data.added).toMatchObject([{ name: "Mezcal", unit: "bottles", onHand: 1, status: "ok" }]);
    expect(data.skipped).toHaveLength(1);
    expect(store.ingredients).toHaveLength(4);
  });

  it("create_drink saves a hidden draft, reuses the section casing, and links ingredients", async () => {
    const { data, isError } = await call("create_drink", {
      menu: "house", name: "Boulevardier-ish", section: "stirred", recipe: "1oz gin\n1oz Campari", ingredients: ["gin", "Campari"],
    });
    expect(isError).toBe(false);
    const drink = store.drinks.find((d) => d.name === "Boulevardier-ish")!;
    expect(drink).toMatchObject({ isActive: false, section: "Stirred", sortOrder: 3 });
    expect(store.links.get(drink.id)).toHaveLength(2);
    expect(data.visibility).toMatch(/hidden draft/);
  });

  it("create_drink writes nothing when an ingredient is unknown, unless asked to add it", async () => {
    const args = { menu: "house", name: "Smoke Signal", section: "Shaken", ingredients: ["Mezcal"] };
    const refused = await call("create_drink", args);
    expect(refused.isError).toBe(true);
    expect(refused.text).toMatch(/addMissingIngredients/);
    expect(store.drinks).toHaveLength(2);
    expect(store.ingredients).toHaveLength(3);

    const { data } = await call("create_drink", { ...args, addMissingIngredients: true });
    expect(data.ingredientsAddedToInventory).toEqual(["Mezcal"]);
    expect(store.ingredients.find((i) => i.name === "Mezcal")).toMatchObject({ onHand: 0 });
  });

  it("create_drink refuses a duplicate name on the same menu", async () => {
    const res = await call("create_drink", { menu: "house", name: "negroni", section: "Stirred" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/update_drink/);
  });

  it("update_drink changes only the given fields and can 86 a drink", async () => {
    const { data } = await call("update_drink", { drink: "Martini", isOutOfStock: true, ingredients: [] });
    expect(data.changedFields).toEqual(["isOutOfStock", "ingredients"]);
    const martini = store.drinks.find((d) => d.name === "Martini")!;
    expect(martini).toMatchObject({ isOutOfStock: true, recipe: "2.5oz gin", isActive: true });
    expect(store.links.get(martini.id)).toEqual([]);
  });

  it("create_menu is always hidden and de-duplicates the slug; update_menu can activate", async () => {
    const first = await call("create_menu", { name: "House", sections: ["Hot"] });
    expect(first.data.created.slug).toBe("house-2");
    expect(store.menus.find((m) => m.slug === "house-2")!.isActive).toBe(false);
    expect((await call("create_menu", { name: "X", slug: "house" })).isError).toBe(true);

    const upd = await call("update_menu", { menu: "house-2", isActive: true });
    expect(upd.data.updated.isActive).toBe(true);
  });

  it("stats list ordered and never-ordered drinks", async () => {
    const { data } = await call("get_drink_stats");
    expect(data.ordered).toEqual([{ drink: "Negroni", menu: "House Classics", orders: 4 }]);
    expect(data.neverOrdered.map((d: any) => d.drink)).toEqual(["Martini"]);
  });

  it("unknown menu errors name the fix", async () => {
    const res = await call("list_drinks", { menu: "tiki" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/get_bar_overview/);
  });
});
