// Stub - requests routes not in Ciutatis V1 scope
// Request/inbox system intentionally removed
// This file exists only to satisfy upstream imports

import { Router } from "express";

const router = Router();

// Request routes not available in Ciutatis V1
router.use((_req, res) => {
  res.status(404).json({ error: "Request system not available in Ciutatis V1" });
});

export default router;
