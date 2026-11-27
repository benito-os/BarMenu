/**
 * Pure helpers for static-file caching and compression. Kept free of vite and
 * db imports so they can be unit-tested without either.
 */

const IMMUTABLE = "public, max-age=31536000, immutable";
const NO_CACHE = "no-cache";

/**
 * Cache-Control for a file served from the client build.
 * `urlPath` is the URL path relative to the site root, e.g. "/assets/index-abc123.js".
 * Vite content-hashes everything under /assets/, so those can be cached for a
 * year. Everything else (index.html, favicon, robots.txt, unhashed images)
 * must revalidate, otherwise a deploy strands open tabs on a stale shell that
 * points at chunk files that no longer exist.
 */
export function staticCacheControl(urlPath: string): string {
  const normalized = "/" + urlPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized.startsWith("/assets/") ? IMMUTABLE : NO_CACHE;
}

/**
 * Should a response with this Content-Type be gzip/br compressed?
 * Skips formats that are already compressed: raster images (but not SVG,
 * which is text), woff2/woff fonts, video/audio, archives.
 */
export function shouldCompress(contentType: string | number | string[] | undefined): boolean {
  if (contentType === undefined) return true;
  const type = String(Array.isArray(contentType) ? contentType[0] : contentType)
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (type === "image/svg+xml") return true;
  if (type.startsWith("image/")) return false;
  if (type.startsWith("video/") || type.startsWith("audio/")) return false;
  if (type === "font/woff2" || type === "font/woff" || type === "application/font-woff2") return false;
  if (type === "application/zip" || type === "application/gzip" || type === "application/pdf") return false;
  return true;
}
