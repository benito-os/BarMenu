// One-off: writes WebP next to any source PNGs in attached_assets/generated_images/
// and generates the home-screen icons in client/public/ from the drawn logo
// mark (client/src/lib/barLogo.ts, text-free variant: phones read these icons
// from static files, so they cannot follow the bar-name setting).
// Run: npx tsx scripts/optimize-images.ts
import sharp from "sharp";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { barLogoSvg } from "../client/src/lib/barLogo";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "attached_assets", "generated_images");
const publicDir = path.join(root, "client", "public");
const THEME_COLOUR = "#0a0a0a"; // matches <meta name="theme-color"> in client/index.html

const jobs = [
  { src: "Bar_hero_cocktails_overhead_0be3299c.png", width: 1600, quality: 72 },
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

  const mark = Buffer.from(barLogoSvg("", { plain: true }));
  for (const { name, size } of icons) {
    // Flatten onto the theme colour so the rounded SVG corners are not
    // transparent (iOS fills transparency with black, Android with white).
    const info = await sharp(mark, { density: 300 })
      .resize(size, size)
      .flatten({ background: THEME_COLOUR })
      .png({ compressionLevel: 9 })
      .toFile(path.join(publicDir, name));
    console.log(`${name}: ${info.size} B (${info.width}x${info.height})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
