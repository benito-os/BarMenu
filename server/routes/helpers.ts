import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { isStorageError } from "../errors";
import { storage } from "../storage";

export const respondValidationError = (
  res: Response,
  error: unknown,
  message: string,
) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: message, details: error.issues });
  }

  return res.status(400).json({ error: message });
};

// Generic over the schema itself (not just its output) so that schemas with
// transforms / pipes — where input and output types differ — still satisfy
// the constraint. The return type is inferred from the schema's output.
export const validate = <S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  res: Response,
  message: string,
): z.infer<S> | undefined => {
  const result = schema.safeParse(data);
  if (!result.success) {
    respondValidationError(res, result.error, message);
    return undefined;
  }

  return result.data;
};

export const mapStorageError = (error: unknown) => {
  if (isStorageError(error)) {
    return {
      status: error.options.status,
      body: {
        error: error.message,
        code: error.options.code,
        details: error.options.context,
      },
    } as const;
  }

  return null;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.isAuthenticated) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required" });
};

// Tiny TTL cache around storage.getSettings so the order rate limit can read
// its threshold per request without hammering Postgres. Lives here because
// the orders routes read it and PATCH /api/settings busts it.
let cachedSettings: { value: Awaited<ReturnType<typeof storage.getSettings>>; fetchedAt: number } | null = null;
const SETTINGS_TTL_MS = 30 * 1000;

export const getCachedSettings = async () => {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  const value = await storage.getSettings();
  cachedSettings = { value, fetchedAt: Date.now() };
  return value;
};

export const bustSettingsCache = () => {
  cachedSettings = null;
};
