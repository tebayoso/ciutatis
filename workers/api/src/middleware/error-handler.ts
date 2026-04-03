import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors.js";
import type { AppEnv } from "../lib/types.js";

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HttpError) {
    return c.json(
      {
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      err.status as any,
    );
  }

  if (err instanceof ZodError) {
    return c.json({ error: "Validation error", details: err.errors }, 400);
  }

  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
};
