import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
  }
}

// Body parsers must come before session middleware.
// 2MB limit is sized for CSV imports (the largest legitimate payload); the
// csvImportSchema in shared/validation enforces the same ceiling at the
// application layer with a clean error message.
app.use(express.json({
  limit: "2mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Trust proxy for production (Replit uses a proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// In production, secrets must be set in Replit Secrets — fail fast at boot
// rather than silently running with hardcoded defaults.
if (process.env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET must be set in production (configure it in Replit Secrets)",
    );
  }
  if (!process.env.DASHBOARD_PASSWORD) {
    throw new Error(
      "DASHBOARD_PASSWORD must be set in production (configure it in Replit Secrets)",
    );
  }
}

// Session setup for dashboard authentication (after body parsers).
// Sessions are persisted in Postgres (via connect-pg-simple) so they survive
// Replit container restarts. The "session" table is created on first run.
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    // "lax" is sufficient because the dashboard and the API are same-origin.
    // "none" was wider than needed and only meaningful for cross-site requests
    // we don't make.
    sameSite: "lax",
  }
}));

// Request logger. Logs method/path/status/duration only — response bodies are
// not captured because they leak sensitive data (session info, order details,
// settings) into logs and can be retrieved from the response in a debugger if
// needed.
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error middleware must come after Vite/static serving
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    log(
      `error status=${status} path=${req.path} stack=${
        err?.stack || "<no-stack>"
      }`,
    );

    if (res.headersSent) {
      return;
    }

    res.status(status).json({ message });
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
