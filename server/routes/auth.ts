import type { Express } from "express";
import { timingSafeEqual } from "crypto";
import rateLimit from "express-rate-limit";

export function register(app: Express) {
  // Read dashboard password from env. No source-code fallback — see fail-fast
  // check at boot in server/index.ts for production. In dev, a missing value
  // disables login (returns 401) so credentials are never accidentally hardcoded.
  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

  const passwordMatches = (provided: string, expected: string): boolean => {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  };

  // Rate limit login attempts. With trust proxy = 1 set in index.ts, this keys
  // off X-Forwarded-For (Replit's proxy) so each client IP gets its own bucket.
  // skipSuccessfulRequests so legitimate logins don't burn through the budget.
  const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
  });

  // POST /api/auth/login - Dashboard login
  app.post("/api/auth/login", loginRateLimit, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      if (!DASHBOARD_PASSWORD) {
        console.error("DASHBOARD_PASSWORD env var is not set; login disabled");
        return res.status(503).json({ error: "Login is not configured" });
      }

      // Only allow "admin" username
      if (username !== "admin") {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (passwordMatches(password, DASHBOARD_PASSWORD)) {
        req.session.isAuthenticated = true;
        // Explicitly save session to ensure it persists
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({ error: "Session save failed" });
          }
          res.json({ success: true });
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // GET /api/auth/check - Check if user is authenticated
  app.get("/api/auth/check", async (req, res) => {
    res.json({ isAuthenticated: !!req.session.isAuthenticated });
  });

  // POST /api/auth/logout - Logout
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}
