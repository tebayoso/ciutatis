// Stub - plugins routes not in Ciutatis V1 scope
// This file exists only to satisfy upstream imports

import { Router } from "express";
import type { Db } from "@paperclipai/db";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function pluginRoutes(
  _db: Db,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _loader: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _scheduler: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workerManager: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _toolDispatcher: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workerManager2: unknown,
): Router {
  const router = Router();

  // Plugin routes not available in Ciutatis V1
  // All routes return 404
  router.use((_req, res) => {
    res.status(404).json({ error: "Plugins not available in Ciutatis V1" });
  });

  return router;
}

export default pluginRoutes;
