import { describe, expect, it } from "vitest";
import { shouldCompress, staticCacheControl } from "./static";

describe("staticCacheControl", () => {
  it("marks hashed build assets immutable", () => {
    expect(staticCacheControl("/assets/index-abc123.js")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(staticCacheControl("assets/style-1.css")).toBe("public, max-age=31536000, immutable");
    expect(staticCacheControl("\\assets\\x.js")).toBe("public, max-age=31536000, immutable");
  });

  it("never caches the HTML shell or unhashed files", () => {
    expect(staticCacheControl("/index.html")).toBe("no-cache");
    expect(staticCacheControl("/")).toBe("no-cache");
    expect(staticCacheControl("/favicon.png")).toBe("no-cache");
    expect(staticCacheControl("/robots.txt")).toBe("no-cache");
  });

  it("does not treat lookalike paths as assets", () => {
    expect(staticCacheControl("/my-assets/x.js")).toBe("no-cache");
    expect(staticCacheControl("/foo/assets/x.js")).toBe("no-cache");
    expect(staticCacheControl("/assetsx.js")).toBe("no-cache");
  });
});

describe("shouldCompress", () => {
  it("compresses text formats", () => {
    expect(shouldCompress("text/html; charset=utf-8")).toBe(true);
    expect(shouldCompress("application/javascript")).toBe(true);
    expect(shouldCompress("application/json; charset=utf-8")).toBe(true);
    expect(shouldCompress("text/css")).toBe(true);
    expect(shouldCompress("image/svg+xml")).toBe(true);
    expect(shouldCompress(undefined)).toBe(true);
  });

  it("skips already-compressed formats", () => {
    expect(shouldCompress("image/png")).toBe(false);
    expect(shouldCompress("image/jpeg")).toBe(false);
    expect(shouldCompress("image/webp")).toBe(false);
    expect(shouldCompress("font/woff2")).toBe(false);
    expect(shouldCompress("video/mp4")).toBe(false);
    expect(shouldCompress("application/zip")).toBe(false);
  });
});
