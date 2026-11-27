import { describe, it, expect, vi } from "vitest";
import {
  parseTrackedOrders,
  serializeTrackedOrders,
  pruneTrackedOrders,
  MAX_TRACKED_ORDERS,
  type TrackedOrder,
} from "./orderCookies";

const order = (n: number): TrackedOrder => ({
  orderId: `o${n}`,
  drinkName: `Drink ${n}`,
  guestName: "Sam, Jr.",
  timestamp: n,
});

describe("orderCookies pure helpers", () => {
  it("round-trips through serialize and parse", () => {
    const orders = [order(1), order(2)];
    const cookie = `theme=dark; barflores_orders=${serializeTrackedOrders(orders)}; other=1`;
    expect(parseTrackedOrders(cookie)).toEqual(orders);
  });

  it("returns [] when the cookie is absent", () => {
    expect(parseTrackedOrders("")).toEqual([]);
    expect(parseTrackedOrders("a=1; b=2")).toEqual([]);
  });

  it("returns [] for a malformed cookie value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseTrackedOrders("barflores_orders=%7Bnot-json")).toEqual([]);
    expect(parseTrackedOrders("barflores_orders=%E0%A4%A")).toEqual([]);
    spy.mockRestore();
  });

  it("serialized value has no characters that break a cookie", () => {
    expect(serializeTrackedOrders([order(1)])).not.toMatch(/[;,\s]/);
  });

  it("prune puts the new order first and caps the list", () => {
    const existing = Array.from({ length: MAX_TRACKED_ORDERS }, (_, i) => order(i + 1));
    const result = pruneTrackedOrders(existing, order(99));
    expect(result).toHaveLength(MAX_TRACKED_ORDERS);
    expect(result[0].orderId).toBe("o99");
    expect(result[result.length - 1].orderId).toBe(`o${MAX_TRACKED_ORDERS - 1}`);
  });

  it("prune does not mutate its input", () => {
    const existing = [order(1)];
    pruneTrackedOrders(existing, order(2));
    expect(existing).toHaveLength(1);
  });
});
