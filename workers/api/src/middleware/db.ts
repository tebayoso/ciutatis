import { createMiddleware } from "hono/factory";
import { createDb } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  await next();
});
