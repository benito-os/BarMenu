import { describe, it, expect } from "vitest";
import { splitRecipe } from "./recipe";

describe("splitRecipe", () => {
  it("splits on newlines, trimming and dropping blanks (CRLF too)", () => {
    expect(splitRecipe("2oz gin\r\n\r\n  0.5oz vermouth \nbitters")).toEqual([
      "2oz gin",
      "0.5oz vermouth",
      "bitters",
    ]);
  });

  it("splits a single line on commas when there are 2+ parts", () => {
    expect(splitRecipe("2oz gin, 0.5oz vermouth, bitters")).toEqual([
      "2oz gin",
      "0.5oz vermouth",
      "bitters",
    ]);
  });

  it("prefers newlines over commas", () => {
    expect(splitRecipe("2oz gin, 1oz lime\nShake")).toEqual(["2oz gin, 1oz lime", "Shake"]);
  });

  it("keeps a single-step recipe intact", () => {
    expect(splitRecipe("Stir with ice and strain")).toEqual(["Stir with ice and strain"]);
  });

  it("returns [] for empty or whitespace-only input", () => {
    expect(splitRecipe("")).toEqual([]);
    expect(splitRecipe("  \n \r\n")).toEqual([]);
  });

  it("a trailing comma does not create a split", () => {
    expect(splitRecipe("Stir,")).toEqual(["Stir,"]);
  });

  it("drops empty comma segments", () => {
    expect(splitRecipe("a,, b")).toEqual(["a", "b"]);
  });
});
