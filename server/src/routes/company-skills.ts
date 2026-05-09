import { Router } from "express";

export function companySkillRoutes(): Router {
  const router = Router();

  router.get("/companies/:companyId/skills", async (_req, res) => {
    res.json({ skills: [] });
  });

  return router;
}
