/**
 * Demo seed: an invented bar so a fresh fork has something on the landing
 * page, in the queue, and in analytics before the operator has written a
 * single drink.
 *
 *   npm run seed:demo            # add the demo bar (skips anything already there)
 *   npm run seed:demo -- --reset # remove the demo menus + ingredients, then re-add
 *
 * Safe to run against a database that already has real data: it only
 * touches rows it created (menu slugs prefixed `demo-`, ingredient names
 * listed below) and never writes settings, branding, or orders. The schema
 * must exist first (`npm run db:push`).
 *
 * The bar, menus and drinks are fictional. The Lantern Room does not exist.
 */
import { storage } from "../server/storage";
import { pool } from "../server/db";
import type { InsertDrink, InsertIngredient, InsertMenu } from "@shared/schema";

type DemoDrink = Omit<InsertDrink, "menuId"> & { ingredients?: string[] };
type DemoMenu = InsertMenu & { drinks: DemoDrink[] };

const DEMO_SLUG_PREFIX = "demo-";

const demoIngredients: InsertIngredient[] = [
  { name: "Demo Rye Whiskey", category: "Spirits", unit: "bottles", onHand: 2, parLevel: 2, isActive: true },
  { name: "Demo London Dry Gin", category: "Spirits", unit: "bottles", onHand: 3, parLevel: 2, isActive: true },
  { name: "Demo Blanco Tequila", category: "Spirits", unit: "bottles", onHand: 1, parLevel: 2, isActive: true },
  { name: "Demo Sweet Vermouth", category: "Fortified", unit: "bottles", onHand: 1, parLevel: 1, isActive: true },
  { name: "Demo Pear Syrup", category: "Syrups", unit: "ml", onHand: 350, parLevel: 500, isActive: true },
  { name: "Demo Fresh Lemons", category: "Produce", unit: "each", onHand: 0, parLevel: 12, isActive: true },
  { name: "Demo Egg Whites", category: "Produce", unit: "each", onHand: 6, parLevel: 6, isActive: true },
];

