// One-off: writes WebP next to the source PNGs in attached_assets/generated_images/
// and generates the PWA / home-screen icons in client/public/.
// Run: npx tsx scripts/optimize-images.ts
// (The source PNGs were deleted after the first run; to re-run, restore them from git history.)
import sharp from "sharp";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "attached_assets", "generated_images");
const publicDir = path.join(root, "client", "public");
const THEME_COLOUR = "#0a0a0a"; // matches <meta name="theme-color"> in client/index.html

const jobs = [
  { src: "Bar_hero_cocktails_overhead_0be3299c.png", width: 1600, quality: 72 },
  { src: "elegant_bf_cocktail_bar_logo.png", width: 512, quality: 80 },
];

const icons = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main() {
  for (const job of jobs) {
    const input = path.join(dir, job.src);
    if (!existsSync(input)) {
      console.log(`${job.src}: source PNG not present, skipping`);
      continue;
    }
    const output = input.replace(/\.png$/, ".webp");
    const info = await sharp(input)
      .resize({ width: job.width, withoutEnlargement: true })
      .webp({ quality: job.quality, alphaQuality: 90 })
      .toFile(output);
    console.log(`${job.src}: ${statSync(input).size} B -> ${path.basename(output)} ${info.size} B (${info.width}x${info.height})`);
  }

  // Icons come from the logo WebP: square, 80% of the canvas, on the dark theme colour.
  const logo = path.join(dir, "elegant_bf_cocktail_bar_logo.webp");
  for (const { name, size } of icons) {
    const inner = Math.round(size * 0.8);
    const resized = await sharp(logo)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const info = await sharp({ create: { width: size, height: size, channels: 3, background: THEME_COLOUR } })
      .composite([{ input: resized, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(publicDir, name));
    console.log(`${name}: ${info.size} B (${info.width}x${info.height})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
