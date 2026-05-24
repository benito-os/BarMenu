import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // The `session` table is created and managed by connect-pg-simple at
  // runtime (see server/index.ts). It isn't in shared/schema.ts, so
  // drizzle-kit would otherwise propose dropping it on every push and
  // log every active dashboard user out. Exclude it from drizzle's view.
  tablesFilter: ["!session"],
});
