import { Router } from "express";

export function companyRoutes(): Router {
  const router = Router();

  router.get("/companies", async (_req, res) => {
    res.json({ companies: [] });
  });

  router.get("/companies/:companyId", async (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return router;
}
