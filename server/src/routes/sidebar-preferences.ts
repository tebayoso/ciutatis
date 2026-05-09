import { Router } from "express";

export function sidebarPreferenceRoutes(): Router {
  const router = Router();

  router.get("/users/me/sidebar-preferences", async (_req, res) => {
    res.json({ preferences: {} });
  });

  return router;
}
