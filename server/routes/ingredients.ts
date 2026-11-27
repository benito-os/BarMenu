import type { Express } from "express";
import { storage } from "../storage";
import { buildShoppingList } from "../shopping-list";
import { idParamsSchema, ingredientCreateSchema, ingredientUpdateSchema } from "@shared/validation";
import { requireAuth, validate } from "./helpers";

export function register(app: Express) {
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

  // GET /api/shopping-list - Ingredients at or below par, drink-blockers first
  app.get("/api/shopping-list", requireAuth, async (_req, res) => {
    try {
      const [ingredients, alerts] = await Promise.all([
        storage.getIngredients(),
        storage.getActiveMenuDrinkAlerts(),
      ]);
      const items = buildShoppingList(ingredients, alerts);
      res.json({ count: items.length, items });
    } catch (error) {
      console.error("Error building shopping list:", error);
      res.status(500).json({ error: "Failed to build shopping list" });
    }
  });
}
