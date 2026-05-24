import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  drinks,
  drinkIngredients,
  ingredients,
  insertDrinkSchema,
  insertIngredientSchema,
  insertMenuSchema,
  insertOrderSchema,
  menus,
  orders,
} from "../schema";

export const menuSchema = createSelectSchema(menus);
export const drinkSchema = createSelectSchema(drinks);
export const ingredientSchema = createSelectSchema(ingredients);
export const orderSchema = createSelectSchema(orders);

export const menuCreateSchema = insertMenuSchema.strict();
export const menuUpdateSchema = menuCreateSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one menu field must be provided",
  });

const baseDrinkCreateSchema = insertDrinkSchema.strict();
export const drinkCreateSchema = baseDrinkCreateSchema.extend({
  ingredientIds: z.array(z.string().min(1)).optional(),
});
export const drinkUpdateSchema = baseDrinkCreateSchema
  .partial()
  .strict()
  .extend({
    ingredientIds: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one drink field must be provided",
  });

export const ingredientCreateSchema = insertIngredientSchema.strict();
export const ingredientUpdateSchema = ingredientCreateSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one ingredient field must be provided",
  });

export const drinkReorderSchema = z.object({
  drinks: z
    .array(
      z.object({
        id: z.string().min(1, "id is required"),
        sortOrder: z.number().int(),
      }),
    )
    .nonempty("At least one drink reorder entry is required"),
});

export const drinkBulkDeleteSchema = z.object({
  drinkIds: z.array(z.string().min(1)).nonempty("drinkIds is required"),
});

export const drinkBulkUpdateSchema = z.object({
  drinkIds: z.array(z.string().min(1)).nonempty("drinkIds is required"),
  isActive: z.boolean(),
});

export const drinkIngredientSchema = createSelectSchema(drinkIngredients);

export const orderCreateSchema = insertOrderSchema
  .extend({
    guestName: z.string().min(1).optional(),
    comments: z.string().optional(),
    asMocktail: z.boolean().optional(),
  })
  .strict();

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["requested", "in_progress", "served", "cancelled"]),
});

export const orderBatchUpdateSchema = z.object({
  orderIds: z.array(z.string().min(1)).nonempty("orderIds is required"),
  status: z.enum(["in_progress", "served"]),
});

export const settingsUpdateSchema = z
  .object({
    waitingWarningMinutes: z.number().int().min(1),
    waitingUrgentMinutes: z.number().int().min(1),
    brandingLogoUrl: z.string().nullable(),
    welcomeMessage: z.string().nullable(),
    headlineFont: z.string().min(1),
    bodyFont: z.string().min(1),
    qrDotStyle: z.string().min(1),
    qrEyeStyle: z.string().min(1),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one setting field must be provided",
  });

export const csvImportSchema = z.object({
  csv: z
    .string()
    .min(1, "csv is required")
    .max(2_000_000, "csv payload exceeds 2MB limit"),
});

export const menuSlugSchema = z.object({
  slug: z.string().min(1, "slug is required"),
});

export const menuIdQuerySchema = z.object({
  menuId: z.string().min(1, "menuId query parameter is required"),
});

export const idParamsSchema = z.object({
  id: z.string().min(1, "id is required"),
});

export const drinkIdParamsSchema = idParamsSchema;

export const analyticsQuerySchema = z.object({
  menuId: z.string().min(1).optional(),
});

export const drinkAnalyticsSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string(),
  menuId: z.string(),
  orderCount: z.number(),
  isNeverMade: z.boolean(),
});

export const drinkAvailabilitySchema = drinkSchema.extend({
  ingredientIds: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  isMakeable: z.boolean(),
});

export const orderWithDrinkSchema = orderSchema
  .omit({
    guestName: true,
  })
  .extend({
    guestName: z.string().nullable(),
    drinkName: z.string(),
    drinkSection: z.string(),
    drinkRecipe: z.string(),
    drinkDescription: z.string(),
    drinkStyle: z.string(),
    drinkBaseSpirit: z.string(),
    drinkTemperature: z.string(),
    drinkIsMocktail: z.boolean(),
    drinkCanBeMocktail: z.boolean(),
    drinkIsStirred: z.boolean(),
    drinkIsShaken: z.boolean(),
    drinkIsOutOfStock: z.boolean(),
  });

export type Menu = z.infer<typeof menuSchema>;
export type Drink = z.infer<typeof drinkSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Order = z.infer<typeof orderSchema>;
export type InsertMenu = z.infer<typeof menuCreateSchema>;
export type InsertDrink = z.infer<typeof drinkCreateSchema>;
export type InsertIngredient = z.infer<typeof ingredientCreateSchema>;
export type InsertOrder = z.infer<typeof orderCreateSchema>;
export type DrinkReorderRequest = z.infer<typeof drinkReorderSchema>;
export type DrinkBulkUpdateRequest = z.infer<typeof drinkBulkUpdateSchema>;
export type OrderWithDrink = z.infer<typeof orderWithDrinkSchema>;
export type DrinkAnalytics = z.infer<typeof drinkAnalyticsSchema>;
export type DrinkAvailability = z.infer<typeof drinkAvailabilitySchema>;
