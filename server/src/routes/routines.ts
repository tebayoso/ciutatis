import { Router } from "express";

export function routineRoutes(): Router {
  const router = Router();

  router.get("/companies/:companyId/routines", async (_req, res) => {
    res.json({ routines: [] });
  });

  return router;
}
