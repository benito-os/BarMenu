import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Menus table
export const menus = pgTable("menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(false),
  heroImageUrl: text("hero_image_url"),
  backgroundColor: text("background_color"),
  accentColor: text("accent_color"),
  typography: text("typography"),
  sections: text("sections").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMenuSchema = createInsertSchema(menus).omit({
  id: true,
  createdAt: true,
});

export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menus.$inferSelect;

// Drinks table
export const drinks = pgTable("drinks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuId: varchar("menu_id").notNull().references(() => menus.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  section: text("section").notNull(),
  description: text("description"),
  recipe: text("recipe"),
  style: text("style"), // e.g., "Staying Awake", "Festive and Fruity"
  temperature: text("temperature"), // "hot" | "cold" | "room_temp" | null
  isMocktail: boolean("is_mocktail").notNull().default(false),
  canBeMocktail: boolean("can_be_mocktail").notNull().default(false),
  isStirred: boolean("is_stirred").notNull().default(false),
  isShaken: boolean("is_shaken").notNull().default(false),
  baseSpirit: text("base_spirit"), // e.g., "Bourbon", "Vodka", "Espresso"
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertDrinkSchema = createInsertSchema(drinks).omit({
  id: true,
});

export type InsertDrink = z.infer<typeof insertDrinkSchema>;
export type Drink = typeof drinks.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drinkId: varchar("drink_id").notNull().references(() => drinks.id, { onDelete: 'cascade' }),
  menuId: varchar("menu_id").notNull().references(() => menus.id, { onDelete: 'cascade' }),
  guestName: text("guest_name"),
  status: text("status").notNull().default("requested"), // "requested" | "in_progress" | "served" | "cancelled"
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  status: true,
  requestedAt: true,
  completedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Analytics types
export type DrinkAnalytics = {
  id: string;
  name: string;
  section: string;
  menuId: string;
  orderCount: number;
  isNeverMade: boolean;
};

export type OrderWithDrink = Order & {
  drinkName: string;
  drinkSection: string;
  drinkRecipe: string;
  drinkDescription: string;
  drinkStyle: string;
  drinkBaseSpirit: string;
  drinkTemperature: string;
  drinkIsMocktail: boolean;
  drinkCanBeMocktail: boolean;
  drinkIsStirred: boolean;
  drinkIsShaken: boolean;
  guestName?: string;
};
