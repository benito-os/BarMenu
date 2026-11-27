/**
 * The default bar logo, drawn from the bar's name instead of shipped as an
 * image: a monogram of the name's initials inside an art-deco ring, with the
 * full name set underneath. Used wherever the owner has not uploaded a logo
 * (splash screen, QR code centre).
 *
 * It is built as an SVG string and handed out as a data URL so the same mark
 * works in an <img> and on the QR code's canvas. An SVG loaded as an image
 * cannot fetch web fonts, so it uses a system serif stack.
 */

const GOLD = "#d4af37";
const GOLD_SOFT = "#f1d98a";
const INK = "#0a0a0a";

const SMALL_WORDS = new Set(["the", "a", "an", "of", "and", "at", "de", "la", "el", "le", "y", "&"]);

/** Up to three initials; skips filler words ("The Lantern Room" -> "LR"). */
export function barInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-_/]+/)
    // Strip punctuation rather than whitelist letters, so names in any
    // script keep their initials.
    .map((word) => word.replace(/[.,'"!?()[\]{}:;#@*+=<>|~`^%$’‘“”]/g, ""))
    .filter(Boolean);
  const meaningful = words.filter((word) => !SMALL_WORDS.has(word.toLowerCase()));
  const picked = (meaningful.length > 0 ? meaningful : words).slice(0, 3);
  const initials = picked.map((word) => Array.from(word)[0].toUpperCase()).join("");
  return initials || "B";
}

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch]!);

/** Long names shrink, then truncate, so they always fit the banner. */
function fitName(name: string): { text: string; size: number } {
  const clean = name.trim().replace(/\s+/g, " ").toUpperCase();
  const text = clean.length > 28 ? `${clean.slice(0, 27).trimEnd()}…` : clean;
  const size = text.length <= 12 ? 34 : text.length <= 18 ? 27 : text.length <= 23 ? 22 : 18;
  return { text, size };
}

/**
 * `plain` draws the mark with no lettering (just the glass in the ring), for
 * the static home-screen icons, which cannot follow the name setting.
 */
export function barLogoSvg(name: string, options: { plain?: boolean } = {}): string {
  const plain = options.plain === true;
  const initials = barInitials(name);
  const { text, size } = fitName(name);
  const monogramSize = initials.length === 1 ? 190 : initials.length === 2 ? 150 : 108;
  const serif = "Georgia, 'Times New Roman', 'Playfair Display', serif";

  // Sunburst ticks around the ring.
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const angle = (i * 10 * Math.PI) / 180;
    const inner = i % 3 === 0 ? 196 : 204;
    const x1 = 256 + Math.cos(angle) * inner;
    const y1 = 220 + Math.sin(angle) * inner;
    const x2 = 256 + Math.cos(angle) * 212;
    const y2 = 220 + Math.sin(angle) * 212;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${escapeXml(name.trim())}">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD_SOFT}"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD_SOFT}"/></linearGradient></defs>`,
    `<rect width="512" height="512" rx="96" fill="${INK}"/>`,
    `<g fill="none" stroke="url(#g)"${plain ? ' transform="translate(0 36)"' : ""}>`,
    `<g stroke-width="2" opacity="0.7">${ticks}</g>`,
    `<circle cx="256" cy="220" r="186" stroke-width="5"/>`,
    `<circle cx="256" cy="220" r="170" stroke-width="1.5"/>`,
    // A coupe glass behind the monogram.
    `<path d="M176 132 H336 L256 232 Z M256 232 V318 M214 322 H298" stroke-width="${plain ? 7 : 3}" opacity="${plain ? 1 : 0.35}" stroke-linejoin="round" stroke-linecap="round"/>`,
    `</g>`,
    ...(plain ? [] : [
      `<text x="256" y="220" text-anchor="middle" dominant-baseline="central" font-family="${serif}" font-weight="700" font-size="${monogramSize}" fill="url(#g)" letter-spacing="2">${escapeXml(initials)}</text>`,
      // Name banner: the ring is cut by an ink plate so the text stays legible.
      `<rect x="56" y="408" width="400" height="64" rx="8" fill="${INK}"/>`,
      `<path d="M76 420 H436 M76 462 H436" stroke="url(#g)" stroke-width="1.5" opacity="0.8"/>`,
      `<text x="256" y="442" text-anchor="middle" dominant-baseline="central" font-family="${serif}" font-weight="600" font-size="${size}" fill="url(#g)" letter-spacing="${text.length <= 18 ? 4 : 2}">${escapeXml(text)}</text>`,
    ]),
    `</svg>`,
  ].join("");
}

export function barLogoDataUrl(name: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(barLogoSvg(name))}`;
}