const demoMenus: DemoMenu[] = [
  {
    slug: "demo-late-harvest",
    name: "Late Harvest",
    description:
      "Orchard fruit, brown spirits and a little smoke. Six drinks, two of them without alcohol.",
    isActive: true,
    heroImageUrl: null,
    backgroundColor: "#f6efe4",
    accentColor: "#8a4b1f",
    sectionHeaderColor: "#4a2c12",
    menuTitleColor: "#2b1a0c",
    typography: null,
    sections: ["Stirred & Strong", "Bright & Sour", "No Alcohol"],
    drinks: [
      {
        name: "Orchard Manhattan",
        section: "Stirred & Strong",
        description: "Rye, sweet vermouth and a spoon of pear syrup. Stirred cold, served up.",
        recipe: "2 oz rye\n0.75 oz sweet vermouth\n0.25 oz pear syrup\n2 dashes aromatic bitters\nStir 30 s, strain up, lemon peel",
        style: "Spirit-forward",
        temperature: "cold",
        isMocktail: false,
        canBeMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Rye",
        isActive: true,
        isOutOfStock: false,
        sortOrder: 1,
        ingredients: ["Demo Rye Whiskey", "Demo Sweet Vermouth", "Demo Pear Syrup"],
      },
      {
        name: "Smoked Lantern",
        section: "Stirred & Strong",
        description: "An old fashioned under a cloche of applewood smoke. Takes a minute; worth it.",
        recipe: "2 oz rye\n1 bar spoon demerara syrup\n2 dashes bitters\nStir, rocks glass, big cube\nSmoke under cloche 30 s, orange peel",
        style: "Spirit-forward",
        temperature: "cold",
        isMocktail: false,
        canBeMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Rye",
        isActive: true,
        isOutOfStock: false,
        sortOrder: 2,
        ingredients: ["Demo Rye Whiskey"],
      },
      {
        name: "Pear & Thyme Sour",
        section: "Bright & Sour",
        description: "Gin, lemon, pear syrup and a sprig of thyme, shaken with egg white for a soft top.",
        recipe: "1.5 oz gin\n0.75 oz lemon\n0.75 oz pear syrup\n1 egg white\nDry shake, wet shake, strain up, thyme sprig",
        style: "Sour",
        temperature: "cold",
        isMocktail: false,
        canBeMocktail: true,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Gin",
        isActive: true,
        isOutOfStock: false,
        sortOrder: 1,
        ingredients: ["Demo London Dry Gin", "Demo Fresh Lemons", "Demo Pear Syrup", "Demo Egg Whites"],
      },
      {
        name: "Cider House Margarita",
        section: "Bright & Sour",
        description: "Blanco tequila, lime, and a splash of dry cider instead of the usual orange liqueur.",
        recipe: "1.5 oz blanco tequila\n0.75 oz lime\n0.5 oz agave\nShake, strain over ice, top 1 oz dry cider, salt half-rim",
        style: "Sour",
        temperature: "cold",
        isMocktail: false,
        canBeMocktail: false,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Tequila",
        isActive: true,
        isOutOfStock: false,
        sortOrder: 2,
        ingredients: ["Demo Blanco Tequila"],
      },
      {
        name: "Hot Pear Toddy",
        section: "No Alcohol",
        description: "Pear syrup, lemon, hot water, clove-studded lemon wheel. The drink to hold with both hands.",
        recipe: "1 oz pear syrup\n0.5 oz lemon\n5 oz hot water\nClove-studded lemon wheel",
        style: "Warm",
        temperature: "hot",
        isMocktail: true,
        canBeMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: null,
        isActive: true,
        isOutOfStock: false,
        sortOrder: 1,
        ingredients: ["Demo Pear Syrup", "Demo Fresh Lemons"],
      },
      {
        name: "Garden Tonic",
        section: "No Alcohol",
        description: "Cucumber, tonic, a pinch of salt and a lot of ice. Reads as a drink, not a consolation.",
        recipe: "3 cucumber slices, muddled\n0.25 oz simple\nPinch of salt\nTop with tonic over ice, cucumber ribbon",
        style: "Long",
        temperature: "cold",
        isMocktail: true,
        canBeMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: null,
        isActive: true,
        isOutOfStock: false,
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "demo-midwinter",
    name: "Midwinter",
    description: "Last season's list, kept for the record. Shows how an archived menu looks in the dashboard.",
    isActive: false,
    heroImageUrl: null,
    backgroundColor: "#eef1f5",
    accentColor: "#1f3a5f",
    sectionHeaderColor: "#1f3a5f",
    menuTitleColor: "#101c2c",
    typography: null,
    sections: ["Warm", "Cold"],
    drinks: [
      {
        name: "Spiced Rye Punch",
        section: "Warm",
        description: "Rye, black tea, orange, warm spice. Ladled from a pot.",
        recipe: "1.5 oz rye\n3 oz spiced black tea\n0.5 oz orange juice\n0.25 oz honey syrup\nServe hot, orange wheel",
        style: "Warm",
        temperature: "hot",
        isMocktail: false,
        canBeMocktail: true,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Rye",
        isActive: true,
        isOutOfStock: false,
        sortOrder: 1,
      },
      {
        name: "Frost Gimlet",
        section: "Cold",
        description: "Gin and lime cordial, very cold, nothing else.",
        recipe: "2 oz gin\n0.75 oz lime cordial\nStir on ice until frosted, strain up",
        style: "Spirit-forward",
        temperature: "cold",
        isMocktail: false,
        canBeMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Gin",
        isActive: true,
        isOutOfStock: true,
        sortOrder: 1,
      },
      {
        name: "Blackcurrant Fizz",
        section: "Cold",
        description: "Blackcurrant cordial, lemon, soda. No alcohol.",
        recipe: "1 oz blackcurrant cordial\n0.5 oz lemon\nTop soda over ice",
        style: "Long",
        temperature: "cold",
        isMocktail: true,
        canBeMocktail: false,
        isStirred: false,
        isShaken: false,
        baseSpirit: null,
        isActive: true,
        isOutOfStock: false,
        sortOrder: 2,
      },
    ],
  },
];

async function resetDemo(): Promise<void> {
  const existing = await storage.getAllMenus();
  const demo = existing.filter((m) => m.slug.startsWith(DEMO_SLUG_PREFIX));
  for (const menu of demo) {
    await storage.deleteMenu(menu.id); // cascades to drinks, drink_ingredients, orders
    console.log(`removed menu ${menu.slug}`);
  }
  const ingredients = await storage.getIngredients();
  const names = new Set(demoIngredients.map((i) => i.name));
  for (const ingredient of ingredients) {
    if (names.has(ingredient.name)) {
      await storage.deleteIngredient(ingredient.id);
      console.log(`removed ingredient ${ingredient.name}`);
    }
  }
}

async function seedDemo(): Promise<void> {
  // Ingredients first so drinks can link to them. Match on name so a second
  // run reuses what is already there instead of duplicating.
  const existingIngredients = await storage.getIngredients();
  const ingredientIdByName = new Map(existingIngredients.map((i) => [i.name, i.id]));
  for (const ingredient of demoIngredients) {
    if (ingredientIdByName.has(ingredient.name)) {
      console.log(`ingredient exists: ${ingredient.name}`);
      continue;
    }
    const created = await storage.createIngredient(ingredient);
    ingredientIdByName.set(created.name, created.id);
    console.log(`added ingredient ${created.name}`);
  }

  let menusAdded = 0;
  let drinksAdded = 0;
  for (const { drinks, ...menuFields } of demoMenus) {
    if (await storage.getMenuBySlug(menuFields.slug)) {
      console.log(`menu exists: ${menuFields.slug} (skipped)`);
      continue;
    }
    const menu = await storage.createMenu(menuFields);
    menusAdded += 1;
    for (const { ingredients = [], ...drinkFields } of drinks) {
      const drink = await storage.createDrink({ ...drinkFields, menuId: menu.id });
      const ids = ingredients
        .map((name) => ingredientIdByName.get(name))
        .filter((id): id is string => typeof id === "string");
      if (ids.length > 0) {
        await storage.setDrinkIngredients(drink.id, ids);
      }
      drinksAdded += 1;
    }
    console.log(`added menu ${menu.slug} with ${drinks.length} drinks`);
  }

  console.log("");
  console.log(`done: ${menusAdded} menu(s), ${drinksAdded} drink(s) added.`);
  if (menusAdded > 0) {
    console.log("Open / for the landing page, /menu/demo-late-harvest for the active menu,");
    console.log("and /dashboard/inventory to see 'Demo Fresh Lemons' at zero stock (which");
    console.log("marks Pear & Thyme Sour and Hot Pear Toddy as missing an ingredient).");
  }
}

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");
  if (reset) {
    console.log("--reset: removing demo rows first");
    await resetDemo();
  }
  await seedDemo();
}

main()
  .catch((error) => {
    console.error("seed-demo failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
