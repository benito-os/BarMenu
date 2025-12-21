// Reference: blueprint:javascript_database
import {
  type Menu,
  type InsertMenu,
  type Drink,
  type InsertDrink,
  type Order,
  type InsertOrder,
  type DrinkAnalytics,
  type OrderWithDrink,
  type Ingredient,
  type InsertIngredient,
  menus,
  drinks,
  drinkIngredients,
  ingredients,
  orders
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { withTransaction } from "./transactions";
import { StorageError } from "./errors";

export interface IStorage {
  // Menu operations
  getAllMenus(): Promise<Menu[]>;
  getMenuBySlug(slug: string): Promise<Menu | undefined>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: string, data: Partial<Menu>): Promise<Menu | undefined>;
  deleteMenu(id: string): Promise<void>;
  
  // Drink operations
  getDrinksByMenuId(menuId: string): Promise<Drink[]>;
  getAllDrinksByMenuId(menuId: string): Promise<Drink[]>;
  getDrinkById(id: string): Promise<Drink | undefined>;
  createDrink(drink: InsertDrink): Promise<Drink>;
  updateDrink(id: string, data: Partial<Drink>): Promise<Drink | undefined>;
  reorderDrinks(drinks: Array<{ id: string; sortOrder: number }>): Promise<void>;
  bulkDeleteDrinks(drinkIds: string[]): Promise<void>;
  bulkUpdateDrinks(drinkIds: string[], isActive: boolean): Promise<void>;
  setDrinkIngredients(drinkId: string, ingredientIds: string[]): Promise<void>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderQueue(): Promise<OrderWithDrink[]>;
  updateOrderStatus(id: string, status: string, completedAt?: Date): Promise<Order | undefined>;
  
  // Analytics operations
  getDrinkAnalytics(menuId?: string): Promise<DrinkAnalytics[]>;

  // Ingredient operations
  getIngredients(): Promise<Ingredient[]>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: string, data: Partial<Ingredient>): Promise<Ingredient | undefined>;
  deleteIngredient(id: string): Promise<void>;

  // Availability operations
  getDrinksWithAvailability(menuId: string, includeInactive?: boolean): Promise<(Drink & {
    ingredientIds: string[];
    missingIngredients: string[];
    isMakeable: boolean;
  })[]>;
  getActiveMenuDrinkAlerts(): Promise<Array<{
    menuId: string;
    menuName: string;
    drinkId: string;
    drinkName: string;
    missingIngredients: string[];
    isOutOfStock: boolean;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async getAllMenus(): Promise<Menu[]> {
    return await db.select().from(menus).orderBy(sql`${menus.createdAt} DESC`);
  }

  async getMenuBySlug(slug: string): Promise<Menu | undefined> {
    const [menu] = await db.select().from(menus).where(eq(menus.slug, slug));
    return menu || undefined;
  }

  async createMenu(insertMenu: InsertMenu): Promise<Menu> {
    const [menu] = await db.insert(menus).values(insertMenu).returning();
    return menu;
  }

  async updateMenu(id: string, data: Partial<Menu>): Promise<Menu | undefined> {
    const [menu] = await db.update(menus).set(data).where(eq(menus.id, id)).returning();
    return menu || undefined;
  }

  async deleteMenu(id: string): Promise<void> {
    await db.delete(menus).where(eq(menus.id, id));
  }

  async getDrinksByMenuId(menuId: string): Promise<Drink[]> {
    const results = await this.getDrinksWithAvailability(menuId, false);
    return results.map(({ ingredientIds: _ingredientIds, missingIngredients: _missingIngredients, isMakeable: _isMakeable, ...drink }) => drink);
  }

  async getAllDrinksByMenuId(menuId: string): Promise<Drink[]> {
    const results = await this.getDrinksWithAvailability(menuId, true);
    return results.map(({ ingredientIds: _ingredientIds, missingIngredients: _missingIngredients, isMakeable: _isMakeable, ...drink }) => drink);
  }

  async getDrinkById(id: string): Promise<Drink | undefined> {
    const [drink] = await db.select().from(drinks).where(eq(drinks.id, id));
    return drink || undefined;
  }

  async createDrink(insertDrink: InsertDrink): Promise<Drink> {
    const [drink] = await db.insert(drinks).values(insertDrink).returning();
    return drink;
  }

  async updateDrink(id: string, data: Partial<Drink>): Promise<Drink | undefined> {
    const [drink] = await db.update(drinks).set(data).where(eq(drinks.id, id)).returning();
    return drink || undefined;
  }

  async reorderDrinks(drinksToUpdate: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await withTransaction("reorderDrinks", async (tx) => {
      const updatedIds: string[] = [];

      for (const { id, sortOrder } of drinksToUpdate) {
        const updated = await tx
          .update(drinks)
          .set({ sortOrder })
          .where(eq(drinks.id, id))
          .returning({ id: drinks.id });

        if (updated.length === 0) {
          throw new StorageError("Drink not found while reordering", {
            status: 404,
            code: "DRINK_NOT_FOUND",
            context: { id },
          });
        }

        updatedIds.push(updated[0].id);
      }

      if (updatedIds.length !== drinksToUpdate.length) {
        throw new StorageError("Mismatch while reordering drinks", {
          status: 409,
          code: "DRINK_UPDATE_MISMATCH",
          context: { expected: drinksToUpdate.length, updated: updatedIds.length },
        });
      }
    });
  }

  async bulkDeleteDrinks(drinkIds: string[]): Promise<void> {
    await withTransaction("bulkDeleteDrinks", async (tx) => {
      const deleted = await tx
        .delete(drinks)
        .where(inArray(drinks.id, drinkIds))
        .returning({ id: drinks.id });

      const deletedIds = new Set(deleted.map((d) => d.id));
      const missing = drinkIds.filter((id) => !deletedIds.has(id));

      if (missing.length > 0) {
        throw new StorageError("Some drinks were not deleted", {
          status: 404,
          code: "DRINK_DELETE_MISMATCH",
          context: { missing },
        });
      }
    });
  }

  async bulkUpdateDrinks(drinkIds: string[], isActive: boolean): Promise<void> {
    await withTransaction("bulkUpdateDrinks", async (tx) => {
      const updated = await tx
        .update(drinks)
        .set({ isActive })
        .where(inArray(drinks.id, drinkIds))
        .returning({ id: drinks.id });

      const updatedIds = new Set(updated.map((d) => d.id));
      const missing = drinkIds.filter((id) => !updatedIds.has(id));

      if (missing.length > 0) {
        throw new StorageError("Some drinks were not updated", {
          status: 404,
          code: "DRINK_UPDATE_MISMATCH",
          context: { missing },
        });
      }
    });
  }

  async setDrinkIngredients(drinkId: string, ingredientIds: string[]): Promise<void> {
    await withTransaction("setDrinkIngredients", async (tx) => {
      await tx.delete(drinkIngredients).where(eq(drinkIngredients.drinkId, drinkId));

      if (ingredientIds.length === 0) {
        return;
      }

      const uniqueIngredientIds = Array.from(new Set(ingredientIds));
      const values = uniqueIngredientIds.map((ingredientId) => ({
        drinkId,
        ingredientId,
      }));

      await tx.insert(drinkIngredients).values(values);
    });
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    return await withTransaction("createOrder", async (tx) => {
      const [targetDrink] = await tx
        .select({ id: drinks.id, menuId: drinks.menuId, isActive: drinks.isActive, isOutOfStock: drinks.isOutOfStock })
        .from(drinks)
        .where(eq(drinks.id, insertOrder.drinkId));

      if (!targetDrink) {
        throw new StorageError("Drink not found for order", {
          status: 404,
          code: "DRINK_NOT_FOUND",
          context: { drinkId: insertOrder.drinkId },
        });
      }

      if (targetDrink.menuId !== insertOrder.menuId) {
        throw new StorageError("Drink does not belong to menu", {
          status: 400,
          code: "MENU_MISMATCH",
          context: { drinkMenuId: targetDrink.menuId, requestMenuId: insertOrder.menuId },
        });
      }

      if (!targetDrink.isActive) {
        throw new StorageError("Drink is inactive", {
          status: 400,
          code: "DRINK_INACTIVE",
          context: { drinkId: insertOrder.drinkId },
        });
      }

      if (targetDrink.isOutOfStock) {
        throw new StorageError("Drink is out of stock", {
          status: 400,
          code: "DRINK_OUT_OF_STOCK",
          context: { drinkId: insertOrder.drinkId },
        });
      }

      const [availability] = await tx
        .select({
          missingIngredients: sql<string[]>`
            COALESCE(
              array_agg(DISTINCT ${ingredients.name})
              FILTER (WHERE ${ingredients.id} IS NOT NULL AND (${ingredients.onHand} <= 0 OR ${ingredients.isActive} = false)),
              ARRAY[]::text[]
            )
          `,
        })
        .from(drinks)
        .leftJoin(drinkIngredients, eq(drinks.id, drinkIngredients.drinkId))
        .leftJoin(ingredients, eq(drinkIngredients.ingredientId, ingredients.id))
        .where(eq(drinks.id, insertOrder.drinkId))
        .groupBy(drinks.id);

      if (availability?.missingIngredients && availability.missingIngredients.length > 0) {
        throw new StorageError("Drink ingredients are unavailable", {
          status: 400,
          code: "DRINK_INGREDIENTS_UNAVAILABLE",
          context: {
            drinkId: insertOrder.drinkId,
            missingIngredients: availability.missingIngredients,
          },
        });
      }

      const [order] = await tx.insert(orders).values(insertOrder).returning();

      if (!order) {
        throw new StorageError("Order could not be created", {
          status: 500,
          code: "ORDER_INSERT_FAILED",
        });
      }

      return order;
    });
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderQueue(): Promise<OrderWithDrink[]> {
    const results = await db
      .select({
        id: orders.id,
        drinkId: orders.drinkId,
        menuId: orders.menuId,
        guestName: orders.guestName,
        status: orders.status,
        requestedAt: orders.requestedAt,
        completedAt: orders.completedAt,
        drinkName: drinks.name,
        drinkSection: drinks.section,
        drinkRecipe: drinks.recipe,
        drinkDescription: drinks.description,
        drinkStyle: drinks.style,
        drinkBaseSpirit: drinks.baseSpirit,
        drinkTemperature: drinks.temperature,
        drinkIsMocktail: drinks.isMocktail,
        drinkCanBeMocktail: drinks.canBeMocktail,
        drinkIsStirred: drinks.isStirred,
        drinkIsShaken: drinks.isShaken,
      })
      .from(orders)
      .innerJoin(drinks, eq(orders.drinkId, drinks.id))
      .where(inArray(orders.status, ["requested", "in_progress"]))
      .orderBy(orders.requestedAt);

    // Map to ensure drinkRecipe is never null (provide fallback)
    return results.map((r): OrderWithDrink => ({
      ...r,
      guestName: r.guestName ?? null,
      drinkRecipe: r.drinkRecipe || "-",
      drinkDescription: r.drinkDescription || "",
      drinkStyle: r.drinkStyle || "",
      drinkBaseSpirit: r.drinkBaseSpirit || "",
      drinkTemperature: r.drinkTemperature || "",
    }));
  }

  async updateOrderStatus(id: string, status: string, completedAt?: Date): Promise<Order | undefined> {
    const updateData: any = { status };
    if (completedAt || status === "served") {
      updateData.completedAt = completedAt || new Date();
    }

    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    
    return order || undefined;
  }

  async getDrinkAnalytics(menuId?: string): Promise<DrinkAnalytics[]> {
    const baseQuery = db
      .select({
        id: drinks.id,
        name: drinks.name,
        section: drinks.section,
        menuId: drinks.menuId,
        orderCount: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.id} END) AS INTEGER)`,
      })
      .from(drinks)
      .leftJoin(orders, eq(orders.drinkId, drinks.id))
      .groupBy(drinks.id, drinks.name, drinks.section, drinks.menuId);

    const results = menuId
      ? await baseQuery.where(eq(drinks.menuId, menuId))
      : await baseQuery;

    return results.map(result => ({
      ...result,
      isNeverMade: result.orderCount === 0,
    }));
  }

  async getIngredients(): Promise<Ingredient[]> {
    return await db.select().from(ingredients).orderBy(ingredients.name);
  }

  async createIngredient(insertIngredient: InsertIngredient): Promise<Ingredient> {
    const [ingredient] = await db.insert(ingredients).values(insertIngredient).returning();
    return ingredient;
  }

  async updateIngredient(id: string, data: Partial<Ingredient>): Promise<Ingredient | undefined> {
    const [ingredient] = await db.update(ingredients).set(data).where(eq(ingredients.id, id)).returning();
    return ingredient || undefined;
  }

  async deleteIngredient(id: string): Promise<void> {
    // First delete drink-ingredient associations to avoid orphaned references
    await db.delete(drinkIngredients).where(eq(drinkIngredients.ingredientId, id));
    // Then delete the ingredient
    await db.delete(ingredients).where(eq(ingredients.id, id));
  }

  async getDrinksWithAvailability(menuId: string, includeInactive = false): Promise<(Drink & {
    ingredientIds: string[];
    missingIngredients: string[];
    isMakeable: boolean;
  })[]> {
    const results = await db
      .select({
        id: drinks.id,
        menuId: drinks.menuId,
        name: drinks.name,
        section: drinks.section,
        description: drinks.description,
        recipe: drinks.recipe,
        style: drinks.style,
        temperature: drinks.temperature,
        isMocktail: drinks.isMocktail,
        canBeMocktail: drinks.canBeMocktail,
        isStirred: drinks.isStirred,
        isShaken: drinks.isShaken,
        baseSpirit: drinks.baseSpirit,
        isActive: drinks.isActive,
        isOutOfStock: drinks.isOutOfStock,
        sortOrder: drinks.sortOrder,
        ingredientIds: sql<string[]>`
          COALESCE(
            array_agg(DISTINCT ${drinkIngredients.ingredientId})
            FILTER (WHERE ${drinkIngredients.ingredientId} IS NOT NULL),
            ARRAY[]::text[]
          )
        `,
        missingIngredients: sql<string[]>`
          COALESCE(
            array_agg(DISTINCT ${ingredients.name})
            FILTER (WHERE ${ingredients.id} IS NOT NULL AND (${ingredients.onHand} <= 0 OR ${ingredients.isActive} = false)),
            ARRAY[]::text[]
          )
        `,
      })
      .from(drinks)
      .leftJoin(drinkIngredients, eq(drinks.id, drinkIngredients.drinkId))
      .leftJoin(ingredients, eq(drinkIngredients.ingredientId, ingredients.id))
      .where(
        includeInactive
          ? eq(drinks.menuId, menuId)
          : and(eq(drinks.menuId, menuId), eq(drinks.isActive, true)),
      )
      .groupBy(drinks.id)
      .orderBy(drinks.section, drinks.sortOrder);

    return results.map((drink) => ({
      ...drink,
      ingredientIds: drink.ingredientIds ?? [],
      missingIngredients: drink.missingIngredients ?? [],
      isMakeable: !drink.isOutOfStock && (drink.missingIngredients ?? []).length === 0,
    }));
  }

  async getActiveMenuDrinkAlerts(): Promise<Array<{
    menuId: string;
    menuName: string;
    drinkId: string;
    drinkName: string;
    missingIngredients: string[];
    isOutOfStock: boolean;
  }>> {
    const activeMenus = await db
      .select({ id: menus.id, name: menus.name })
      .from(menus)
      .where(eq(menus.isActive, true));

    if (activeMenus.length === 0) {
      return [];
    }

    const menuIds = activeMenus.map((menu) => menu.id);
    const menuNameLookup = new Map(activeMenus.map((menu) => [menu.id, menu.name]));

    const results = await db
      .select({
        menuId: drinks.menuId,
        drinkId: drinks.id,
        drinkName: drinks.name,
        isOutOfStock: drinks.isOutOfStock,
        missingIngredients: sql<string[]>`
          COALESCE(
            array_agg(DISTINCT ${ingredients.name})
            FILTER (WHERE ${ingredients.id} IS NOT NULL AND (${ingredients.onHand} <= 0 OR ${ingredients.isActive} = false)),
            ARRAY[]::text[]
          )
        `,
      })
      .from(drinks)
      .leftJoin(drinkIngredients, eq(drinks.id, drinkIngredients.drinkId))
      .leftJoin(ingredients, eq(drinkIngredients.ingredientId, ingredients.id))
      .where(and(inArray(drinks.menuId, menuIds), eq(drinks.isActive, true)))
      .groupBy(drinks.id);

    return results
      .filter((drink) => drink.isOutOfStock || (drink.missingIngredients ?? []).length > 0)
      .map((drink) => ({
        menuId: drink.menuId,
        menuName: menuNameLookup.get(drink.menuId) ?? "Active Menu",
        drinkId: drink.drinkId,
        drinkName: drink.drinkName,
        missingIngredients: drink.missingIngredients ?? [],
        isOutOfStock: drink.isOutOfStock,
      }));
  }
}

export const storage = new DatabaseStorage();
