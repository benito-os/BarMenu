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
  sectionHeaderColor: text("section_header_color"),
  menuTitleColor: text("menu_title_color"),
  typography: text("typography"),
  // Per-menu theme overrides for drink cards
  cardBackgroundColor: text("card_background_color"),
  cardBorderColor: text("card_border_color"),
  // Badge theming (applies to all badges: style, mocktail, etc.)
  badgeBackgroundColor: text("badge_background_color"),
  badgeTextColor: text("badge_text_color"),
  // Request button theming
  requestButtonBackgroundColor: text("request_button_background_color"),
  requestButtonTextColor: text("request_button_text_color"),
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
  isOutOfStock: boolean("is_out_of_stock").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertDrinkSchema = createInsertSchema(drinks).omit({
  id: true,
});

export type InsertDrink = z.infer<typeof insertDrinkSchema>;
export type Drink = typeof drinks.$inferSelect;

// Ingredients table
export const ingredients = pgTable("ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull().default("units"),
  onHand: integer("on_hand").notNull().default(0),
  parLevel: integer("par_level").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
  createdAt: true,
});

export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredients.$inferSelect;

// Drink Ingredients table
export const drinkIngredients = pgTable("drink_ingredients", {
  drinkId: varchar("drink_id").notNull().references(() => drinks.id, { onDelete: "cascade" }),
  ingredientId: varchar("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  amount: text("amount"),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drinkId: varchar("drink_id").notNull().references(() => drinks.id, { onDelete: 'cascade' }),
  menuId: varchar("menu_id").notNull().references(() => menus.id, { onDelete: 'cascade' }),
  guestName: text("guest_name"),
  comments: text("comments"),
  asMocktail: boolean("as_mocktail").notNull().default(false),
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

// Settings table (singleton - only one row)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default("default"),
  waitingWarningMinutes: integer("waiting_warning_minutes").notNull().default(3),
  waitingUrgentMinutes: integer("waiting_urgent_minutes").notNull().default(5),
  // Branding settings
  brandingLogoUrl: text("branding_logo_url"),
  welcomeMessage: text("welcome_message"),
  headlineFont: text("headline_font").default("playfair"),
  bodyFont: text("body_font").default("inter"),
  qrDotStyle: text("qr_dot_style").default("dots"),
  qrEyeStyle: text("qr_eye_style").default("rounded"),
  // Site-wide theme colors
  sitePrimaryColor: text("site_primary_color"),
  siteSurfaceColor: text("site_surface_color"),
  siteBadgeActiveColor: text("site_badge_active_color"),
  siteBadgeMocktailColor: text("site_badge_mocktail_color"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Typography preset options
export const FONT_PRESETS = {
  headline: [
    { id: "playfair", name: "Playfair Display", family: "'Playfair Display', serif" },
    { id: "lora", name: "Lora", family: "'Lora', serif" },
    { id: "roboto", name: "Roboto", family: "'Roboto', sans-serif" },
    { id: "opensans", name: "Open Sans", family: "'Open Sans', sans-serif" },
  ],
  body: [
    { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
    { id: "roboto", name: "Roboto", family: "'Roboto', sans-serif" },
    { id: "opensans", name: "Open Sans", family: "'Open Sans', sans-serif" },
    { id: "lora", name: "Lora", family: "'Lora', serif" },
  ],
} as const;

// QR code style options
export const QR_STYLES = {
  dotStyles: [
    { id: "dots", name: "Dots" },
    { id: "squares", name: "Squares" },
  ],
  eyeStyles: [
    { id: "rounded", name: "Rounded" },
    { id: "square", name: "Square" },
  ],
} as const;

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
  guestName: string | null;
};
