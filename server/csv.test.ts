import { describe, expect, it } from "vitest";
import {
  MAX_CSV_ROWS,
  buildDrinkRow,
  buildIngredientRow,
  buildMenuRow,
  buildOrderRow,
  escapeCSV,
  parseCSV,
  parseCsvWithLimit,
  rowToObject,
  toCSVRow,
} from "./csv";

describe("escapeCSV / toCSVRow", () => {
  it("leaves plain values alone and blanks null/undefined", () => {
    expect(escapeCSV("abc")).toBe("abc");
    expect(escapeCSV(null)).toBe("");
    expect(escapeCSV(undefined)).toBe("");
    expect(escapeCSV(5)).toBe("5");
  });
  it("quotes commas and newlines and doubles quotes", () => {
    expect(escapeCSV("a,b")).toBe('"a,b"');
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCSV("a\nb")).toBe('"a\nb"');
  });
  it("joins a row", () => {
    expect(toCSVRow(["x", "a,b", 3])).toBe('x,"a,b",3');
  });
});

describe("parseCSV", () => {
  it("parses headers and rows", () => {
    expect(parseCSV("a,b\n1,2\n3,4")).toEqual({
      headers: ["a", "b"],
      rows: [["1", "2"], ["3", "4"]],
    });
  });
  it("returns empty for empty input", () => {
    expect(parseCSV("")).toEqual({ headers: [], rows: [] });
    expect(parseCSV("\n  \n")).toEqual({ headers: [], rows: [] });
  });
  it("handles CRLF and skips blank lines", () => {
    expect(parseCSV("a,b\r\n1,2\r\n\r\n3,4\r\n").rows).toEqual([["1", "2"], ["3", "4"]]);
  });
  it("keeps commas inside quotes", () => {
    expect(parseCSV('a,b\n"x, y",z').rows).toEqual([["x, y", "z"]]);
  });
  it("turns doubled quotes into a literal quote", () => {
    expect(parseCSV('a\n"say ""hi"""').rows).toEqual([['say "hi"']]);
  });
  it("trims whitespace around fields", () => {
    expect(parseCSV("a , b\n 1 , 2 ")).toEqual({ headers: ["a", "b"], rows: [["1", "2"]] });
  });
  it("strips the (REQUIRED) header suffix", () => {
    expect(parseCSV("slug (REQUIRED),name (REQUIRED),description\nx,y,z").headers).toEqual([
      "slug",
      "name",
      "description",
    ]);
  });
  it("round-trips escapeCSV output without newlines", () => {
    const row = ["a,b", 'q"uote', "plain"];
    expect(parseCSV(`h1,h2,h3\n${toCSVRow(row)}`).rows[0]).toEqual(row);
  });

  // Known gap: lines are split before quotes are considered, so a quoted
  // newline breaks one record into two rows. This asserts today's behaviour.
  it("currently splits a quoted newline across two rows (known gap)", () => {
    const { rows } = parseCSV('a,b\n"line1\nline2",x');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["line1"]);
  });
  it.todo("keeps a quoted newline inside one field (fix the line-splitting parser)");
});

describe("rowToObject", () => {
  it("maps cells to headers and fills missing cells with empty strings", () => {
    expect(rowToObject(["a", "b", "c"], ["1", "2"])).toEqual({ a: "1", b: "2", c: "" });
  });
});

describe("parseCsvWithLimit", () => {
  it("accepts exactly MAX_CSV_ROWS data rows", () => {
    const csv = "a\n" + Array.from({ length: MAX_CSV_ROWS }, (_, i) => `r${i}`).join("\n");
    const r = parseCsvWithLimit(csv);
    expect("parsed" in r && r.parsed.rows.length).toBe(MAX_CSV_ROWS);
  });
  it("rejects one row over the cap and reports the count", () => {
    const csv = "a\n" + Array.from({ length: MAX_CSV_ROWS + 1 }, (_, i) => `r${i}`).join("\n");
    expect(parseCsvWithLimit(csv)).toEqual({ tooManyRows: MAX_CSV_ROWS + 1 });
  });
  it("has a cap of 5000", () => {
    expect(MAX_CSV_ROWS).toBe(5000);
  });
});

describe("row builders", () => {
  it("menu: requires slug and name, splits sections on |", () => {
    expect(buildMenuRow({ slug: "", name: "x" })).toBe("slug and name are required");
    expect(buildMenuRow({ slug: "s", name: "N", isActive: "true", sections: "A|B||C" })).toMatchObject({
      slug: "s",
      name: "N",
      isActive: true,
      description: null,
      sections: ["A", "B", "C"],
    });
  });
  it("drink: requires menuId, name, section; isActive defaults true", () => {
    expect(buildDrinkRow({ menuId: "m", name: "n", section: "" })).toBe(
      "menuId, name, and section are required",
    );
    expect(buildDrinkRow({ menuId: "m", name: "n", section: "s", sortOrder: "x" })).toMatchObject({
      isActive: true,
      isMocktail: false,
      sortOrder: 0,
    });
    expect(buildDrinkRow({ menuId: "m", name: "n", section: "s", isActive: "false" })).toMatchObject({
      isActive: false,
    });
  });
  it("ingredient: requires name and unit, parses numbers", () => {
    expect(buildIngredientRow({ name: "Gin", unit: "" })).toBe("name and unit are required");
    expect(buildIngredientRow({ name: "Gin", unit: "bottles", onHand: "4", parLevel: "oops" })).toMatchObject({
      onHand: 4,
      parLevel: 0,
      isActive: true,
    });
  });
  it("order: requires drinkId and menuId", () => {
    expect(buildOrderRow({ drinkId: "d", menuId: "" })).toBe("drinkId and menuId are required");
    expect(buildOrderRow({ drinkId: "d", menuId: "m", asMocktail: "true" })).toMatchObject({
      asMocktail: true,
      guestName: null,
    });
  });
});
