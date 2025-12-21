import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { isStorageError } from "./errors";
import { storage } from "./storage";
import {
  analyticsQuerySchema,
  drinkBulkDeleteSchema,
  drinkBulkUpdateSchema,
  drinkCreateSchema,
  drinkIdParamsSchema,
  drinkReorderSchema,
  drinkUpdateSchema,
  ingredientCreateSchema,
  ingredientUpdateSchema,
  menuCreateSchema,
  menuIdQuerySchema,
  menuSlugSchema,
  menuUpdateSchema,
  idParamsSchema,
  orderCreateSchema,
  orderStatusUpdateSchema,
} from "@shared/validation";

export async function registerRoutes(app: Express): Promise<Server> {
  const respondValidationError = (
    res: Response,
    error: unknown,
    message: string,
  ) => {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: message, details: error.issues });
    }

    return res.status(400).json({ error: message });
  };

  const validate = <T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    res: Response,
    message: string,
  ): T | undefined => {
    const result = schema.safeParse(data);
    if (!result.success) {
      respondValidationError(res, result.error, message);
      return undefined;
    }

    return result.data;
  };

  // Simple hardcoded password - in production this would use proper hashing
  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "barflores2025";

  // POST /api/auth/login - Dashboard login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Only allow "admin" username
      if (username !== "admin") {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (password === DASHBOARD_PASSWORD) {
        req.session.isAuthenticated = true;
        // Explicitly save session to ensure it persists
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({ error: "Session save failed" });
          }
          res.json({ success: true });
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // GET /api/auth/check - Check if user is authenticated
  app.get("/api/auth/check", async (req, res) => {
    res.json({ isAuthenticated: !!req.session.isAuthenticated });
  });

  // POST /api/auth/logout - Logout
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // GET /api/menus - Get all menus
  app.get("/api/menus", async (req, res) => {
    try {
      const menus = await storage.getAllMenus();
      res.json(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ error: "Failed to fetch menus" });
    }
  });

  // GET /api/menus/:slug - Get menu by slug
  app.get("/api/menus/:slug", async (req, res) => {
    try {
      const params = validate(menuSlugSchema, req.params, res, "Invalid menu slug");
      if (!params) return;
      const { slug } = params;
      const menu = await storage.getMenuBySlug(slug);

      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });

  // POST /api/menus - Create new menu
  app.post("/api/menus", async (req, res) => {
    try {
      const validatedData = validate(menuCreateSchema, req.body, res, "Invalid menu data");
      if (!validatedData) return;
      const menu = await storage.createMenu(validatedData);
      res.status(201).json(menu);
    } catch (error) {
      console.error("Error creating menu:", error);
      res.status(500).json({ error: "Failed to create menu" });
    }
  });

  // PATCH /api/menus/:id - Update menu (any fields including theming)
  app.patch("/api/menus/:id", async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Menu id is required");
      if (!params) return;
      const updateData = validate(menuUpdateSchema, req.body, res, "Invalid menu update data");
      if (!updateData) return;

      const menu = await storage.updateMenu(params.id, updateData);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      console.error("Error updating menu:", error);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  // DELETE /api/menus/:id - Delete menu
  app.delete("/api/menus/:id", async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Menu id is required");
      if (!params) return;
      await storage.deleteMenu(params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu:", error);
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });

  // GET /api/drinks?menuId=xxx - Get drinks by menu ID (active only)
  app.get("/api/drinks", async (req, res) => {
    try {
      const query = validate(menuIdQuerySchema, req.query, res, "menuId query parameter is required");
      if (!query) return;

      const drinks = await storage.getDrinksWithAvailability(query.menuId, false);
      res.json(drinks);
    } catch (error) {
      console.error("Error fetching drinks:", error);
      res.status(500).json({ error: "Failed to fetch drinks" });
    }
  });

  // GET /api/drinks/all?menuId=xxx - Get all drinks by menu ID (including inactive, for admin)
  app.get("/api/drinks/all", async (req, res) => {
    try {
      const query = validate(menuIdQuerySchema, req.query, res, "menuId query parameter is required");
      if (!query) return;

      const drinks = await storage.getDrinksWithAvailability(query.menuId, true);
      res.json(drinks);
    } catch (error) {
      console.error("Error fetching all drinks:", error);
      res.status(500).json({ error: "Failed to fetch all drinks" });
    }
  });

  // GET /api/drinks/:id - Get drink by ID
  app.get("/api/drinks/:id", async (req, res) => {
    try {
      const params = validate(drinkIdParamsSchema, req.params, res, "Invalid drink id");
      if (!params) return;
      const drink = await storage.getDrinkById(params.id);

      if (!drink) {
        return res.status(404).json({ error: "Drink not found" });
      }
      
      res.json(drink);
    } catch (error) {
      console.error("Error fetching drink:", error);
      res.status(500).json({ error: "Failed to fetch drink" });
    }
  });

  // POST /api/drinks - Create new drink
  app.post("/api/drinks", async (req, res) => {
    try {
      const validatedData = validate(drinkCreateSchema, req.body, res, "Invalid drink data");
      if (!validatedData) return;
      const { ingredientIds = [], ...drinkData } = validatedData;
      const drink = await storage.createDrink(drinkData);
      await storage.setDrinkIngredients(drink.id, ingredientIds);
      res.status(201).json(drink);
    } catch (error) {
      console.error("Error creating drink:", error);
      res.status(500).json({ error: "Failed to create drink" });
    }
  });

  // PATCH /api/drinks/reorder - Update drink sort orders
  app.patch("/api/drinks/reorder", async (req, res) => {
    try {
      const payload = validate(drinkReorderSchema, req.body, res, "Invalid reorder payload");
      if (!payload) return;

      await storage.reorderDrinks(payload.drinks);
      res.json({ success: true });
    } catch (error) {
      const mappedError = mapStorageError(error);
      if (mappedError) {
        console.warn("Reorder drinks failed", mappedError);
        return res.status(mappedError.status).json(mappedError.body);
      }

      console.error("Error reordering drinks:", error);
      res.status(500).json({ error: "Failed to reorder drinks" });
    }
  });

  // DELETE /api/drinks/bulk - Bulk delete drinks
  app.delete("/api/drinks/bulk", async (req, res) => {
    try {
      const payload = validate(drinkBulkDeleteSchema, req.body, res, "Invalid bulk delete payload");
      if (!payload) return;

      await storage.bulkDeleteDrinks(payload.drinkIds);
      res.json({ success: true, deleted: payload.drinkIds.length });
    } catch (error) {
      const mappedError = mapStorageError(error);
      if (mappedError) {
        console.warn("Bulk delete failed", mappedError);
        return res.status(mappedError.status).json(mappedError.body);
      }

      console.error("Error bulk deleting drinks:", error);
      res.status(500).json({ error: "Failed to delete drinks" });
    }
  });

  // PATCH /api/drinks/bulk - Bulk update drinks (activate/deactivate)
  app.patch("/api/drinks/bulk", async (req, res) => {
    try {
      console.log("Bulk update request body:", req.body);
      const payload = validate(drinkBulkUpdateSchema, req.body, res, "Invalid bulk update payload");
      if (!payload) return;

      console.log(`Updating ${payload.drinkIds.length} drinks, setting isActive to ${payload.isActive}`);
      await storage.bulkUpdateDrinks(payload.drinkIds, payload.isActive);
      console.log("Bulk update successful");
      res.json({ success: true, updated: payload.drinkIds.length });
    } catch (error) {
      const mappedError = mapStorageError(error);
      if (mappedError) {
        console.warn("Bulk update failed", mappedError);
        return res.status(mappedError.status).json(mappedError.body);
      }

      console.error("Error bulk updating drinks:", error);
      res.status(500).json({ error: "Failed to update drinks" });
    }
  });

  // PATCH /api/drinks/:id - Update drink
  app.patch("/api/drinks/:id", async (req, res) => {
    try {
      const params = validate(drinkIdParamsSchema, req.params, res, "Invalid drink id");
      if (!params) return;
      const updateData = validate(drinkUpdateSchema, req.body, res, "Invalid drink update data");
      if (!updateData) return;

      const { ingredientIds, ...drinkUpdates } = updateData;
      const drink = await storage.updateDrink(params.id, drinkUpdates);
      if (!drink) {
        return res.status(404).json({ error: "Drink not found" });
      }
      if (ingredientIds) {
        await storage.setDrinkIngredients(params.id, ingredientIds);
      }
      res.json(drink);
    } catch (error) {
      console.error("Error updating drink:", error);
      res.status(500).json({ error: "Failed to update drink" });
    }
  });

  // GET /api/ingredients - Get all ingredients
  app.get("/api/ingredients", async (_req, res) => {
    try {
      const ingredients = await storage.getIngredients();
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ error: "Failed to fetch ingredients" });
    }
  });

  // POST /api/ingredients - Create new ingredient
  app.post("/api/ingredients", async (req, res) => {
    try {
      const validatedData = validate(ingredientCreateSchema, req.body, res, "Invalid ingredient data");
      if (!validatedData) return;
      const ingredient = await storage.createIngredient(validatedData);
      res.status(201).json(ingredient);
    } catch (error) {
      console.error("Error creating ingredient:", error);
      res.status(500).json({ error: "Failed to create ingredient" });
    }
  });

  // PATCH /api/ingredients/:id - Update ingredient
  app.patch("/api/ingredients/:id", async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Invalid ingredient id");
      if (!params) return;
      const updateData = validate(ingredientUpdateSchema, req.body, res, "Invalid ingredient update data");
      if (!updateData) return;

      const ingredient = await storage.updateIngredient(params.id, updateData);
      if (!ingredient) {
        return res.status(404).json({ error: "Ingredient not found" });
      }
      res.json(ingredient);
    } catch (error) {
      console.error("Error updating ingredient:", error);
      res.status(500).json({ error: "Failed to update ingredient" });
    }
  });

  // DELETE /api/ingredients/:id - Delete ingredient
  app.delete("/api/ingredients/:id", async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Invalid ingredient id");
      if (!params) return;
      await storage.deleteIngredient(params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      res.status(500).json({ error: "Failed to delete ingredient" });
    }
  });

  // GET /api/availability/active-menus - Drinks unavailable due to stock
  app.get("/api/availability/active-menus", async (_req, res) => {
    try {
      const alerts = await storage.getActiveMenuDrinkAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching availability alerts:", error);
      res.status(500).json({ error: "Failed to fetch availability alerts" });
    }
  });

  // POST /api/orders - Create new order (guest requests drink)
  app.post("/api/orders", async (req, res) => {
    try {
      // Extend the schema to allow optional guestName
      const orderSchema = orderCreateSchema.extend({
        menuId: z.string().optional(),
      });
      const validatedData = orderSchema.parse(req.body);

      // Validate drink and menu relationship before creating the order
      const drink = await storage.getDrinkById(validatedData.drinkId);
      if (!drink) {
        return res.status(400).json({ error: "Drink not found" });
      }

      const menuId = validatedData.menuId ?? drink.menuId;

      if (validatedData.menuId && validatedData.menuId !== drink.menuId) {
        return res.status(400).json({ error: "Drink does not belong to the specified menu" });
      }

      const order = await storage.createOrder({
        ...validatedData,
        menuId,
      });
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // GET /api/orders/queue - Get live queue of pending orders
  app.get("/api/orders/queue", async (req, res) => {
    try {
      const queue = await storage.getOrderQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching order queue:", error);
      res.status(500).json({ error: "Failed to fetch order queue" });
    }
  });

  // GET /api/orders/:id - Get single order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Order id is required");
      if (!params) return;

      const order = await storage.getOrderById(params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // PATCH /api/orders/:id - Update order status
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Order id is required");
      if (!params) return;
      const body = validate(orderStatusUpdateSchema, req.body, res, "Invalid order status");
      if (!body) return;

      // Get current order to validate transition
      const currentOrder = await storage.getOrderById(params.id);
      if (!currentOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Validate status transitions to enforce workflow
      const validTransitions: Record<string, string[]> = {
        "requested": ["in_progress", "cancelled"],
        "in_progress": ["served", "cancelled"],
        "served": [], // Final state
        "cancelled": [], // Final state
      };
      
      const allowedStatuses = validTransitions[currentOrder.status] || [];
      if (!allowedStatuses.includes(body.status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${currentOrder.status} to ${body.status}`,
          allowedTransitions: allowedStatuses
        });
      }

      const order = await storage.updateOrderStatus(
        params.id,
        body.status,
        body.status === "served" ? new Date() : undefined
      );
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // GET /api/analytics - Get drink analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const query = validate(analyticsQuerySchema, req.query, res, "Invalid analytics query");
      if (!query) return;

      const analytics = await storage.getDrinkAnalytics(query.menuId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
  const mapStorageError = (error: unknown) => {
    if (isStorageError(error)) {
      return {
        status: error.options.status,
        body: {
          error: error.message,
          code: error.options.code,
          details: error.options.context,
        },
      } as const;
    }

    return null;
  };
