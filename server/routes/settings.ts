import type { Express } from "express";
import { storage } from "../storage";
import { settingsUpdateSchema } from "@shared/validation";
import { bustSettingsCache, requireAuth, validate } from "./helpers";

export function register(app: Express) {
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
      bustSettingsCache();
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
}
