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
  menus,
  drinks,
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
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderQueue(): Promise<OrderWithDrink[]>;
  updateOrderStatus(id: string, status: string, completedAt?: Date): Promise<Order | undefined>;
  
  // Analytics operations
  getDrinkAnalytics(menuId?: string): Promise<DrinkAnalytics[]>;
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
    return await db
      .select()
      .from(drinks)
      .where(and(eq(drinks.menuId, menuId), eq(drinks.isActive, true)))
      .orderBy(drinks.section, drinks.sortOrder);
  }

  async getAllDrinksByMenuId(menuId: string): Promise<Drink[]> {
    return await db
      .select()
      .from(drinks)
      .where(eq(drinks.menuId, menuId))
      .orderBy(drinks.section, drinks.sortOrder);
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

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    return await withTransaction("createOrder", async (tx) => {
      const [targetDrink] = await tx
        .select({ id: drinks.id, menuId: drinks.menuId, isActive: drinks.isActive })
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
}

export const storage = new DatabaseStorage();
