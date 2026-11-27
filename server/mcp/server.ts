/**
 * Bar Flores MCP server: lets an AI assistant (Claude and friends) read the
 * bar's menus, drinks and inventory, and make careful edits.
 *
 * Guardrails, on purpose:
 *   - No delete tools. Removing things stays in the dashboard.
 *   - No order tools. The queue belongs to the bartender.
 *   - New drinks and menus are created as hidden drafts (isActive = false)
 *     unless the owner explicitly asks to publish.
 *   - MCP_READ_ONLY=1 registers only the read tools.
 *
 * This module depends on the IStorage *interface* only, so it can be tested
 * against an in-memory fake without a database (see server.test.ts).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Drink, Ingredient, Menu } from "@shared/schema";
import type { IStorage } from "../storage";
import { buildShoppingList, stockStatus } from "../shopping-list";

export interface BarMcpOptions {
  readOnly?: boolean;
}

type DrinkWithAvailability = Awaited<
  ReturnType<IStorage["getDrinksWithAvailability"]>
>[number];

export { stockStatus };

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "menu"
  );
}

export type Resolved<T> =
  | { ok: true; item: T }
  | { ok: false; reason: "not_found" | "ambiguous"; candidates: string[] };

/**
 * Find one item by id, exact name, or unique partial name (case-insensitive).
 * Never guesses between several partial matches: an ambiguous reference comes
 * back with the candidates so the assistant can ask the owner.
 */
export function resolveOne<T extends { id: string }>(
  items: T[],
  reference: string,
  label: (item: T) => string,
  aliases: (item: T) => string[] = () => [],
): Resolved<T> {
  const ref = norm(reference);
  if (!ref) return { ok: false, reason: "not_found", candidates: [] };

  const byId = items.find((item) => item.id === reference.trim());
  if (byId) return { ok: true, item: byId };

  const names = (item: T) => [label(item), ...aliases(item)].map(norm);

  const exact = items.filter((item) => names(item).includes(ref));
  if (exact.length === 1) return { ok: true, item: exact[0] };
  if (exact.length > 1) {
    return { ok: false, reason: "ambiguous", candidates: exact.map(label) };
  }

  const partial = items.filter((item) => names(item).some((n) => n.includes(ref)));
  if (partial.length === 1) return { ok: true, item: partial[0] };
  if (partial.length > 1) {
    return { ok: false, reason: "ambiguous", candidates: partial.map(label).slice(0, 10) };
  }
  return { ok: false, reason: "not_found", candidates: [] };
}

function describeMiss(kind: string, reference: string, miss: Extract<Resolved<unknown>, { ok: false }>, fix: string) {
  if (miss.reason === "ambiguous") {
    return `"${reference}" matches more than one ${kind}: ${miss.candidates.join(", ")}. Use the exact name or the id.`;
  }
  return `No ${kind} matches "${reference}". ${fix}`;
}

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string) => ({
  isError: true,
  content: [{ type: "text" as const, text: message }],
});

const ingredientView = (item: Ingredient) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  unit: item.unit,
  onHand: item.onHand,
  parLevel: item.parLevel,
  status: item.isActive ? stockStatus(item) : "inactive",
});

const menuLabel = (menu: Menu) => menu.name;
const menuAliases = (menu: Menu) => [menu.slug];

const TEMPERATURES = ["hot", "cold", "room_temp"] as const;

const drinkFields = {
  description: z.string().max(600).optional().describe("Guest-facing description, one or two sentences."),
  recipe: z
    .string()
    .max(2000)
    .optional()
    .describe("Bartender-facing recipe. One step or measure per line."),
  style: z.string().max(60).optional().describe('Mood or style tag, e.g. "Bright and bitter".'),
  baseSpirit: z.string().max(60).optional().describe('e.g. "Rye", "Mezcal", "None".'),
  temperature: z.enum(TEMPERATURES).optional(),
  isMocktail: z.boolean().optional().describe("True only if the drink has no alcohol at all."),
  canBeMocktail: z.boolean().optional().describe("True if it can be made without alcohol on request."),
  isStirred: z.boolean().optional(),
  isShaken: z.boolean().optional(),
};

