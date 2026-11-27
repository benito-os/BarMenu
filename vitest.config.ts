import { defineConfig } from "vitest/config";
import path from "path";

// Separate from vite.config.ts on purpose: tests run in node with no Replit
// plugins, and must not need DATABASE_URL (test pure logic or inject a fake
// IStorage; never import server/db.ts from a test).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "client/src/**/*.test.ts"],
  },
});
