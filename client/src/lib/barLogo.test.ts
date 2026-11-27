import { describe, expect, it } from "vitest";
import { barInitials, barLogoDataUrl, barLogoSvg } from "./barLogo";

describe("barInitials", () => {
  it("takes the first letter of each meaningful word, up to three", () => {
    expect(barInitials("Bar Flores")).toBe("BF");
    expect(barInitials("The Lantern Room")).toBe("LR");
    expect(barInitials("casa de los tres amigos")).toBe("CLT");
    expect(barInitials("Élan")).toBe("É");
    expect(barInitials("Ben's Bar")).toBe("BB");
  });

  it("falls back sensibly", () => {
    expect(barInitials("The")).toBe("T");
    expect(barInitials("   ")).toBe("B");
    expect(barInitials("!!!")).toBe("B");
  });
});

describe("barLogoSvg", () => {
  it("draws the name and the initials, with no placeholder text", () => {
    const svg = barLogoSvg("Bar Flores");
    expect(svg).toContain(">BF</text>");
    expect(svg).toContain(">BAR FLORES</text>");
    expect(svg).not.toMatch(/full bar name/i);
    expect(svg).toMatch(/width="512" height="512"/);
  });

  it("escapes markup in the name", () => {
    const svg = barLogoSvg(`Tom & "Jerry's" <script>`);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&amp;");
  });

  it("truncates very long names so they fit", () => {
    const svg = barLogoSvg("The Extremely Long And Winding Cocktail Emporium Of Wonders");
    expect(svg).toContain("…</text>");
  });

  it("is usable as an image source", () => {
    expect(barLogoDataUrl("Bar Flores")).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
  });
});
