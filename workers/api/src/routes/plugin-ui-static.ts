import { Hono } from "hono";
import type { AppEnv } from "../lib/types.js";

export function pluginUiStaticRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/_plugins/:pluginId/ui/*", (c) =>
    c.json(
      {
        error: "Plugin UI serving is not available in the Workers deployment",
        hint: "Plugin UI bundles require filesystem access available only in the Node.js server",
      },
      501,
    ),
  );

  return app;
}
