import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerMcpRoutes } from "./mcp/http";
import { storage } from "./storage";
import { register as registerAuth } from "./routes/auth";
import { register as registerMenus } from "./routes/menus";
import { register as registerDrinks } from "./routes/drinks";
import { register as registerIngredients } from "./routes/ingredients";
import { register as registerOrders } from "./routes/orders";
import { register as registerSettings } from "./routes/settings";
import { register as registerCsv } from "./routes/csv";
import { register as registerBarcode } from "./routes/barcode";

// Entry point. Registration order matters: Express matches in order, so
// literal paths (/api/drinks/all, /api/orders/queue, ...) must come before
// their /:id siblings. Each module keeps that order internally.
export async function registerRoutes(app: Express): Promise<Server> {
  // MCP endpoint for AI assistants. Off unless MCP_TOKEN is set; see docs/mcp.md.
  registerMcpRoutes(app, storage);

  registerAuth(app);
  registerMenus(app);
  registerDrinks(app);
  registerIngredients(app);
  registerOrders(app);
  registerSettings(app);
  registerCsv(app);
  registerBarcode(app);

  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
