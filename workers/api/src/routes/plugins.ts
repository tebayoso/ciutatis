import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../lib/types.js";

const STUB_RESPONSE = {
  error: "Plugin system is not available in the Workers deployment",
  hint: "Plugins require the Node.js server runtime for filesystem and worker_threads access",
} as const;

function stub(c: Context<AppEnv>) {
  return c.json(STUB_RESPONSE, 501);
}

export function pluginRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/plugins", (c) => c.json([]));
  app.get("/plugins/examples", (c) => c.json([]));
  app.get("/plugins/ui-contributions", (c) => c.json([]));
  app.get("/companies/:companyId/plugins", (c) => stub(c));
  app.post("/companies/:companyId/plugins/install", (c) => stub(c));
  app.post("/plugins/:pluginId/uninstall", (c) => stub(c));
  app.post("/plugins/:pluginId/enable", (c) => stub(c));
  app.post("/plugins/:pluginId/disable", (c) => stub(c));
  app.post("/plugins/:pluginId/upgrade", (c) => stub(c));
  app.get("/plugins/:pluginId/health", (c) => stub(c));
  app.get("/plugins/:pluginId/logs", (c) => stub(c));
  app.get("/companies/:companyId/plugin-ui-slots", (c) => stub(c));
  app.get("/companies/:companyId/plugin-tools", (c) => stub(c));
  app.post("/companies/:companyId/plugin-tools/:toolId/run", (c) => stub(c));
  app.get("/plugins/:pluginId/webhook-deliveries", (c) => stub(c));
  app.get("/companies/:companyId/plugins/settings", (c) => stub(c));
  app.patch("/companies/:companyId/plugins/:pluginId/settings", (c) => stub(c));

  return app;
}
