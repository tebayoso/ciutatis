import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { activityLog } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess, getActorInfo } from "../lib/authz.js";

export function activityRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/activity", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const limit = Math.min(Number(c.req.query("limit") || 50), 200);
    const offset = Number(c.req.query("offset") || 0);

    const rows = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.companyId, companyId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json(rows);
  });

  app.post("/companies/:companyId/activity", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const actorInfo = getActorInfo(c);
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(activityLog).values({
      id,
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      action: body.action,
      entityType: body.entityType,
      entityId: body.entityId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      details: body.details ?? null,
      createdAt: now,
    });

    return c.json({ id }, 201);
  });

  return app;
}
