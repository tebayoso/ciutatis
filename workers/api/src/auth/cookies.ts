import type { Context } from "hono";

export const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";

export type SameSitePolicy = "Lax" | "Strict" | "None";

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSitePolicy;
  path?: string;
  maxAge?: number;
}

const DEFAULT_MAX_AGE_SECONDS = 86_400;

function isProductionContext(c: Context): boolean {
  const env = (c as Context<{ Bindings?: { NODE_ENV?: string } }>).env;
  if (env?.NODE_ENV === "production") return true;

  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
}

function encodeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

export function parseAuthCookie(c: Context): string | null {
  const cookieHeader = c.req.header("cookie");
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;

    const name = trimmed.slice(0, equalsIndex).trim();
    if (name !== BETTER_AUTH_SESSION_COOKIE) continue;

    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!rawValue) return "";

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function serializeAuthCookie(c: Context, token: string, options: CookieOptions = {}): string {
  const httpOnly = options.httpOnly ?? true;
  const secure = options.secure ?? isProductionContext(c);
  const sameSite = options.sameSite ?? "Lax";
  const path = options.path ?? "/";
  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE_SECONDS;

  const segments = [`${BETTER_AUTH_SESSION_COOKIE}=${encodeCookieValue(token)}`];

  if (httpOnly) segments.push("HttpOnly");
  if (secure) segments.push("Secure");
  segments.push(`SameSite=${sameSite}`);
  segments.push(`Path=${path}`);
  segments.push(`MaxAge=${Math.max(0, Math.floor(maxAge))}`);

  return segments.join("; ");
}
