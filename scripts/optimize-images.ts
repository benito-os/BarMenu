// One-off: writes WebP next to the source PNGs in attached_assets/generated_images/.
// Run: npx tsx scripts/optimize-images.ts
import sharp from "sharp";
import { statSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "..", "attached_assets", "generated_images");

const jobs = [
  { src: "Bar_hero_cocktails_overhead_0be3299c.png", width: 1600, quality: 72 },
  { src: "elegant_bf_cocktail_bar_logo.png", width: 512, quality: 80 },
];

for (const job of jobs) {
  const input = path.join(dir, job.src);
  const output = input.replace(/\.png$/, ".webp");
  const info = await sharp(input)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality, alphaQuality: 90 })
    .toFile(output);
  console.log(`${job.src}: ${statSync(input).size} B -> ${path.basename(output)} ${info.size} B (${info.width}x${info.height})`);
}
