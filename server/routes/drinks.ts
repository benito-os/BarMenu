import type { Express } from "express";
import { storage } from "../storage";
import {
  drinkBulkDeleteSchema,
  drinkBulkUpdateSchema,
  drinkCreateSchema,
  drinkIdParamsSchema,
  drinkReorderSchema,
  drinkUpdateSchema,
  menuIdQuerySchema,
} from "@shared/validation";
import { mapStorageError, requireAuth, validate } from "./helpers";

export function register(app: Express) {
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
      const payload = validate(drinkBulkUpdateSchema, req.body, res, "Invalid bulk update payload");
      if (!payload) return;

      await storage.bulkUpdateDrinks(payload.drinkIds, payload.isActive);
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
}
