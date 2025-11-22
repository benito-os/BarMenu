import { readFile } from "fs/promises";
import stripJsonComments from "strip-json-comments";
import { storage } from "./storage";
import { insertMenuSchema, insertDrinkSchema } from "@shared/schema";
import type { InsertMenu, InsertDrink } from "@shared/schema";

interface DrinkData extends Omit<InsertDrink, "menuId"> {
  menuId?: string;
  [key: string]: any; // Allow extra fields that will be stripped during validation
}

interface MenuData extends InsertMenu {
  drinks?: DrinkData[];
  [key: string]: any; // Allow extra fields that will be stripped during validation
}

interface ImportData {
  menus: MenuData[];
}

async function importMenus(filePath: string) {
  try {
    console.log("📖 Reading menu data from:", filePath);
    const fileContent = await readFile(filePath, "utf-8");
    const cleanedContent = stripJsonComments(fileContent);
    const data: ImportData = JSON.parse(cleanedContent);

    // Validate root payload structure
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid JSON: root must be an object");
    }
    if (!data.menus || !Array.isArray(data.menus)) {
      throw new Error("Invalid JSON: 'menus' must be an array");
    }

    console.log(`\n🍸 Found ${data.menus.length} menu(s) to import\n`);

    let menusCreated = 0;
    let menusSkipped = 0;
    let menusFailed = 0;
    let drinksCreated = 0;
    let drinksFailed = 0;
    const errors: string[] = [];

    for (const menuData of data.menus) {
      const { drinks, ...menuFields } = menuData;

      try {
        // Check if menu already exists by slug
        const existingMenu = await storage.getMenuBySlug(menuData.slug);
        
        if (existingMenu) {
          console.log(`⏭️  Menu "${menuData.name}" (${menuData.slug}) already exists, skipping...`);
          menusSkipped++;
          continue;
        }

        // Explicitly pick only known menu fields to avoid schema mutation
        const cleanMenuData = {
          slug: menuFields.slug,
          name: menuFields.name,
          description: menuFields.description,
          isActive: menuFields.isActive,
          heroImageUrl: menuFields.heroImageUrl,
          backgroundColor: menuFields.backgroundColor,
          accentColor: menuFields.accentColor,
          typography: menuFields.typography,
          sections: menuFields.sections,
        };

        // Validate with original schema (no mutation)
        const validatedMenu = insertMenuSchema.parse(cleanMenuData);

        // Create the menu
        console.log(`📝 Creating menu: "${menuData.name}" (${menuData.slug})`);
        const createdMenu = await storage.createMenu(validatedMenu);
        menusCreated++;

        // Create drinks if any
        if (drinks && drinks.length > 0) {
          console.log(`   ├─ Creating ${drinks.length} drinks...`);
          let drinkSuccessCount = 0;
          let menuDrinksFailed = 0; // Per-menu drink failure counter
          
          for (const drinkData of drinks) {
            try {
              // Explicitly pick only known drink fields to avoid schema mutation
              const cleanDrinkData = {
                menuId: createdMenu.id,
                name: drinkData.name,
                section: drinkData.section,
                description: drinkData.description,
                recipe: drinkData.recipe,
                style: drinkData.style,
                temperature: drinkData.temperature,
                isMocktail: drinkData.isMocktail,
                canBeMocktail: drinkData.canBeMocktail,
                isStirred: drinkData.isStirred,
                isShaken: drinkData.isShaken,
                baseSpirit: drinkData.baseSpirit,
                isActive: drinkData.isActive,
                sortOrder: drinkData.sortOrder,
              };

              // Validate with original schema (no mutation)
              const validatedDrink = insertDrinkSchema.parse(cleanDrinkData);

              await storage.createDrink(validatedDrink);
              drinksCreated++;
              drinkSuccessCount++;
            } catch (drinkError) {
              drinksFailed++;
              menuDrinksFailed++;
              const errorMsg = `Failed to import drink "${drinkData.name}": ${drinkError instanceof Error ? drinkError.message : String(drinkError)}`;
              errors.push(errorMsg);
              console.error(`   │  ⚠️  ${errorMsg}`);
            }
          }
          
          if (drinkSuccessCount > 0) {
            console.log(`   └─ ✅ Created ${drinkSuccessCount} drinks`);
          }
          if (menuDrinksFailed > 0) {
            console.log(`   └─ ⚠️  Failed to create ${menuDrinksFailed} drinks for this menu`);
          }
        }

      } catch (error) {
        menusFailed++;
        const errorMsg = `Failed to import menu "${menuData.name}": ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        console.error(`   Skipping and continuing with next menu...\n`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Import Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Menus created:  ${menusCreated}`);
    console.log(`⏭️  Menus skipped:  ${menusSkipped} (already exist)`);
    console.log(`❌ Menus failed:   ${menusFailed}`);
    console.log(`🍹 Drinks created: ${drinksCreated}`);
    console.log(`❌ Drinks failed:  ${drinksFailed}`);
    console.log("=".repeat(60));

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
      console.log("");
    }

    if (menusCreated > 0 || drinksCreated > 0) {
      console.log("🎉 Import completed!\n");
    } else if (menusSkipped > 0) {
      console.log("ℹ️  No new menus were imported (all already exist).\n");
    } else {
      console.log("⚠️  Import completed with errors. Check logs above.\n");
    }

  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

// Get file path from command line argument or use default
const filePath = process.argv[2] || "attached_assets/Pasted--menus-slug-nye-art-deco-name-New-Year-s-Eve-Art-Deco-Menu--1763779460111_1763779460112.txt";

importMenus(filePath)
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
