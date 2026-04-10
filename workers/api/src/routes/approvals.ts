import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import { approvals, approvalComments, issueApprovals, issues } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { notFound, forbidden } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";

function redactPayload(payload: Record<string, unknown> | null): Record<string, unknown> {
  if (!payload) return {};
  const result = { ...payload };
  for (const key of Object.keys(result)) {
    if (/secret|password|token|key/i.test(key) && typeof result[key] === "string") {
      result[key] = "[REDACTED]";
    }
  }
  if (result.adapterConfig && typeof result.adapterConfig === "object") {
    const ac = result.adapterConfig as Record<string, unknown>;
    const redacted = { ...ac };
    for (const key of Object.keys(redacted)) {
      if (/secret|password|token|key/i.test(key) && typeof redacted[key] === "string") {
        redacted[key] = "[REDACTED]";
      }
    }
    result.adapterConfig = redacted;
  }
  return result;
}

export function approvalCompanyRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/approvals", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const status = c.req.query("status");

    const conditions = [eq(approvals.companyId, companyId)];
    if (status) conditions.push(eq(approvals.status, status));

    const rows = await db
      .select()
      .from(approvals)
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt));

    return c.json(rows.map((r) => ({ ...r, payload: redactPayload(r.payload as Record<string, unknown>) })));
  });

  app.post("/companies/:companyId/approvals", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();
    const actor = getActorInfo(c);
    const rawIssueIds: unknown = body.issueIds;
    const issueIds = Array.isArray(rawIssueIds)
      ? Array.from(new Set(rawIssueIds.filter((value): value is string => typeof value === "string")))
      : [];

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(approvals).values({
      id,
      companyId,
      type: body.type,
      requestedByAgentId: body.requestedByAgentId ?? (actor.actorType === "agent" ? actor.actorId : null),
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      status: "pending",
      payload: body.payload ?? {},
      createdAt: now,
      updatedAt: now,
    });

    if (issueIds.length > 0) {
      await db.insert(issueApprovals).values(
        issueIds.map((issueId) => ({
          companyId,
          issueId,
          approvalId: id,
          linkedByAgentId: actor.agentId ?? null,
          linkedByUserId: actor.actorType === "user" ? actor.actorId : null,
          createdAt: now,
        })),
      );
    }

    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.created",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type, issueIds },
    });

    return c.json({ ...approval, payload: redactPayload(approval.payload as Record<string, unknown>) }, 201);
  });

  return app;
}

export function approvalByIdRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/approvals/:id", async (c) => {
    const id = c.req.param("id")!;
    const db = c.get("db");
    const approval = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!approval) throw notFound("Approval not found");
    assertCompanyAccess(c, approval.companyId);
    return c.json({ ...approval, payload: redactPayload(approval.payload as Record<string, unknown>) });
  });

  app.post("/approvals/:id/approve", async (c) => {
    assertBoard(c);
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();
    const actor = c.get("actor");

    const existing = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Approval not found");
    assertCompanyAccess(c, existing.companyId);

    const now = new Date().toISOString();
    await db
      .update(approvals)
      .set({
        status: "approved",
        decidedByUserId: body.decidedByUserId ?? (actor.type === "board" ? actor.userId : "board"),
        decisionNote: body.decisionNote ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvals.id, id));

    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: "user",
      actorId: actor.type === "board" ? actor.userId : "board",
      action: "approval.approved",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type },
    });

    return c.json({ ...approval, payload: redactPayload(approval.payload as Record<string, unknown>) });
  });

  app.post("/approvals/:id/reject", async (c) => {
    assertBoard(c);
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();
    const actor = c.get("actor");

    const existing = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Approval not found");
    assertCompanyAccess(c, existing.companyId);

    const now = new Date().toISOString();
    await db
      .update(approvals)
      .set({
        status: "rejected",
        decidedByUserId: body.decidedByUserId ?? (actor.type === "board" ? actor.userId : "board"),
        decisionNote: body.decisionNote ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvals.id, id));

    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: "user",
      actorId: actor.type === "board" ? actor.userId : "board",
      action: "approval.rejected",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type },
    });

    return c.json({ ...approval, payload: redactPayload(approval.payload as Record<string, unknown>) });
  });

  app.post("/approvals/:id/request-revision", async (c) => {
    assertBoard(c);
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();
    const actor = c.get("actor");

    const existing = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Approval not found");

    const now = new Date().toISOString();
    await db
      .update(approvals)
      .set({
        status: "revision_requested",
        decidedByUserId: body.decidedByUserId ?? (actor.type === "board" ? actor.userId : "board"),
        decisionNote: body.decisionNote ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(approvals.id, id));

    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));
    return c.json({ ...approval, payload: redactPayload(approval.payload as Record<string, unknown>) });
  });

  app.post("/approvals/:id/resubmit", async (c) => {
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();

    const existing = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Approval not found");
    assertCompanyAccess(c, existing.companyId);

    const actor = c.get("actor");
    if (actor.type === "agent" && actor.agentId !== existing.requestedByAgentId) {
      throw forbidden("Only requesting agent can resubmit this approval");
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: "pending",
      decidedByUserId: null,
      decisionNote: null,
      decidedAt: null,
      updatedAt: now,
    };
    if (body.payload) updates.payload = body.payload;

    await db.update(approvals).set(updates).where(eq(approvals.id, id));
    const [approval] = await db.select().from(approvals).where(eq(approvals.id, id));
    return c.json({ ...approval, payload: redactPayload(approval.payload as Record<string, unknown>) });
  });

  app.get("/approvals/:id/comments", async (c) => {
    const id = c.req.param("id")!;
    const db = c.get("db");
    const approval = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!approval) throw notFound("Approval not found");
    assertCompanyAccess(c, approval.companyId);

    const comments = await db
      .select()
      .from(approvalComments)
      .where(eq(approvalComments.approvalId, id))
      .orderBy(approvalComments.createdAt);

    return c.json(comments);
  });

  app.get("/approvals/:id/issues", async (c) => {
    const id = c.req.param("id")!;
    const db = c.get("db");
    const approval = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!approval) throw notFound("Approval not found");
    assertCompanyAccess(c, approval.companyId);

    const links = await db.select().from(issueApprovals).where(eq(issueApprovals.approvalId, id));
    if (links.length === 0) return c.json([]);

    const issueRows = await db.select().from(issues).where(inArray(issues.id, links.map((link) => link.issueId)));
    return c.json(issueRows);
  });

  app.post("/approvals/:id/comments", async (c) => {
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();

    const approval = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!approval) throw notFound("Approval not found");
    assertCompanyAccess(c, approval.companyId);

    const actor = getActorInfo(c);
    const now = new Date().toISOString();

    await db.insert(approvalComments).values({
      approvalId: id,
      companyId: approval.companyId,
      body: body.body,
      authorAgentId: actor.agentId ?? null,
      authorUserId: actor.actorType === "user" ? actor.actorId : null,
      createdAt: now,
      updatedAt: now,
    });

    const comments = await db
      .select()
      .from(approvalComments)
      .where(eq(approvalComments.approvalId, id))
      .orderBy(desc(approvalComments.createdAt))
      .limit(1);
    const comment = comments[0]!;

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.comment_added",
      entityType: "approval",
      entityId: approval.id,
      details: { commentId: comment.id },
    });

    return c.json(comment, 201);
  });

  return app;
}
