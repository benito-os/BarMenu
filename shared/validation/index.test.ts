import { describe, expect, it } from "vitest";
import {
  orderCreateSchema,
  orderIdsQuerySchema,
  settingsUpdateSchema,
} from "./index";

const baseOrder = { drinkId: "drink-1", menuId: "menu-1" };

describe("orderCreateSchema length caps", () => {
  it("accepts guestName at 80 characters", () => {
    expect(orderCreateSchema.safeParse({ ...baseOrder, guestName: "a".repeat(80) }).success).toBe(true);
  });
  it("rejects guestName one over the limit", () => {
    expect(orderCreateSchema.safeParse({ ...baseOrder, guestName: "a".repeat(81) }).success).toBe(false);
  });
  it("accepts comments at 500 characters", () => {
    expect(orderCreateSchema.safeParse({ ...baseOrder, comments: "c".repeat(500) }).success).toBe(true);
  });
  it("rejects comments one over the limit", () => {
    expect(orderCreateSchema.safeParse({ ...baseOrder, comments: "c".repeat(501) }).success).toBe(false);
  });
  it("still allows both to be omitted", () => {
    expect(orderCreateSchema.safeParse(baseOrder).success).toBe(true);
  });
});

describe("orderIdsQuerySchema", () => {
  it("splits, trims and drops empty ids", () => {
    const r = orderIdsQuerySchema.parse({ ids: "a, b,,c " });
    expect(r.ids).toEqual(["a", "b", "c"]);
  });
  it("accepts exactly 50 ids", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id${i}`).join(",");
    expect(orderIdsQuerySchema.safeParse({ ids }).success).toBe(true);
  });
  it("rejects 51 ids", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id${i}`).join(",");
    expect(orderIdsQuerySchema.safeParse({ ids }).success).toBe(false);
  });
  it("rejects an empty or comma-only value", () => {
    expect(orderIdsQuerySchema.safeParse({ ids: "" }).success).toBe(false);
    expect(orderIdsQuerySchema.safeParse({ ids: ",," }).success).toBe(false);
  });
});

describe("settingsUpdateSchema", () => {
  it("accepts orderRateLimitPerHour at 0 and 1000", () => {
    expect(settingsUpdateSchema.safeParse({ orderRateLimitPerHour: 0 }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ orderRateLimitPerHour: 1000 }).success).toBe(true);
  });
  it("rejects orderRateLimitPerHour of -1 and 1001", () => {
    expect(settingsUpdateSchema.safeParse({ orderRateLimitPerHour: -1 }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ orderRateLimitPerHour: 1001 }).success).toBe(false);
  });
  it("rejects an empty update and unknown keys", () => {
    expect(settingsUpdateSchema.safeParse({}).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
  it("requires waiting minutes of at least 1", () => {
    expect(settingsUpdateSchema.safeParse({ waitingWarningMinutes: 0 }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ waitingWarningMinutes: 1 }).success).toBe(true);
  });
});