export function createBarMcpServer(storage: IStorage, options: BarMcpOptions = {}): McpServer {
  const server = new McpServer(
    { name: "bar-flores", version: "1.0.0" },
    {
      instructions: [
        "This is the owner's home bar: menus, drinks (with recipes) and bottle inventory.",
        "Start with get_bar_overview. Before suggesting new drinks, call list_inventory so ideas use what is actually on hand, and say which bottles a suggestion would need that the bar lacks.",
        "Inventory counts are whole numbers in each ingredient's own unit (usually bottles).",
        "New drinks and menus are saved as hidden drafts; only publish (isActive true) when the owner explicitly asks.",
        "There are no delete tools and no order tools: point the owner to the dashboard for those.",
        "After any write, tell the owner exactly what changed.",
      ].join(" "),
    },
  );

  const loadAllDrinks = async (menus: Menu[], includeInactive: boolean) => {
    const perMenu = await Promise.all(
      menus.map(async (menu) => ({
        menu,
        drinks: await storage.getDrinksWithAvailability(menu.id, includeInactive),
      })),
    );
    return perMenu.flatMap(({ menu, drinks }) => drinks.map((drink) => ({ menu, drink })));
  };

  const drinkView = (
    menu: Menu,
    drink: DrinkWithAvailability,
    ingredientNames: Map<string, string>,
  ) => ({
    id: drink.id,
    name: drink.name,
    menu: menu.name,
    menuIsActive: menu.isActive,
    section: drink.section,
    description: drink.description,
    recipe: drink.recipe,
    style: drink.style,
    baseSpirit: drink.baseSpirit,
    temperature: drink.temperature,
    isMocktail: drink.isMocktail,
    canBeMocktail: drink.canBeMocktail,
    isStirred: drink.isStirred,
    isShaken: drink.isShaken,
    isActive: drink.isActive,
    isOutOfStock: drink.isOutOfStock,
    isMakeable: drink.isMakeable,
    trackedIngredients: drink.ingredientIds.map((id) => ingredientNames.get(id) ?? id),
    missingIngredients: drink.missingIngredients,
  });

  // ------------------------------------------------------------------ reads

  server.registerTool(
    "get_bar_overview",
    {
      title: "Bar overview",
      description:
        "One-call snapshot of the bar: every menu (with drink counts), inventory totals, what is low or out, drinks on active menus that cannot be made right now, and how many orders are waiting. Call this first.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [menus, ingredients, alerts, queue] = await Promise.all([
        storage.getAllMenus(),
        storage.getIngredients(),
        storage.getActiveMenuDrinkAlerts(),
        storage.getOrderQueue(),
      ]);
      const all = await loadAllDrinks(menus, true);
      const active = ingredients.filter((item) => item.isActive);

      return ok({
        menus: menus.map((menu) => {
          const drinks = all.filter((entry) => entry.menu.id === menu.id).map((entry) => entry.drink);
          return {
            id: menu.id,
            name: menu.name,
            slug: menu.slug,
            isActive: menu.isActive,
            sections: menu.sections,
            drinks: drinks.length,
            draftDrinks: drinks.filter((drink) => !drink.isActive).length,
          };
        }),
        inventory: {
          total: active.length,
          out: active.filter((item) => stockStatus(item) === "out").map((item) => item.name),
          low: active.filter((item) => stockStatus(item) === "low").map((item) => item.name),
        },
        unavailableOnActiveMenus: alerts.map((alert) => ({
          drink: alert.drinkName,
          menu: alert.menuName,
          reason: alert.isOutOfStock ? "marked out of stock (86)" : `missing ${alert.missingIngredients.join(", ")}`,
        })),
        openOrders: queue.length,
      });
    },
  );

  server.registerTool(
    "list_inventory",
    {
      title: "List inventory",
      description:
        "List ingredients with on-hand count, par level and status (ok, low = at or below par, out = zero). Filter by status, category, or a name search.",
      inputSchema: {
        status: z.enum(["all", "ok", "low", "out"]).optional().describe("Default all."),
        category: z.string().optional().describe("Exact category, case-insensitive."),
        search: z.string().optional().describe("Part of an ingredient name."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status = "all", category, search }) => {
      const ingredients = await storage.getIngredients();
      const rows = ingredients
        .filter((item) => status === "all" || (item.isActive && stockStatus(item) === status))
        .filter((item) => !category || norm(item.category ?? "") === norm(category))
        .filter((item) => !search || norm(item.name).includes(norm(search)))
        .map(ingredientView);
      const categories = Array.from(
        new Set(ingredients.map((item) => item.category).filter((c): c is string => Boolean(c))),
      ).sort();
      return ok({ count: rows.length, categories, ingredients: rows });
    },
  );

  server.registerTool(
    "get_shopping_list",
    {
      title: "Shopping list",
      description:
        "What to buy: every active ingredient at or below its par level, with how many to buy to get back above par, and which drinks on active menus each one is blocking.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [ingredients, alerts] = await Promise.all([
        storage.getIngredients(),
        storage.getActiveMenuDrinkAlerts(),
      ]);
      const items = buildShoppingList(ingredients, alerts);
      return ok({ count: items.length, items });
    },
  );

  server.registerTool(
    "list_drinks",
    {
      title: "List drinks",
      description:
        "List drinks with recipes, tracked ingredients and whether each can be made right now. Use makeableOnly to answer \"what can I make tonight?\". Includes hidden drafts unless includeDrafts is false.",
      inputSchema: {
        menu: z.string().optional().describe("Menu name, slug or id. Default: all menus."),
        search: z.string().optional().describe("Matches name, description, recipe, base spirit or style."),
        makeableOnly: z.boolean().optional().describe("Only drinks whose tracked ingredients are all in stock."),
        includeDrafts: z.boolean().optional().describe("Default true."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ menu, search, makeableOnly = false, includeDrafts = true }) => {
      const [menus, ingredients] = await Promise.all([storage.getAllMenus(), storage.getIngredients()]);
      let scope = menus;
      if (menu) {
        const found = resolveOne(menus, menu, menuLabel, menuAliases);
        if (!found.ok) return fail(describeMiss("menu", menu, found, "Call get_bar_overview to see the menus."));
        scope = [found.item];
      }
      const names = new Map(ingredients.map((item) => [item.id, item.name]));
      const needle = search ? norm(search) : null;
      const rows = (await loadAllDrinks(scope, includeDrafts))
        .filter(({ drink }) => !makeableOnly || drink.isMakeable)
        .filter(({ drink }) => {
          if (!needle) return true;
          return [drink.name, drink.description, drink.recipe, drink.baseSpirit, drink.style]
            .filter((value): value is string => Boolean(value))
            .some((value) => norm(value).includes(needle));
        })
        .map(({ menu: m, drink }) => drinkView(m, drink, names));
      return ok({ count: rows.length, drinks: rows });
    },
  );

  server.registerTool(
    "get_drink_stats",
    {
      title: "Drink popularity",
      description:
        "Order counts per drink (cancelled orders excluded), most ordered first, plus the drinks nobody has ordered yet. Useful for deciding what to keep, rework or retire.",
      inputSchema: {
        menu: z.string().optional().describe("Menu name, slug or id. Default: all menus."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ menu }) => {
      const menus = await storage.getAllMenus();
      let menuId: string | undefined;
      if (menu) {
        const found = resolveOne(menus, menu, menuLabel, menuAliases);
        if (!found.ok) return fail(describeMiss("menu", menu, found, "Call get_bar_overview to see the menus."));
        menuId = found.item.id;
      }
      const menuNames = new Map(menus.map((m) => [m.id, m.name]));
      const stats = (await storage.getDrinkAnalytics(menuId)).sort((a, b) => b.orderCount - a.orderCount);
      return ok({
        ordered: stats
          .filter((row) => row.orderCount > 0)
          .map((row) => ({ drink: row.name, menu: menuNames.get(row.menuId), orders: row.orderCount })),
        neverOrdered: stats
          .filter((row) => row.orderCount === 0)
          .map((row) => ({ drink: row.name, menu: menuNames.get(row.menuId) })),
      });
    },
  );

  if (options.readOnly) return server;

  // ----------------------------------------------------------------- writes

  server.registerTool(
    "update_inventory",
    {
      title: "Update inventory",
      description:
        "Change stock for one or more existing ingredients in a single call. Use `delta` for relative changes (\"bought two\" = 2, \"finished the bottle\" = -1) or `onHand` to set an exact count after a stock-take. Can also change par level, unit, category, name, or retire/restore an ingredient with isActive. Ingredients are matched by id or name; anything unmatched or ambiguous is skipped and reported, and the rest still apply. On-hand never goes below zero.",
      inputSchema: {
        changes: z
          .array(
            z.object({
              ingredient: z.string().min(1).describe("Ingredient name (or id)."),
              delta: z.number().int().optional().describe("Add (positive) or remove (negative) this many."),
              onHand: z.number().int().min(0).optional().describe("Set the exact count. Do not combine with delta."),
              parLevel: z.number().int().min(0).optional(),
              unit: z.string().min(1).max(30).optional(),
              category: z.string().max(60).optional(),
              name: z.string().min(1).max(120).optional().describe("Rename."),
              isActive: z.boolean().optional().describe("False retires the ingredient without deleting it."),
            }),
          )
          .min(1)
          .max(100),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ changes }) => {
      const ingredients = await storage.getIngredients();
      const updated: unknown[] = [];
      const skipped: { ingredient: string; reason: string }[] = [];
      const seen = new Set<string>();

      for (const change of changes) {
        const found = resolveOne(ingredients, change.ingredient, (item) => item.name);
        if (!found.ok) {
          skipped.push({
            ingredient: change.ingredient,
            reason: describeMiss("ingredient", change.ingredient, found, "Add it with add_ingredients, or check list_inventory for the exact name."),
          });
          continue;
        }
        const current = found.item;
        if (seen.has(current.id)) {
          skipped.push({ ingredient: change.ingredient, reason: `"${current.name}" appears twice in this call. Combine the changes into one entry.` });
          continue;
        }
        if (change.delta !== undefined && change.onHand !== undefined) {
          skipped.push({ ingredient: change.ingredient, reason: "Give either delta or onHand, not both." });
          continue;
        }
        const { ingredient: _reference, delta, ...fields } = change;
        const patch: Partial<Ingredient> = { ...fields };
        if (delta !== undefined) patch.onHand = Math.max(0, current.onHand + delta);
        if (Object.keys(patch).length === 0) {
          skipped.push({ ingredient: change.ingredient, reason: "No change given. Provide delta, onHand, or another field." });
          continue;
        }
        const previousOnHand = current.onHand;
        const saved = await storage.updateIngredient(current.id, patch);
        if (!saved) {
          skipped.push({ ingredient: change.ingredient, reason: "It was removed while updating. Call list_inventory and try again." });
          continue;
        }
        seen.add(current.id);
        updated.push({ ...ingredientView(saved), previousOnHand });
      }

      const result = { updated, skipped };
      return updated.length === 0 ? fail(JSON.stringify(result, null, 2)) : ok(result);
    },
  );

  server.registerTool(
    "add_ingredients",
    {
      title: "Add ingredients",
      description:
        "Add new ingredients to inventory. An ingredient whose name already exists is skipped and reported (use update_inventory to change it). Counts are whole numbers in the given unit; default unit is bottles.",
      inputSchema: {
        ingredients: z
          .array(
            z.object({
              name: z.string().min(1).max(120),
              category: z.string().max(60).optional().describe("Reuse an existing category from list_inventory where one fits."),
              unit: z.string().min(1).max(30).optional().describe("Default bottles."),
              onHand: z.number().int().min(0).optional().describe("Default 0."),
              parLevel: z.number().int().min(0).optional().describe("Reorder at or below this. Default 0."),
            }),
          )
          .min(1)
          .max(100),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ ingredients: incoming }) => {
      const existing = await storage.getIngredients();
      const taken = new Set(existing.map((item) => norm(item.name)));
      const added: unknown[] = [];
      const skipped: { name: string; reason: string }[] = [];

      for (const item of incoming) {
        const key = norm(item.name);
        if (taken.has(key)) {
          skipped.push({ name: item.name, reason: "Already in inventory. Use update_inventory to change it." });
          continue;
        }
        const created = await storage.createIngredient({
          name: item.name.trim(),
          category: item.category?.trim() || null,
          unit: item.unit?.trim() || "bottles",
          onHand: item.onHand ?? 0,
          parLevel: item.parLevel ?? 0,
          isActive: true,
        });
        taken.add(key);
        added.push(ingredientView(created));
      }
      return ok({ added, skipped });
    },
  );

  /** Turn ingredient names into ids, optionally creating the unknown ones at zero stock. */
  const resolveIngredientNames = async (names: string[], addMissing: boolean) => {
    const all = await storage.getIngredients();
    const ids: string[] = [];
    const created: string[] = [];
    const problems: string[] = [];
    for (const name of names) {
      const found = resolveOne(all, name, (item) => item.name);
      if (found.ok) {
        ids.push(found.item.id);
      } else if (found.reason === "not_found" && addMissing) {
        const fresh = await storage.createIngredient({
          name: name.trim(),
          category: null,
          unit: "bottles",
          onHand: 0,
          parLevel: 0,
          isActive: true,
        });
        all.push(fresh);
        ids.push(fresh.id);
        created.push(fresh.name);
      } else {
        problems.push(
          describeMiss("ingredient", name, found, "Set addMissingIngredients to true to add it at zero stock, or leave it out."),
        );
      }
    }
    return { ids, created, problems };
  };

  const findDrink = async (reference: string, menuReference?: string) => {
    const menus = await storage.getAllMenus();
    let scope = menus;
    if (menuReference) {
      const found = resolveOne(menus, menuReference, menuLabel, menuAliases);
      if (!found.ok) return { error: describeMiss("menu", menuReference, found, "Call get_bar_overview to see the menus.") };
      scope = [found.item];
    }
    const all = await loadAllDrinks(scope, true);
    const found = resolveOne(
      all.map((entry) => ({ ...entry, id: entry.drink.id })),
      reference,
      (entry) => `${entry.drink.name} (${entry.menu.name})`,
      (entry) => [entry.drink.name],
    );
    if (!found.ok) {
      return { error: describeMiss("drink", reference, found, "Call list_drinks to see what exists, or pass the menu to narrow it down.") };
    }
    return { menu: found.item.menu, drink: found.item.drink };
  };

  server.registerTool(
    "create_drink",
    {
      title: "Create drink",
      description:
        "Add a drink to a menu. It is saved as a hidden draft unless `publish` is true; only publish when the owner explicitly asks. `ingredients` links inventory items so the app can tell when the drink cannot be made: use names from list_inventory. A drink whose linked ingredient is at zero shows as unavailable to guests.",
      inputSchema: {
        menu: z.string().min(1).describe("Menu name, slug or id."),
        name: z.string().min(1).max(120),
        section: z
          .string()
          .min(1)
          .max(60)
          .describe("Section heading on the menu. Reuse one of the menu's existing sections unless the owner wants a new one."),
        ...drinkFields,
        ingredients: z.array(z.string().min(1)).max(30).optional().describe("Inventory ingredient names to link."),
        addMissingIngredients: z
          .boolean()
          .optional()
          .describe("Create any linked ingredient that is not in inventory yet, at zero stock (so it lands on the shopping list). Default false."),
        publish: z.boolean().optional().describe("Default false: saved as a hidden draft."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ menu, name, section, ingredients: ingredientNames = [], addMissingIngredients = false, publish = false, ...fields }) => {
      const menus = await storage.getAllMenus();
      const found = resolveOne(menus, menu, menuLabel, menuAliases);
      if (!found.ok) return fail(describeMiss("menu", menu, found, "Call get_bar_overview to see the menus, or create one with create_menu."));
      const target = found.item;

      const existing = await storage.getDrinksWithAvailability(target.id, true);
      if (existing.some((drink) => norm(drink.name) === norm(name))) {
        return fail(`"${name}" already exists on ${target.name}. Use update_drink to change it, or pick a different name.`);
      }

      // Resolve ingredients before writing anything, so a typo cannot leave a half-made drink.
      const links = await resolveIngredientNames(ingredientNames, addMissingIngredients);
      if (links.problems.length > 0) return fail(links.problems.join("\n"));

      const matchedSection = target.sections.find((s) => norm(s) === norm(section)) ?? section.trim();
      const sortOrder = existing.reduce((max, drink) => Math.max(max, drink.sortOrder), 0) + 1;

      const drink = await storage.createDrink({
        menuId: target.id,
        name: name.trim(),
        section: matchedSection,
        description: fields.description ?? null,
        recipe: fields.recipe ?? null,
        style: fields.style ?? null,
        baseSpirit: fields.baseSpirit ?? null,
        temperature: fields.temperature ?? null,
        isMocktail: fields.isMocktail ?? false,
        canBeMocktail: fields.canBeMocktail ?? false,
        isStirred: fields.isStirred ?? false,
        isShaken: fields.isShaken ?? false,
        isActive: publish,
        isOutOfStock: false,
        sortOrder,
      });
      await storage.setDrinkIngredients(drink.id, links.ids);

      return ok({
        created: { id: drink.id, name: drink.name, menu: target.name, section: drink.section },
        visibility: publish
          ? target.isActive
            ? "Published: guests can see it now."
            : `Published on ${target.name}, but that menu is itself hidden.`
          : "Saved as a hidden draft. Publish it from the dashboard, or with update_drink isActive true.",
        ingredientsAddedToInventory: links.created,
        newSection: target.sections.some((s) => norm(s) === norm(section)) ? undefined : matchedSection,
      });
    },
  );

  server.registerTool(
    "update_drink",
    {
      title: "Update drink",
      description:
        "Edit an existing drink: text fields, recipe, flags, section, visibility (isActive), or the 86 switch (isOutOfStock). `ingredients`, when given, replaces the full list of linked inventory items. Only the fields you pass change.",
      inputSchema: {
        drink: z.string().min(1).describe("Drink name or id."),
        menu: z.string().optional().describe("Menu name, slug or id; needed only when the same drink name is on several menus."),
        name: z.string().min(1).max(120).optional().describe("Rename."),
        section: z.string().min(1).max(60).optional(),
        ...drinkFields,
        isActive: z.boolean().optional().describe("True publishes, false hides. Only publish when the owner asks."),
        isOutOfStock: z.boolean().optional().describe("True marks it 86'd for tonight."),
        ingredients: z.array(z.string().min(1)).max(30).optional().describe("Replaces all linked ingredients. Empty list unlinks everything."),
        addMissingIngredients: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ drink: reference, menu, ingredients: ingredientNames, addMissingIngredients = false, ...fields }) => {
      const target = await findDrink(reference, menu);
      if ("error" in target) return fail(target.error as string);

      const patch = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ) as Partial<Drink>;
      if (Object.keys(patch).length === 0 && ingredientNames === undefined) {
        return fail("Nothing to change. Pass at least one field to update.");
      }

      let links: Awaited<ReturnType<typeof resolveIngredientNames>> | undefined;
      if (ingredientNames !== undefined) {
        links = await resolveIngredientNames(ingredientNames, addMissingIngredients);
        if (links.problems.length > 0) return fail(links.problems.join("\n"));
      }

      if (Object.keys(patch).length > 0) {
        const saved = await storage.updateDrink(target.drink.id, patch);
        if (!saved) return fail("That drink was removed while updating. Call list_drinks and try again.");
      }
      if (links) await storage.setDrinkIngredients(target.drink.id, links.ids);

      return ok({
        updated: { id: target.drink.id, name: (patch.name as string | undefined) ?? target.drink.name, menu: target.menu.name },
        changedFields: [...Object.keys(patch), ...(links ? ["ingredients"] : [])],
        ingredientsAddedToInventory: links?.created ?? [],
      });
    },
  );

  server.registerTool(
    "create_menu",
    {
      title: "Create menu",
      description:
        "Create a new, hidden menu (for a season, a party, a theme). It stays invisible to guests until the owner activates it in the dashboard or asks you to with update_menu. Colours and hero image are set in the dashboard.",
      inputSchema: {
        name: z.string().min(1).max(120),
        description: z.string().max(600).optional(),
        sections: z.array(z.string().min(1).max(60)).max(20).optional().describe('Section headings in display order, e.g. ["Stirred", "Shaken", "No-proof"].'),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and single hyphens")
          .max(80)
          .optional()
          .describe("URL part for /menu/<slug>. Default: derived from the name."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ name, description, sections = [], slug }) => {
      const menus = await storage.getAllMenus();
      const taken = new Set(menus.map((menu) => menu.slug));
      if (slug && taken.has(slug)) {
        return fail(`The slug "${slug}" is already used. Pick another, or leave slug out to have one generated.`);
      }
      const base = slug ?? slugify(name);
      let candidate = base;
      for (let n = 2; taken.has(candidate); n += 1) candidate = `${base}-${n}`;

      const menu = await storage.createMenu({
        name: name.trim(),
        slug: candidate,
        description: description ?? null,
        sections,
        isActive: false,
      });
      return ok({
        created: { id: menu.id, name: menu.name, slug: menu.slug, sections: menu.sections },
        visibility: "Hidden. Activate it from the dashboard, or with update_menu isActive true.",
      });
    },
  );

  server.registerTool(
    "update_menu",
    {
      title: "Update menu",
      description:
        "Edit a menu's name, description, section order, or visibility. `sections` replaces the whole ordered list. Only activate a menu when the owner explicitly asks.",
      inputSchema: {
        menu: z.string().min(1).describe("Menu name, slug or id."),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(600).optional(),
        sections: z.array(z.string().min(1).max(60)).max(20).optional(),
        isActive: z.boolean().optional().describe("True shows the menu to guests."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ menu, ...fields }) => {
      const menus = await storage.getAllMenus();
      const found = resolveOne(menus, menu, menuLabel, menuAliases);
      if (!found.ok) return fail(describeMiss("menu", menu, found, "Call get_bar_overview to see the menus."));

      const patch = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ) as Partial<Menu>;
      if (Object.keys(patch).length === 0) return fail("Nothing to change. Pass at least one field to update.");

      const saved = await storage.updateMenu(found.item.id, patch);
      if (!saved) return fail("That menu was removed while updating. Call get_bar_overview and try again.");
      return ok({
        updated: { id: saved.id, name: saved.name, slug: saved.slug, isActive: saved.isActive, sections: saved.sections },
        changedFields: Object.keys(patch),
      });
    },
  );

  return server;
}
