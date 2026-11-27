import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  analyticsQuerySchema,
  idParamsSchema,
  orderBatchUpdateSchema,
  orderCreateSchema,
  orderDetailsUpdateSchema,
  orderIdsQuerySchema,
  orderStatusUpdateSchema,
} from "@shared/validation";
import { getCachedSettings, mapStorageError, requireAuth, validate } from "./helpers";

export function register(app: Express) {
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
      // storage.createOrder re-checks the drink inside the transaction and
      // throws a StorageError (400) when it was 86'd, deactivated, or lost an
      // ingredient between the guest's page load and their tap. Surface that
      // as a 4xx with its message instead of a generic 500 so the guest sees
      // "Drink is out of stock" rather than "try again".
      const mapped = mapStorageError(error);
      if (mapped) return res.status(mapped.status).json(mapped.body);
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
}
