import { Hono } from "hono";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { activityLog, heartbeatRuns } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { notFound } from "../lib/errors.js";
import { resolveIssueByRef } from "../lib/issues.js";

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

  app.get("/issues/:id/activity", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id");
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);

    const rows = await db
      .select()
      .from(activityLog)
      .where(and(eq(activityLog.entityType, "issue"), eq(activityLog.entityId, issue.id)))
      .orderBy(desc(activityLog.createdAt));

    return c.json(rows);
  });

  app.get("/issues/:id/runs", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id");
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);

    const rows = await db
      .select({
        runId: heartbeatRuns.id,
        status: heartbeatRuns.status,
        agentId: heartbeatRuns.agentId,
        startedAt: heartbeatRuns.startedAt,
        finishedAt: heartbeatRuns.finishedAt,
        createdAt: heartbeatRuns.createdAt,
        invocationSource: heartbeatRuns.invocationSource,
        usageJson: heartbeatRuns.usageJson,
        resultJson: heartbeatRuns.resultJson,
      })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.companyId, issue.companyId),
          or(
            sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issue.id}`,
            sql`exists (
              select 1
              from ${activityLog}
              where ${activityLog.companyId} = ${issue.companyId}
                and ${activityLog.entityType} = 'issue'
                and ${activityLog.entityId} = ${issue.id}
                and ${activityLog.runId} = ${heartbeatRuns.id}
            )`,
          ),
        ),
      )
      .orderBy(desc(heartbeatRuns.createdAt));

    return c.json(rows);
  });

  return app;
}
