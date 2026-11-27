import { describe, it, expect } from "vitest";
import { shouldReloadOnChunkError } from "./chunkReload";

describe("shouldReloadOnChunkError", () => {
  it("reloads when nothing is stored", () => {
    expect(shouldReloadOnChunkError(null, 1_000_000)).toBe(true);
  });
  it("does not reload within 30s", () => {
    expect(shouldReloadOnChunkError(1_000_000, 1_000_000)).toBe(false);
    expect(shouldReloadOnChunkError(1_000_000, 1_029_999)).toBe(false);
    expect(shouldReloadOnChunkError(1_000_000, 1_030_000)).toBe(false);
  });
  it("reloads once older than 30s", () => {
    expect(shouldReloadOnChunkError(1_000_000, 1_030_001)).toBe(true);
  });
  it("reloads for a non-finite stored value", () => {
    expect(shouldReloadOnChunkError(Number.NaN, 5)).toBe(true);
  });
});
