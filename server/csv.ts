// CSV helpers for the export/template/import endpoints. Pure functions only
// (no database, no express) so they can be unit tested.

export const MAX_CSV_ROWS = 5000;

/** Escape one CSV field: quote when it holds a comma, quote or newline. */
export const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/** Convert an array of values to one CSV row. */
export const toCSVRow = (values: unknown[]): string => {
  return values.map(escapeCSV).join(",");
};

/**
 * Parse CSV text. The header row has " (REQUIRED)" stripped. Known gap: rows
 * are split on newlines before quotes are considered, so a quoted field that
 * contains a newline is split across two rows.
 */
export const parseCSV = (csvText: string): { headers: string[]; rows: string[][] } => {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.replace(" (REQUIRED)", "").trim());
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
};

/** Convert a row to an object keyed by header; missing cells become "". */
export const rowToObject = (headers: string[], row: string[]): Record<string, string> => {
  const obj: Record<string, string> = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] || "";
  });
  return obj;
};

export type ParsedCsv = { headers: string[]; rows: string[][] };

/** Parse and enforce the row cap. `tooManyRows` carries the actual count. */
export const parseCsvWithLimit = (
  csvText: string,
): { parsed: ParsedCsv } | { tooManyRows: number } => {
  const parsed = parseCSV(csvText);
  if (parsed.rows.length > MAX_CSV_ROWS) return { tooManyRows: parsed.rows.length };
  return { parsed };
};

// Row builders: return the record to create, or an error string.

export const buildMenuRow = (obj: Record<string, string>) => {
  if (!obj.slug || !obj.name) return "slug and name are required";
  return {
    slug: obj.slug,
    name: obj.name,
    description: obj.description || null,
    isActive: obj.isActive === "true",
    heroImageUrl: obj.heroImageUrl || null,
    backgroundColor: obj.backgroundColor || null,
    accentColor: obj.accentColor || null,
    sectionHeaderColor: obj.sectionHeaderColor || null,
    menuTitleColor: obj.menuTitleColor || null,
    typography: obj.typography || null,
    sections: obj.sections ? obj.sections.split("|").filter(Boolean) : [],
  };
};

export const buildDrinkRow = (obj: Record<string, string>) => {
  if (!obj.menuId || !obj.name || !obj.section) {
    return "menuId, name, and section are required";
  }
  return {
    menuId: obj.menuId,
    name: obj.name,
    section: obj.section,
    description: obj.description || null,
    recipe: obj.recipe || null,
    style: obj.style || null,
    temperature: obj.temperature || null,
    isMocktail: obj.isMocktail === "true",
    canBeMocktail: obj.canBeMocktail === "true",
    isStirred: obj.isStirred === "true",
    isShaken: obj.isShaken === "true",
    baseSpirit: obj.baseSpirit || null,
    isActive: obj.isActive !== "false",
    isOutOfStock: obj.isOutOfStock === "true",
    sortOrder: parseInt(obj.sortOrder) || 0,
  };
};

export const buildIngredientRow = (obj: Record<string, string>) => {
  if (!obj.name || !obj.unit) return "name and unit are required";
  return {
    name: obj.name,
    category: obj.category || null,
    unit: obj.unit,
    onHand: parseInt(obj.onHand) || 0,
    parLevel: parseInt(obj.parLevel) || 0,
    isActive: obj.isActive !== "false",
  };
};

export const buildOrderRow = (obj: Record<string, string>) => {
  if (!obj.drinkId || !obj.menuId) return "drinkId and menuId are required";
  return {
    drinkId: obj.drinkId,
    menuId: obj.menuId,
    guestName: obj.guestName || null,
    comments: obj.comments || null,
    asMocktail: obj.asMocktail === "true",
  };
};
