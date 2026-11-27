import type { Express } from "express";
import { storage } from "../storage";
import { idParamsSchema, menuCreateSchema, menuSlugSchema, menuUpdateSchema } from "@shared/validation";
import { mapStorageError, requireAuth, validate } from "./helpers";

export function register(app: Express) {
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

  // GET /api/menus/:slug/full - Menu plus its active drinks in one request, so
  // the guest menu page does not wait on two chained calls.
  app.get("/api/menus/:slug/full", async (req, res) => {
    try {
      const params = validate(menuSlugSchema, req.params, res, "Invalid menu slug");
      if (!params) return;
      const menu = await storage.getMenuBySlug(params.slug);

      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }

      const drinks = await storage.getDrinksWithAvailability(menu.id, false);
      res.json({ menu, drinks });
    } catch (error) {
      console.error("Error fetching full menu:", error);
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
}
