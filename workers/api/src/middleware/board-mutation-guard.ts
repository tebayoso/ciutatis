import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/types.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3100",
  "http://127.0.0.1:3100",
];

function parseOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export const boardMutationGuard = createMiddleware<AppEnv>(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method.toUpperCase())) {
    await next();
    return;
  }

  const actor = c.get("actor");
  if (actor.type !== "board") {
    await next();
    return;
  }

  if (actor.source === "local_implicit") {
    await next();
    return;
  }

  const origins = new Set(DEFAULT_DEV_ORIGINS.map((v) => v.toLowerCase()));
  const host = c.req.header("host")?.trim();
  if (host) {
    origins.add(`http://${host}`.toLowerCase());
    origins.add(`https://${host}`.toLowerCase());
  }

  const origin = parseOrigin(c.req.header("origin"));
  if (origin && origins.has(origin)) {
    await next();
    return;
  }

  const refererOrigin = parseOrigin(c.req.header("referer"));
  if (refererOrigin && origins.has(refererOrigin)) {
    await next();
    return;
  }

  return c.json({ error: "Board mutation requires trusted browser origin" }, 403);
});
