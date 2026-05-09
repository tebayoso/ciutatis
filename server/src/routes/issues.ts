import { Router } from "express";

export function issueRoutes(): Router {
  const router = Router();

  router.get("/companies/:companyId/issues", async (_req, res) => {
    res.json({ issues: [] });
  });

  router.get("/companies/:companyId/issues/:issueId", async (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return router;
}
