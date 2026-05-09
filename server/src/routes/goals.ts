import { Router } from "express";

export function goalRoutes(): Router {
  const router = Router();

  router.get("/companies/:companyId/goals", async (_req, res) => {
    res.json({ goals: [] });
  });

  return router;
}
