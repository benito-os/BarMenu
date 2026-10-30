/**
 * Split a recipe string into discrete steps for line-by-line display.
 * Honors author-supplied newlines first; falls back to comma splitting
 * when the recipe is a single line with multiple commas (the common
 * "2oz gin, 0.5oz vermouth, bitters" pattern). Returns the original string as
 * a one-element array if neither heuristic applies, so single-step recipes
 * like "Stir with ice and strain" stay intact.
 */
export function splitRecipe(recipe: string): string[] {
  const lines = recipe
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  if (lines.length === 0) return [];

  const sole = lines[0];
  const commaParts = sole.split(",").map((s) => s.trim()).filter(Boolean);
  if (commaParts.length >= 2) return commaParts;
  return [sole];
}
