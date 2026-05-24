import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { timingSafeEqual } from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { isStorageError } from "./errors";
import { storage } from "./storage";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import {
  analyticsQuerySchema,
  csvImportSchema,
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
  orderBatchUpdateSchema,
  orderCreateSchema,
  orderDetailsUpdateSchema,
  orderIdsQuerySchema,
  orderStatusUpdateSchema,
  settingsUpdateSchema,
} from "@shared/validation";

const MAX_CSV_ROWS = 5000;

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

  // Generic over the schema itself (not just its output) so that schemas with
  // transforms / pipes — where input and output types differ — still satisfy
  // the constraint. The return type is inferred from the schema's output.
  const validate = <S extends z.ZodTypeAny>(
    schema: S,
    data: unknown,
    res: Response,
    message: string,
  ): z.infer<S> | undefined => {
    const result = schema.safeParse(data);
    if (!result.success) {
      respondValidationError(res, result.error, message);
      return undefined;
    }

    return result.data;
  };

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

  const requireAuth = (
    req: import("express").Request,
    res: Response,
    next: import("express").NextFunction,
  ) => {
    if (req.session?.isAuthenticated) {
      return next();
    }
    return res.status(401).json({ error: "Authentication required" });
  };

  // Read dashboard password from env. No source-code fallback — see fail-fast
  // check at boot in server/index.ts for production. In dev, a missing value
  // disables login (returns 401) so credentials are never accidentally hardcoded.
  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

  const passwordMatches = (provided: string, expected: string): boolean => {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  };

  // Rate limit login attempts. With trust proxy = 1 set in index.ts, this keys
  // off X-Forwarded-For (Replit's proxy) so each client IP gets its own bucket.
  // skipSuccessfulRequests so legitimate logins don't burn through the budget.
  const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
  });

  // POST /api/auth/login - Dashboard login
  app.post("/api/auth/login", loginRateLimit, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (!DASHBOARD_PASSWORD) {
        console.error("DASHBOARD_PASSWORD env var is not set; login disabled");
        return res.status(503).json({ error: "Login is not configured" });
      }

      // Only allow "admin" username
      if (username !== "admin") {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (passwordMatches(password, DASHBOARD_PASSWORD)) {
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
  app.post("/api/menus", requireAuth, async (req, res) => {
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
  app.patch("/api/menus/:id", requireAuth, async (req, res) => {
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
  app.delete("/api/menus/:id", requireAuth, async (req, res) => {
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

  // POST /api/menus/:id/duplicate - Deep-copy a menu + its drinks
  app.post("/api/menus/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Menu id is required");
      if (!params) return;
      const copy = await storage.duplicateMenu(params.id);
      res.status(201).json(copy);
    } catch (error) {
      const mapped = mapStorageError(error);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      console.error("Error duplicating menu:", error);
      res.status(500).json({ error: "Failed to duplicate menu" });
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
  app.get("/api/drinks/all", requireAuth, async (req, res) => {
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
  app.post("/api/drinks", requireAuth, async (req, res) => {
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
  app.patch("/api/drinks/reorder", requireAuth, async (req, res) => {
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
  app.delete("/api/drinks/bulk", requireAuth, async (req, res) => {
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
  app.patch("/api/drinks/bulk", requireAuth, async (req, res) => {
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

  // POST /api/drinks/:id/duplicate - Copy a drink within its menu
  app.post("/api/drinks/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const params = validate(drinkIdParamsSchema, req.params, res, "Invalid drink id");
      if (!params) return;
      const copy = await storage.duplicateDrink(params.id);
      res.status(201).json(copy);
    } catch (error) {
      const mapped = mapStorageError(error);
      if (mapped) return res.status(mapped.status).json(mapped.body);
      console.error("Error duplicating drink:", error);
      res.status(500).json({ error: "Failed to duplicate drink" });
    }
  });

  // PATCH /api/drinks/:id - Update drink
  app.patch("/api/drinks/:id", requireAuth, async (req, res) => {
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
  app.get("/api/ingredients", requireAuth, async (_req, res) => {
    try {
      const ingredients = await storage.getIngredients();
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ error: "Failed to fetch ingredients" });
    }
  });

  // POST /api/ingredients - Create new ingredient
  app.post("/api/ingredients", requireAuth, async (req, res) => {
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
  app.patch("/api/ingredients/:id", requireAuth, async (req, res) => {
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
  app.delete("/api/ingredients/:id", requireAuth, async (req, res) => {
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
  app.get("/api/availability/active-menus", requireAuth, async (_req, res) => {
    try {
      const alerts = await storage.getActiveMenuDrinkAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching availability alerts:", error);
      res.status(500).json({ error: "Failed to fetch availability alerts" });
    }
  });

  // Order create schema allows menuId to be omitted — handler derives it from
  // the drink record when missing. Built once at registration to avoid
  // rebuilding the schema on every request.
  const publicOrderCreateSchema = orderCreateSchema.extend({
    menuId: z.string().optional(),
  });

  // In-memory order placement log keyed by client IP. Stores timestamps of
  // recent successful orders so the rate-limit middleware can count
  // requests in the rolling window. Cleaned up opportunistically on each
  // hit and via a periodic sweep below.
  const orderHitsByIp = new Map<string, number[]>();
  const RATE_WINDOW_MS = 60 * 60 * 1000;

  // Periodically prune IPs that haven't ordered in over an hour. Prevents
  // unbounded growth from drive-by traffic. Interval is unref'd so it
  // doesn't block process exit.
  setInterval(() => {
    const cutoff = Date.now() - RATE_WINDOW_MS;
    Array.from(orderHitsByIp.entries()).forEach(([ip, hits]) => {
      const fresh = hits.filter((t: number) => t > cutoff);
      if (fresh.length === 0) orderHitsByIp.delete(ip);
      else orderHitsByIp.set(ip, fresh);
    });
  }, 5 * 60 * 1000).unref?.();

  // Tiny TTL cache around storage.getSettings so the rate limit can read
  // its threshold per request without hammering Postgres.
  let cachedSettings: { value: Awaited<ReturnType<typeof storage.getSettings>>; fetchedAt: number } | null = null;
  const SETTINGS_TTL_MS = 30 * 1000;
  const getCachedSettings = async () => {
    if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
      return cachedSettings.value;
    }
    const value = await storage.getSettings();
    cachedSettings = { value, fetchedAt: Date.now() };
    return value;
  };

  // POST /api/orders - Create new order (guest requests drink)
  app.post("/api/orders", async (req, res) => {
    try {
      // Per-IP rate limit. orderRateLimitPerHour = 0 disables.
      const currentSettings = await getCachedSettings();
      const limit = currentSettings.orderRateLimitPerHour;
      if (limit > 0) {
        const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
        const now = Date.now();
        const cutoff = now - RATE_WINDOW_MS;
        const hits = (orderHitsByIp.get(ip) ?? []).filter((t) => t > cutoff);
        if (hits.length >= limit) {
          return res.status(429).json({
            error: `Too many orders from this device in the last hour. Try again later.`,
            retryAfterSeconds: Math.ceil((hits[0] + RATE_WINDOW_MS - now) / 1000),
          });
        }
        // Record this attempt — even if validation fails below, the request
        // counts. Otherwise an attacker could send invalid bodies forever.
        hits.push(now);
        orderHitsByIp.set(ip, hits);
      }

      const validatedData = validate(
        publicOrderCreateSchema,
        req.body,
        res,
        "Invalid order data",
      );
      if (!validatedData) return;

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
  app.get("/api/orders/queue", requireAuth, async (req, res) => {
    try {
      const queue = await storage.getOrderQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching order queue:", error);
      res.status(500).json({ error: "Failed to fetch order queue" });
    }
  });

  // GET /api/orders/by-ids?ids=a,b,c - Batch lookup for guest order tracking.
  // Public (same as GET /api/orders/:id) so the menu page can poll status
  // without an admin session. Must be registered before /api/orders/:id so the
  // literal "by-ids" path isn't captured as an order id.
  app.get("/api/orders/by-ids", async (req, res) => {
    try {
      const query = validate(
        orderIdsQuerySchema,
        req.query,
        res,
        "Invalid ids query parameter",
      );
      if (!query) return;

      const found = await storage.getOrdersByIds(query.ids);
      res.json(found);
    } catch (error) {
      console.error("Error fetching orders by ids:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
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

  // PATCH /api/orders/:id/details - Edit guest-facing fields (guestName,
  // comments, asMocktail) before the order is served. Separate endpoint from
  // PATCH /api/orders/:id (which is for status transitions) to keep the two
  // workflows clearly distinct. Must be registered before /api/orders/:id so
  // the literal "details" path segment isn't captured as a status update body.
  app.patch("/api/orders/:id/details", requireAuth, async (req, res) => {
    try {
      const params = validate(idParamsSchema, req.params, res, "Order id is required");
      if (!params) return;
      const body = validate(
        orderDetailsUpdateSchema,
        req.body,
        res,
        "Invalid order details update payload",
      );
      if (!body) return;

      const current = await storage.getOrderById(params.id);
      if (!current) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (current.status === "served" || current.status === "cancelled") {
        return res.status(400).json({
          error: `Cannot edit details on a ${current.status} order`,
        });
      }

      const updated = await storage.updateOrderDetails(params.id, body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating order details:", error);
      res.status(500).json({ error: "Failed to update order details" });
    }
  });

  // PATCH /api/orders/:id - Update order status
  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
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

  // POST /api/orders/batch - Batch update order statuses
  app.post("/api/orders/batch", requireAuth, async (req, res) => {
    try {
      const payload = validate(
        orderBatchUpdateSchema,
        req.body,
        res,
        "Invalid batch order update payload",
      );
      if (!payload) return;

      const count = await storage.batchUpdateOrderStatus(
        payload.orderIds,
        payload.status,
      );
      res.json({ updated: count });
    } catch (error) {
      console.error("Error batch updating orders:", error);
      res.status(500).json({ error: "Failed to batch update orders" });
    }
  });

  // DELETE /api/orders/served - Clear all served orders
  app.delete("/api/orders/served", requireAuth, async (req, res) => {
    try {
      const count = await storage.deleteServedOrders();
      res.json({ deleted: count });
    } catch (error) {
      console.error("Error clearing served orders:", error);
      res.status(500).json({ error: "Failed to clear served orders" });
    }
  });

  // GET /api/analytics - Get drink analytics
  app.get("/api/analytics", requireAuth, async (req, res) => {
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

  // ============ SETTINGS ENDPOINTS ============

  // GET /api/settings - Get application settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // PATCH /api/settings - Update application settings
  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const payload = validate(
        settingsUpdateSchema,
        req.body,
        res,
        "Invalid settings update payload",
      );
      if (!payload) return;

      const settings = await storage.updateSettings(payload);
      // Bust the TTL cache so the new rate limit (and any other tunable)
      // takes effect on the very next request instead of after ~30s.
      cachedSettings = null;
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============ EXPORT ENDPOINTS ============
  
  // Helper to escape CSV field values
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Helper to convert array to CSV row
  const toCSVRow = (values: unknown[]): string => {
    return values.map(escapeCSV).join(",");
  };

  // GET /api/export/menus - Export all menus as CSV
  app.get("/api/export/menus", requireAuth, async (req, res) => {
    try {
      const menus = await storage.getAllMenus();
      const headers = ["id", "slug (REQUIRED)", "name (REQUIRED)", "description", "isActive", "heroImageUrl", "backgroundColor", "accentColor", "sectionHeaderColor", "menuTitleColor", "typography", "sections", "createdAt"];
      const rows = menus.map(m => [
        m.id, m.slug, m.name, m.description || "", m.isActive ? "true" : "false",
        m.heroImageUrl || "", m.backgroundColor || "", m.accentColor || "",
        m.sectionHeaderColor || "", m.menuTitleColor || "",
        m.typography || "", (m.sections || []).join("|"), m.createdAt
      ]);
      
      const csv = [toCSVRow(headers), ...rows.map(toCSVRow)].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=menus_export.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting menus:", error);
      res.status(500).json({ error: "Failed to export menus" });
    }
  });

  // GET /api/export/drinks - Export all drinks as CSV
  app.get("/api/export/drinks", requireAuth, async (req, res) => {
    try {
      const menus = await storage.getAllMenus();
      const allDrinks: any[] = [];
      for (const menu of menus) {
        const drinks = await storage.getDrinksWithAvailability(menu.id, true);
        allDrinks.push(...drinks);
      }
      
      const headers = [
        "id", "menuId (REQUIRED)", "name (REQUIRED)", "section (REQUIRED)", "description", "recipe", "style",
        "temperature", "isMocktail", "canBeMocktail", "isStirred", "isShaken",
        "baseSpirit", "isActive", "isOutOfStock", "sortOrder"
      ];
      const rows = allDrinks.map(d => [
        d.id, d.menuId, d.name, d.section, d.description || "", d.recipe || "", d.style || "",
        d.temperature || "", d.isMocktail ? "true" : "false", d.canBeMocktail ? "true" : "false",
        d.isStirred ? "true" : "false", d.isShaken ? "true" : "false",
        d.baseSpirit || "", d.isActive ? "true" : "false", d.isOutOfStock ? "true" : "false", d.sortOrder
      ]);
      
      const csv = [toCSVRow(headers), ...rows.map(toCSVRow)].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=drinks_export.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting drinks:", error);
      res.status(500).json({ error: "Failed to export drinks" });
    }
  });

  // GET /api/export/ingredients - Export all ingredients as CSV
  app.get("/api/export/ingredients", requireAuth, async (req, res) => {
    try {
      const ingredients = await storage.getIngredients();
      const headers = ["id", "name (REQUIRED)", "category", "unit (REQUIRED)", "onHand", "parLevel", "isActive", "createdAt"];
      const rows = ingredients.map(i => [
        i.id, i.name, i.category || "", i.unit, i.onHand, i.parLevel,
        i.isActive ? "true" : "false", i.createdAt
      ]);
      
      const csv = [toCSVRow(headers), ...rows.map(toCSVRow)].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=ingredients_export.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting ingredients:", error);
      res.status(500).json({ error: "Failed to export ingredients" });
    }
  });

  // GET /api/export/orders - Export all orders as CSV
  app.get("/api/export/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getOrderQueue();
      const headers = [
        "id", "drinkId (REQUIRED)", "menuId (REQUIRED)", "guestName", "comments",
        "asMocktail", "status", "requestedAt", "completedAt", "drinkName"
      ];
      const rows = orders.map(o => [
        o.id, o.drinkId, o.menuId, o.guestName || "", o.comments || "",
        o.asMocktail ? "true" : "false", o.status, o.requestedAt, o.completedAt || "", o.drinkName
      ]);
      
      const csv = [toCSVRow(headers), ...rows.map(toCSVRow)].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=orders_export.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ error: "Failed to export orders" });
    }
  });

  // ============ TEMPLATE ENDPOINTS ============
  
  // GET /api/templates/menus - Get empty CSV template for menus
  app.get("/api/templates/menus", requireAuth, async (req, res) => {
    const headers = ["slug (REQUIRED)", "name (REQUIRED)", "description", "isActive", "heroImageUrl", "backgroundColor", "accentColor", "sectionHeaderColor", "menuTitleColor", "typography", "sections"];
    const exampleRow = ["summer-2024", "Summer Menu", "Our summer cocktail selection", "true", "", "#f5f5f5", "#c9a227", "#333333", "#1a1a1a", "Playfair Display", "Classic|Signature|Mocktails"];
    
    const csv = [toCSVRow(headers), toCSVRow(exampleRow)].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=menus_template.csv");
    res.send(csv);
  });

  // GET /api/templates/drinks - Get empty CSV template for drinks
  app.get("/api/templates/drinks", requireAuth, async (req, res) => {
    const headers = [
      "menuId (REQUIRED)", "name (REQUIRED)", "section (REQUIRED)", "description", "recipe", "style",
      "temperature", "isMocktail", "canBeMocktail", "isStirred", "isShaken",
      "baseSpirit", "isActive", "isOutOfStock", "sortOrder"
    ];
    const exampleRow = [
      "menu-uuid-here", "Old Fashioned", "Classic", "A timeless bourbon cocktail", "2oz bourbon, 1/4oz simple, bitters",
      "Strong & Boozy", "cold", "false", "false", "true", "false", "Bourbon", "true", "false", "1"
    ];
    
    const csv = [toCSVRow(headers), toCSVRow(exampleRow)].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=drinks_template.csv");
    res.send(csv);
  });

  // GET /api/templates/ingredients - Get empty CSV template for ingredients
  app.get("/api/templates/ingredients", requireAuth, async (req, res) => {
    const headers = ["name (REQUIRED)", "category", "unit (REQUIRED)", "onHand", "parLevel", "isActive"];
    const exampleRow = ["Buffalo Trace Bourbon", "Spirits", "bottles", "5", "3", "true"];
    
    const csv = [toCSVRow(headers), toCSVRow(exampleRow)].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=ingredients_template.csv");
    res.send(csv);
  });

  // GET /api/templates/orders - Get empty CSV template for orders
  app.get("/api/templates/orders", requireAuth, async (req, res) => {
    const headers = ["drinkId (REQUIRED)", "menuId (REQUIRED)", "guestName", "comments", "asMocktail"];
    const exampleRow = ["drink-uuid-here", "menu-uuid-here", "John", "Extra ice please", "false"];
    
    const csv = [toCSVRow(headers), toCSVRow(exampleRow)].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders_template.csv");
    res.send(csv);
  });

  // ============ IMPORT ENDPOINTS ============
  
  // Helper to parse CSV
  const parseCSV = (csvText: string): { headers: string[]; rows: string[][] } => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseRow(lines[0]).map(h => h.replace(" (REQUIRED)", "").trim());
    const rows = lines.slice(1).map(parseRow);
    return { headers, rows };
  };

  // Helper to convert row to object based on headers
  const rowToObject = (headers: string[], row: string[]): Record<string, string> => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });
    return obj;
  };

  // Validate the import payload (size limit via zod) and parse the CSV.
  // Also enforces a row cap so a multi-million-row CSV can't tie up the loop.
  const parseImportPayload = (
    body: unknown,
    res: Response,
  ): { headers: string[]; rows: string[][] } | undefined => {
    const payload = validate(csvImportSchema, body, res, "Invalid CSV payload");
    if (!payload) return undefined;

    const parsed = parseCSV(payload.csv);
    if (parsed.rows.length > MAX_CSV_ROWS) {
      res.status(400).json({
        error: `CSV exceeds row limit of ${MAX_CSV_ROWS}`,
        rows: parsed.rows.length,
      });
      return undefined;
    }
    return parsed;
  };

  // Execute an import (or preview of one) for a given entity type. Used by
  // all four /api/import/* endpoints. When ?dryRun=true is passed, validates
  // and returns a sample without touching the DB.
  type RowResult<T> = { rowNum: number; data: T } | { rowNum: number; error: string };
  async function executeImport<T>(
    req: import("express").Request,
    res: Response,
    parsed: { headers: string[]; rows: string[][] },
    buildRow: (obj: Record<string, string>) => T | string,
    create: (data: T) => Promise<unknown>,
  ): Promise<void> {
    const results: RowResult<T>[] = parsed.rows.map((row, i) => {
      const built = buildRow(rowToObject(parsed.headers, row));
      return typeof built === "string"
        ? { rowNum: i + 2, error: built }
        : { rowNum: i + 2, data: built };
    });

    if (req.query.dryRun === "true") {
      const errors = results
        .filter((r): r is { rowNum: number; error: string } => "error" in r)
        .map((r) => `Row ${r.rowNum}: ${r.error}`);
      const valid = results.filter(
        (r): r is { rowNum: number; data: T } => "data" in r,
      );
      res.json({
        preview: true,
        totalRows: results.length,
        validRows: valid.length,
        errors,
        sample: valid.slice(0, 5).map((r) => r.data),
      });
      return;
    }

    let imported = 0;
    const errors: string[] = [];
    for (const r of results) {
      if ("error" in r) {
        errors.push(`Row ${r.rowNum}: ${r.error}`);
        continue;
      }
      try {
        await create(r.data);
        imported += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${r.rowNum}: ${message}`);
      }
    }
    res.json({ imported, errors });
  }

  // POST /api/import/menus[?dryRun=true] - Import (or preview) menus from CSV
  app.post("/api/import/menus", requireAuth, async (req, res) => {
    try {
      const parsed = parseImportPayload(req.body, res);
      if (!parsed) return;
      await executeImport(
        req,
        res,
        parsed,
        (obj) => {
          if (!obj.slug || !obj.name) return "slug and name are required";
          return {
            slug: obj.slug,
            name: obj.name,
            description: obj.description || null,
            isActive: obj.isActive === "true",
            heroImageUrl: obj.heroImageUrl || null,
            backgroundColor: obj.backgroundColor || null,
            accentColor: obj.accentColor || null,
            sectionHeaderColor: obj.sectionHeaderColor || null,
            menuTitleColor: obj.menuTitleColor || null,
            typography: obj.typography || null,
            sections: obj.sections ? obj.sections.split("|").filter(Boolean) : [],
          };
        },
        (data) => storage.createMenu(data),
      );
    } catch (error) {
      console.error("Error importing menus:", error);
      res.status(500).json({ error: "Failed to import menus" });
    }
  });

  // POST /api/import/drinks[?dryRun=true] - Import (or preview) drinks from CSV
  app.post("/api/import/drinks", requireAuth, async (req, res) => {
    try {
      const parsed = parseImportPayload(req.body, res);
      if (!parsed) return;
      await executeImport(
        req,
        res,
        parsed,
        (obj) => {
          if (!obj.menuId || !obj.name || !obj.section) {
            return "menuId, name, and section are required";
          }
          return {
            menuId: obj.menuId,
            name: obj.name,
            section: obj.section,
            description: obj.description || null,
            recipe: obj.recipe || null,
            style: obj.style || null,
            temperature: obj.temperature || null,
            isMocktail: obj.isMocktail === "true",
            canBeMocktail: obj.canBeMocktail === "true",
            isStirred: obj.isStirred === "true",
            isShaken: obj.isShaken === "true",
            baseSpirit: obj.baseSpirit || null,
            isActive: obj.isActive !== "false",
            isOutOfStock: obj.isOutOfStock === "true",
            sortOrder: parseInt(obj.sortOrder) || 0,
          };
        },
        (data) => storage.createDrink(data),
      );
    } catch (error) {
      console.error("Error importing drinks:", error);
      res.status(500).json({ error: "Failed to import drinks" });
    }
  });

  // POST /api/import/ingredients[?dryRun=true] - Import (or preview) ingredients
  app.post("/api/import/ingredients", requireAuth, async (req, res) => {
    try {
      const parsed = parseImportPayload(req.body, res);
      if (!parsed) return;
      await executeImport(
        req,
        res,
        parsed,
        (obj) => {
          if (!obj.name || !obj.unit) return "name and unit are required";
          return {
            name: obj.name,
            category: obj.category || null,
            unit: obj.unit,
            onHand: parseInt(obj.onHand) || 0,
            parLevel: parseInt(obj.parLevel) || 0,
            isActive: obj.isActive !== "false",
          };
        },
        (data) => storage.createIngredient(data),
      );
    } catch (error) {
      console.error("Error importing ingredients:", error);
      res.status(500).json({ error: "Failed to import ingredients" });
    }
  });

  // POST /api/import/orders[?dryRun=true] - Import (or preview) orders from CSV
  app.post("/api/import/orders", requireAuth, async (req, res) => {
    try {
      const parsed = parseImportPayload(req.body, res);
      if (!parsed) return;
      await executeImport(
        req,
        res,
        parsed,
        (obj) => {
          if (!obj.drinkId || !obj.menuId) return "drinkId and menuId are required";
          return {
            drinkId: obj.drinkId,
            menuId: obj.menuId,
            guestName: obj.guestName || null,
            comments: obj.comments || null,
            asMocktail: obj.asMocktail === "true",
          };
        },
        (data) => storage.createOrder(data),
      );
    } catch (error) {
      console.error("Error importing orders:", error);
      res.status(500).json({ error: "Failed to import orders" });
    }
  });

  // POST /api/barcode/lookup - Look up product info from barcode
  app.post("/api/barcode/lookup", requireAuth, async (req, res) => {
    try {
      const { barcode } = req.body;
      
      if (!barcode || typeof barcode !== "string") {
        return res.status(400).json({ error: "Barcode is required" });
      }

      // Try Open Food Facts API first (free, no API key needed)
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
        );
        const data = await response.json();
        
        if (data.status === 1 && data.product) {
          const product = data.product;
          return res.json({
            barcode,
            found: true,
            name: product.product_name || product.generic_name || "",
            brand: product.brands || "",
            category: product.categories_tags?.[0]?.replace("en:", "") || "Spirits",
          });
        }
      } catch {
        // Silently fail and try next API
      }

      // Try UPC Database API as fallback (limited free tier)
      try {
        const response = await fetch(
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          return res.json({
            barcode,
            found: true,
            name: item.title || "",
            brand: item.brand || "",
            category: item.category || "Spirits",
          });
        }
      } catch {
        // Silently fail
      }

      // Product not found
      res.json({
        barcode,
        found: false,
        name: "",
        brand: "",
        category: "",
      });
    } catch (error) {
      console.error("Error looking up barcode:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });

  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
