// Cookie utility for tracking guest orders
const ORDER_COOKIE_NAME = "barflores_orders";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface TrackedOrder {
  orderId: string;
  drinkName: string;
  guestName?: string;
  timestamp: number;
}

/**
 * Get all tracked order IDs from cookies
 */
export function getTrackedOrders(): TrackedOrder[] {
  if (typeof document === "undefined") return [];
  
  const cookies = document.cookie.split(";");
  const orderCookie = cookies.find((c) => c.trim().startsWith(ORDER_COOKIE_NAME + "="));
  
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

/**
 * Add a new order to tracked orders in cookies
 */
export function addTrackedOrder(order: TrackedOrder): void {
  if (typeof document === "undefined") return;
  
  const existingOrders = getTrackedOrders();
  
  // Add new order to the beginning of the array
  const updatedOrders = [order, ...existingOrders];
  
  // Keep only the last 10 orders to prevent cookie size issues
  const trimmedOrders = updatedOrders.slice(0, 10);
  
  saveTrackedOrders(trimmedOrders);
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
  
  const encoded = encodeURIComponent(JSON.stringify(orders));
  document.cookie = `${ORDER_COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Get order IDs only (for easier API queries)
 */
export function getTrackedOrderIds(): string[] {
  return getTrackedOrders().map((o) => o.orderId);
}
