import type { Express } from "express";
import { requireAuth } from "./helpers";

export function register(app: Express) {
  // POST /api/barcode/lookup - Look up product info from barcode
  app.post("/api/barcode/lookup", requireAuth, async (req, res) => {
    try {
      const { barcode } = req.body;
      
      if (!barcode || typeof barcode !== "string") {
        return res.status(400).json({ error: "Barcode is required" });
      }

      // Both upstreams are best-effort. A 5s timeout each keeps a slow or
      // unreachable API from holding the bartender's request open; the
      // catch blocks below already fall through to the next source.
      const LOOKUP_TIMEOUT_MS = 5000;

      // Try Open Food Facts API first (free, no API key needed)
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
          { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
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
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
          { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
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
}
