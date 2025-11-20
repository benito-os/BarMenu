import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMenuSchema, insertDrinkSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
        res.json({ success: true });
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
      const { slug } = req.params;
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
      const validatedData = insertMenuSchema.parse(req.body);
      const menu = await storage.createMenu(validatedData);
      res.status(201).json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid menu data", details: error.errors });
      }
      console.error("Error creating menu:", error);
      res.status(500).json({ error: "Failed to create menu" });
    }
  });

  // PATCH /api/menus/:id - Update menu (e.g., toggle active status)
  app.patch("/api/menus/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }
      
      const menu = await storage.updateMenu(id, { isActive });
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      console.error("Error updating menu:", error);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  // GET /api/drinks?menuId=xxx - Get drinks by menu ID (active only)
  app.get("/api/drinks", async (req, res) => {
    try {
      const { menuId } = req.query;
      
      if (!menuId || typeof menuId !== "string") {
        return res.status(400).json({ error: "menuId query parameter is required" });
      }
      
      const drinks = await storage.getDrinksByMenuId(menuId);
      res.json(drinks);
    } catch (error) {
      console.error("Error fetching drinks:", error);
      res.status(500).json({ error: "Failed to fetch drinks" });
    }
  });

  // GET /api/drinks/all?menuId=xxx - Get all drinks by menu ID (including inactive, for admin)
  app.get("/api/drinks/all", async (req, res) => {
    try {
      const { menuId } = req.query;
      
      if (!menuId || typeof menuId !== "string") {
        return res.status(400).json({ error: "menuId query parameter is required" });
      }
      
      const drinks = await storage.getAllDrinksByMenuId(menuId);
      res.json(drinks);
    } catch (error) {
      console.error("Error fetching all drinks:", error);
      res.status(500).json({ error: "Failed to fetch all drinks" });
    }
  });

  // GET /api/drinks/:id - Get drink by ID
  app.get("/api/drinks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const drink = await storage.getDrinkById(id);
      
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
      const validatedData = insertDrinkSchema.parse(req.body);
      const drink = await storage.createDrink(validatedData);
      res.status(201).json(drink);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid drink data", details: error.errors });
      }
      console.error("Error creating drink:", error);
      res.status(500).json({ error: "Failed to create drink" });
    }
  });

  // PATCH /api/drinks/reorder - Update drink sort orders
  app.patch("/api/drinks/reorder", async (req, res) => {
    try {
      const { drinks } = req.body; // Array of { id, sortOrder }
      
      if (!Array.isArray(drinks)) {
        return res.status(400).json({ error: "drinks must be an array" });
      }
      
      await storage.reorderDrinks(drinks);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering drinks:", error);
      res.status(500).json({ error: "Failed to reorder drinks" });
    }
  });

  // DELETE /api/drinks/bulk - Bulk delete drinks
  app.delete("/api/drinks/bulk", async (req, res) => {
    try {
      const { drinkIds } = req.body;
      
      if (!Array.isArray(drinkIds) || drinkIds.length === 0) {
        return res.status(400).json({ error: "drinkIds must be a non-empty array" });
      }
      
      await storage.bulkDeleteDrinks(drinkIds);
      res.json({ success: true, deleted: drinkIds.length });
    } catch (error) {
      console.error("Error bulk deleting drinks:", error);
      res.status(500).json({ error: "Failed to delete drinks" });
    }
  });

  // PATCH /api/drinks/bulk - Bulk update drinks (activate/deactivate)
  app.patch("/api/drinks/bulk", async (req, res) => {
    try {
      const { drinkIds, isActive } = req.body;
      
      if (!Array.isArray(drinkIds) || drinkIds.length === 0) {
        return res.status(400).json({ error: "drinkIds must be a non-empty array" });
      }
      
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }
      
      await storage.bulkUpdateDrinks(drinkIds, isActive);
      res.json({ success: true, updated: drinkIds.length });
    } catch (error) {
      console.error("Error bulk updating drinks:", error);
      res.status(500).json({ error: "Failed to update drinks" });
    }
  });

  // POST /api/orders - Create new order (guest requests drink)
  app.post("/api/orders", async (req, res) => {
    try {
      // Extend the schema to allow optional guestName
      const orderSchema = insertOrderSchema.extend({
        guestName: z.string().optional(),
      });
      const validatedData = orderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
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

  // PATCH /api/orders/:id - Update order status
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || typeof status !== "string") {
        return res.status(400).json({ error: "status is required" });
      }
      
      // Get current order to validate transition
      const currentOrder = await storage.getOrderById(id);
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
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status transition from ${currentOrder.status} to ${status}`,
          allowedTransitions: allowedStatuses
        });
      }
      
      const order = await storage.updateOrderStatus(
        id, 
        status, 
        status === "served" ? new Date() : undefined
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
      const { menuId } = req.query;
      const analytics = await storage.getDrinkAnalytics(
        menuId && typeof menuId === "string" ? menuId : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
