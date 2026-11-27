import type { RequestHandler } from "express";
import helmet from "helmet";

/**
 * Security headers on every answer (API, dashboard, guest menu, static files). Mounted first in server/index.ts.
 *
 * - CSP is ENFORCED in production. Set CSP_ENFORCE=false (or 0/off/no) to send the same policy report-only
 *   (violations show in the browser console, nothing is blocked) if a change breaks something. Outside production it
 *   is always report-only, because Vite dev injects inline scripts.
 * - Sources the app uses: Google Fonts (css + font files); image uploads PUT straight to a presigned Google Cloud
 *   Storage URL (Replit object storage), hence connect-src storage.googleapis.com; menu images may be any https URL.
 *   style-src keeps 'unsafe-inline' for React style= attributes and the chart component's <style> tag.
 * - If you add a third-party script, iframe or API call in the browser, add its host here.
 * - HSTS in production only. Frames denied except in the Replit workspace preview (dev only).
 * - COEP/COOP/CORP off: not needed, and they break popups and cross-origin images.
 */
export function securityHeaders(env: Record<string, string | undefined> = process.env): RequestHandler {
  const prod = env.NODE_ENV === "production";
  const flag = env.CSP_ENFORCE?.trim().toLowerCase();
  const enforce = prod && !(flag === "false" || flag === "0" || flag === "off" || flag === "no");
  const framed = !prod && !!env.REPLIT_DEV_DOMAIN;

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "form-action": ["'self'"],
    "script-src": ["'self'", ...(prod ? [] : ["'unsafe-inline'", "'unsafe-eval'", "https://replit.com"])],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": ["'self'", "https://storage.googleapis.com", ...(prod ? [] : ["ws:", "wss:"])],
    "frame-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    ...(framed ? {} : { "frame-ancestors": ["'none'"] }),
  };

  return helmet({
    contentSecurityPolicy: { useDefaults: false, directives, reportOnly: !enforce },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: framed ? false : { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: prod ? { maxAge: 15552000, includeSubDomains: false } : false,
  });
}
