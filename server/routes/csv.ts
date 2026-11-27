import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import {
  MAX_CSV_ROWS,
  buildDrinkRow,
  buildIngredientRow,
  buildMenuRow,
  buildOrderRow,
  parseCSV,
  rowToObject,
  toCSVRow,
} from "../csv";
import { csvImportSchema } from "@shared/validation";
import { requireAuth, validate } from "./helpers";

export function register(app: Express) {
  // ============ EXPORT ENDPOINTS ============
  
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
        buildMenuRow,
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
        buildDrinkRow,
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
        buildIngredientRow,
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
        buildOrderRow,
        (data) => storage.createOrder(data),
      );
    } catch (error) {
      console.error("Error importing orders:", error);
      res.status(500).json({ error: "Failed to import orders" });
    }
  });
}
