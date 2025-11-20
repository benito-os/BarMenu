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

export interface IStorage {
  // Menu operations
  getAllMenus(): Promise<Menu[]>;
  getMenuBySlug(slug: string): Promise<Menu | undefined>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: string, data: Partial<Menu>): Promise<Menu | undefined>;
  
  // Drink operations
  getDrinksByMenuId(menuId: string): Promise<Drink[]>;
  getDrinkById(id: string): Promise<Drink | undefined>;
  createDrink(drink: InsertDrink): Promise<Drink>;
  
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

  async getDrinksByMenuId(menuId: string): Promise<Drink[]> {
    return await db
      .select()
      .from(drinks)
      .where(and(eq(drinks.menuId, menuId), eq(drinks.isActive, true)))
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

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
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
      })
      .from(orders)
      .innerJoin(drinks, eq(orders.drinkId, drinks.id))
      .where(inArray(orders.status, ["requested", "in_progress"]))
      .orderBy(orders.requestedAt);

    return results;
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
