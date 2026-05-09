import { Router } from "express";

export function inboxDismissalRoutes(): Router {
  const router = Router();

  router.get("/users/me/inbox-dismissals", async (_req, res) => {
    res.json({ dismissals: [] });
  });

  return router;
}
