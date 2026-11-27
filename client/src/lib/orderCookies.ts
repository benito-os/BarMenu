// Cookie utility for tracking guest orders
const ORDER_COOKIE_NAME = "barflores_orders";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface TrackedOrder {
  orderId: string;
  drinkName: string;
  guestName?: string;
  timestamp: number;
}

export const MAX_TRACKED_ORDERS = 10;

/**
 * Pure: parse the tracked orders out of a raw `document.cookie` string.
 * Returns [] when the cookie is missing or malformed.
 */
export function parseTrackedOrders(cookieString: string): TrackedOrder[] {
  const orderCookie = cookieString
    .split(";")
    .find((c) => c.trim().startsWith(ORDER_COOKIE_NAME + "="));

  if (!orderCookie) return [];

  try {
    const value = orderCookie.split("=")[1];
    const decoded = decodeURIComponent(value);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error parsing order cookies:", error);
    return [];
  }
}

/** Pure: encode orders as the cookie value (without name or attributes). */
export function serializeTrackedOrders(orders: TrackedOrder[]): string {
  return encodeURIComponent(JSON.stringify(orders));
}

/** Pure: put a new order first and keep only the newest MAX_TRACKED_ORDERS. */
export function pruneTrackedOrders(existing: TrackedOrder[], added: TrackedOrder): TrackedOrder[] {
  return [added, ...existing].slice(0, MAX_TRACKED_ORDERS);
}

/**
 * Get all tracked order IDs from cookies
 */
export function getTrackedOrders(): TrackedOrder[] {
  if (typeof document === "undefined") return [];
  return parseTrackedOrders(document.cookie);
}

/**
 * Add a new order to tracked orders in cookies
 */
export function addTrackedOrder(order: TrackedOrder): void {
  if (typeof document === "undefined") return;
  
  // Newest first, capped to prevent cookie size issues
  saveTrackedOrders(pruneTrackedOrders(getTrackedOrders(), order));
}

/**
 * Remove an order from tracked orders (when it's completed/cancelled)
 */
export function removeTrackedOrder(orderId: string): void {
  if (typeof document === "undefined") return;
  
  const existingOrders = getTrackedOrders();
  const updatedOrders = existingOrders.filter((o) => o.orderId !== orderId);
  
  saveTrackedOrders(updatedOrders);
}

/**
 * Clear all tracked orders
 */
export function clearTrackedOrders(): void {
  if (typeof document === "undefined") return;
  
  document.cookie = `${ORDER_COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Save tracked orders to cookies
 */
function saveTrackedOrders(orders: TrackedOrder[]): void {
  if (typeof document === "undefined") return;
  
  const encoded = serializeTrackedOrders(orders);
  document.cookie = `${ORDER_COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  
  // Dispatch custom event to notify components that orders have changed
  window.dispatchEvent(new CustomEvent('ordersUpdated'));
}

/**
 * Get order IDs only (for easier API queries)
 */
export function getTrackedOrderIds(): string[] {
  return getTrackedOrders().map((o) => o.orderId);
}
