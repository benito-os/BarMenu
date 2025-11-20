import { db } from "./db";
import { menus, drinks } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Create NYE menu
  const [nyeMenu] = await db
    .insert(menus)
    .values({
      slug: "nye-2025",
      name: "Black & Gold NYE 2025",
      description: "Ring in the new year with our sophisticated black and gold cocktail collection",
      isActive: true,
    })
    .returning();

  console.log("Created NYE menu:", nyeMenu.name);

  // Create Spring menu
  const [springMenu] = await db
    .insert(menus)
    .values({
      slug: "baltimore-spring",
      name: "Baltimore Spring Menu",
      description: "Fresh, vibrant cocktails celebrating the season",
      isActive: false,
    })
    .returning();

  console.log("Created Spring menu:", springMenu.name);

  // Create sample drinks for NYE menu
  const nyeDrinks = await db
    .insert(drinks)
    .values([
      {
        menuId: nyeMenu.id,
        name: "Midnight Espresso Martini",
        section: "STAYING AWAKE!",
        description: "Bold espresso with premium vodka and coffee liqueur",
        recipe: "2 oz vodka, 1 oz coffee liqueur, 1 oz fresh espresso, shake with ice",
        style: "Staying Awake",
        isMocktail: false,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Vodka",
        isActive: true,
        sortOrder: 1,
      },
      {
        menuId: nyeMenu.id,
        name: "Midnight Mocha",
        section: "STAYING AWAKE!",
        description: "Decadent chocolate and coffee fusion",
        recipe: "1.5 oz vodka, 1 oz coffee liqueur, 1 oz chocolate liqueur, 1 oz espresso",
        style: "Staying Awake",
        isMocktail: false,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Vodka",
        isActive: true,
        sortOrder: 2,
      },
      {
        menuId: nyeMenu.id,
        name: "Golden Hour",
        section: "FESTIVE AND FRUITY",
        description: "Champagne with elderflower and fresh citrus",
        recipe: "3 oz champagne, 1 oz elderflower liqueur, 0.5 oz lemon juice",
        style: "Festive and Fruity",
        isMocktail: false,
        isStirred: false,
        isShaken: false,
        baseSpirit: "Champagne",
        isActive: true,
        sortOrder: 1,
      },
      {
        menuId: nyeMenu.id,
        name: "Sparkling Sunrise",
        section: "FESTIVE AND FRUITY",
        description: "Non-alcoholic blend of citrus and sparkling botanicals",
        recipe: "3 oz sparkling water, 2 oz orange juice, 1 oz grenadine, garnish with orange slice",
        style: "Festive and Fruity",
        isMocktail: true,
        isStirred: false,
        isShaken: true,
        baseSpirit: null,
        isActive: true,
        sortOrder: 2,
      },
      {
        menuId: nyeMenu.id,
        name: "Bourbon Old Fashioned",
        section: "CLASSIC ELEGANCE",
        description: "Traditional bourbon cocktail with bitters and orange",
        recipe: "2 oz bourbon, 2 dashes Angostura bitters, 1 sugar cube, orange peel",
        style: "Classic Elegance",
        isMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Bourbon",
        isActive: true,
        sortOrder: 1,
      },
      {
        menuId: nyeMenu.id,
        name: "Manhattan Supreme",
        section: "CLASSIC ELEGANCE",
        description: "Premium whiskey with sweet vermouth and aromatic bitters",
        recipe: "2 oz rye whiskey, 1 oz sweet vermouth, 2 dashes Angostura bitters, cherry garnish",
        style: "Classic Elegance",
        isMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Whiskey",
        isActive: true,
        sortOrder: 2,
      },
      {
        menuId: nyeMenu.id,
        name: "Earl Grey Martini",
        section: "TEA-VANA",
        description: "Elegant gin martini infused with earl grey tea",
        recipe: "2 oz gin, 1 oz dry vermouth, earl grey tea infusion, lemon twist",
        style: "Tea-Vana",
        isMocktail: false,
        isStirred: true,
        isShaken: false,
        baseSpirit: "Gin",
        isActive: true,
        sortOrder: 1,
      },
      {
        menuId: nyeMenu.id,
        name: "Chamomile Dream",
        section: "TEA-VANA",
        description: "Soothing chamomile-infused vodka with honey and lemon",
        recipe: "2 oz chamomile-infused vodka, 0.5 oz honey syrup, 0.75 oz lemon juice",
        style: "Tea-Vana",
        isMocktail: false,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Vodka",
        isActive: true,
        sortOrder: 2,
      },
    ])
    .returning();

  console.log(`Created ${nyeDrinks.length} drinks for NYE menu`);

  // Create sample drinks for Spring menu
  const springDrinks = await db
    .insert(drinks)
    .values([
      {
        menuId: springMenu.id,
        name: "Garden Fizz",
        section: "SPRING REFRESHERS",
        description: "Fresh cucumber, mint, and elderflower with prosecco",
        recipe: "2 oz prosecco, 1 oz elderflower liqueur, fresh cucumber, mint leaves",
        style: "Spring Refresher",
        isMocktail: false,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Prosecco",
        isActive: true,
        sortOrder: 1,
      },
      {
        menuId: springMenu.id,
        name: "Strawberry Basil Smash",
        section: "SPRING REFRESHERS",
        description: "Muddled strawberries and basil with gin",
        recipe: "2 oz gin, 4 strawberries, 5 basil leaves, 0.75 oz lemon juice, 0.5 oz simple syrup",
        style: "Spring Refresher",
        isMocktail: false,
        isStirred: false,
        isShaken: true,
        baseSpirit: "Gin",
        isActive: true,
        sortOrder: 2,
      },
      {
        menuId: springMenu.id,
        name: "Lavender Lemonade",
        section: "BOTANICAL BLISS",
        description: "House-made lavender syrup with fresh lemon",
        recipe: "Lavender syrup, fresh lemon juice, sparkling water, lavender sprig garnish",
        style: "Botanical Bliss",
        isMocktail: true,
        isStirred: false,
        isShaken: true,
        baseSpirit: null,
        isActive: true,
        sortOrder: 1,
      },
    ])
    .returning();

  console.log(`Created ${springDrinks.length} drinks for Spring menu`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
