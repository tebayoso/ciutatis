import { Hono } from "hono";
import {
  eq,
  and,
  desc,
  asc,
  inArray,
  like,
  sql,
  gt,
  isNull,
  isNotNull,
  or,
} from "drizzle-orm";
import {
  issues,
  issueComments,
  issueLabels,
  issueAttachments,
  issueDocuments,
  issueWorkProducts,
  issueReadStates,
  issueApprovals,
  labels,
  projects,
  objectives,
  agents,
  documents,
  documentRevisions,
  heartbeatRuns,
  approvals,
  assets,
} from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import {
  assertBoard,
  assertCompanyAccess,
  getActorInfo,
} from "../lib/authz.js";
import { resolveIssueByRef } from "../lib/issues.js";
import {
  notFound,
  badRequest,
  conflict,
  forbidden,
  unprocessable,
} from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";
import { enqueueHostedHeartbeatRun } from "../lib/hosted-heartbeats.js";

export function requestRoutes() {
  const app = new Hono<AppEnv>();

  // GET /issues (without companyId → 400)
  app.get("/issues", async (c) => {
    throw badRequest("Use /companies/:companyId/issues to list issues");
  });

  // GET /companies/:companyId/issues
  app.get("/companies/:companyId/issues", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);

    const status = c.req.query("status");
    const assigneeAgentId = c.req.query("assigneeAgentId");
    const projectId = c.req.query("projectId");
    const parentId = c.req.query("parentId");
    const labelId = c.req.query("labelId");
    const q = c.req.query("q");

    const conditions: ReturnType<typeof eq>[] = [eq(issues.companyId, companyId)];

    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        conditions.push(inArray(issues.status, statuses));
      }
    }
    if (assigneeAgentId) {
      conditions.push(eq(issues.assigneeAgentId, assigneeAgentId));
    }
    if (projectId) {
      conditions.push(eq(issues.projectId, projectId));
    }
    if (parentId === "null") {
      conditions.push(isNull(issues.parentId));
    } else if (parentId) {
      conditions.push(eq(issues.parentId, parentId));
    }
    if (q) {
      conditions.push(like(issues.title, `%${q}%`));
    }

    let rows = await db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(desc(issues.updatedAt));

    if (labelId) {
      const labelLinks = await db
        .select({ issueId: issueLabels.issueId })
        .from(issueLabels)
        .where(and(eq(issueLabels.companyId, companyId), eq(issueLabels.labelId, labelId)));
      const issueIds = labelLinks.map((l) => l.issueId);
      rows = rows.filter((r) => issueIds.includes(r.id));
    }

    return c.json(rows);
  });

  // GET /companies/:companyId/labels
  app.get("/companies/:companyId/labels", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const rows = await db
      .select()
      .from(labels)
      .where(eq(labels.companyId, companyId))
      .orderBy(labels.name);
    return c.json(rows);
  });

  // POST /companies/:companyId/labels
  app.post("/companies/:companyId/labels", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);
    const body = await c.req.json();
    if (!body.name) throw badRequest("name is required");

    await db.insert(labels).values({
      companyId,
      name: body.name,
      color: body.color ?? "#6B7280",
    });
    const created = await db
      .select()
      .from(labels)
      .where(and(eq(labels.companyId, companyId), eq(labels.name, body.name)))
      .then((r: any[]) => r[0]);

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "label.created",
      entityType: "label",
      entityId: created?.id ?? "",
      details: { name: body.name },
    });
    return c.json(created, 201);
  });

  // DELETE /labels/:labelId
  app.delete("/labels/:labelId", async (c) => {
    const db = c.get("db");
    const labelId = c.req.param("labelId")!;
    const label = await db
      .select()
      .from(labels)
      .where(eq(labels.id, labelId))
      .then((r: any[]) => r[0] ?? null);
    if (!label) throw notFound("Label not found");
    assertCompanyAccess(c, label.companyId);
    assertBoard(c);
    await db.delete(labels).where(eq(labels.id, labelId));
    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: label.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "label.deleted",
      entityType: "label",
      entityId: labelId,
      details: { name: label.name },
    });
    return c.json({ success: true });
  });

  // GET /issues/:id
  app.get("/issues/:id", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const issue = await db
      .select()
      .from(issues)
      .where(or(eq(issues.id, id), eq(issues.identifier, id)))
      .then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);

    let project = null;
    if (issue.projectId) {
      project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, issue.projectId))
        .then((r: any[]) => r[0] ?? null);
    }

    let goal = null;
    if (issue.goalId) {
      goal = await db
        .select()
        .from(objectives)
        .where(eq(objectives.id, issue.goalId))
        .then((r: any[]) => r[0] ?? null);
    }

    const ancestors: any[] = [];
    let current = issue;
    while (current.parentId) {
      const parent = await db
        .select()
        .from(issues)
        .where(eq(issues.id, current.parentId))
        .then((r: any[]) => r[0] ?? null);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }

    const workProducts = await db
      .select()
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.issueId, issue.id));

    const issueLabelRows = await db
      .select()
      .from(issueLabels)
      .where(eq(issueLabels.issueId, issue.id));
    const labelIds = issueLabelRows.map((l) => l.labelId);
    const labelRows = labelIds.length > 0
      ? await db.select().from(labels).where(inArray(labels.id, labelIds))
      : [];

    return c.json({
      ...issue,
      project,
      goal,
      ancestors,
      workProducts,
      labels: labelRows,
    });
  });

  // GET /issues/:id/heartbeat-context
  app.get("/issues/:id/heartbeat-context", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    let project = null;
    if (issue.projectId) {
      project = await db.select().from(projects).where(eq(projects.id, issue.projectId)).then((r: any[]) => r[0] ?? null);
    }
    let goal = null;
    if (issue.goalId) {
      goal = await db.select().from(objectives).where(eq(objectives.id, issue.goalId)).then((r: any[]) => r[0] ?? null);
    }

    const ancestors: any[] = [];
    let cur = issue;
    while (cur.parentId) {
      const parent = await db.select().from(issues).where(eq(issues.id, cur.parentId)).then((r: any[]) => r[0] ?? null);
      if (!parent) break;
      ancestors.unshift(parent);
      cur = parent;
    }

    const wakeCommentId = c.req.query("wakeCommentId");
    let wakeComment = null;
    if (wakeCommentId) {
      wakeComment = await db.select().from(issueComments).where(eq(issueComments.id, wakeCommentId)).then((r: any[]) => r[0] ?? null);
    }

    const recentComments = await db
      .select()
      .from(issueComments)
      .where(eq(issueComments.issueId, issueId))
      .orderBy(desc(issueComments.createdAt))
      .limit(20);

    return c.json({
      issue,
      project,
      goal,
      ancestors,
      recentComments,
      wakeComment,
    });
  });

  // POST /companies/:companyId/issues
  app.post("/companies/:companyId/issues", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const body = await c.req.json();
    if (!body.title) throw badRequest("title is required");

    const actor = c.get("actor");
    const actorInfo = getActorInfo(c);

    const issueCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.companyId, companyId))
      .then((r) => r[0]?.count ?? 0);
    const issueNumber = Number(issueCount) + 1;

    const company = await db
      .select()
      .from((await import("@ciutatis/db-cloudflare")).companies)
      .where(eq((await import("@ciutatis/db-cloudflare")).companies.id, companyId))
      .then((r: any[]) => r[0] ?? null);
    const prefix = company?.issuePrefix ?? "ISS";
    const identifier = `${prefix}-${issueNumber}`;

    await db.insert(issues).values({
      companyId,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "backlog",
      priority: body.priority ?? "medium",
      assigneeAgentId: body.assigneeAgentId ?? null,
      assigneeUserId: body.assigneeUserId ?? null,
      projectId: body.projectId ?? null,
      goalId: body.goalId ?? null,
      parentId: body.parentId ?? null,
      createdByAgentId: actor.type === "agent" ? actor.agentId : null,
      createdByUserId: actor.type === "board" ? actor.userId : null,
      issueNumber,
      identifier,
      requestDepth: body.parentId ? 1 : 0,
    });

    const created = await db
      .select()
      .from(issues)
      .where(eq(issues.identifier, identifier))
      .then((r: any[]) => r[0]);

    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.created",
      entityType: "issue",
      entityId: created?.id ?? "",
      details: { title: body.title, identifier },
    });

    if (body.assigneeAgentId && body.status !== "backlog") {
      void enqueueHostedHeartbeatRun({
        db,
        env: c.env,
        executionCtx: c.executionCtx,
        agentId: body.assigneeAgentId,
        source: "assignment",
        triggerDetail: "system",
        reason: "issue_assigned",
        payload: {
          issueId: created?.id ?? null,
          mutation: "create",
        },
        requestedByActorType: actorInfo.actorType,
        requestedByActorId: actorInfo.actorId,
        contextSnapshot: {
          issueId: created?.id ?? null,
          taskId: created?.id ?? null,
          source: "issue.create",
          wakeReason: "issue_assigned",
        },
      }).catch(() => undefined);
    }

    return c.json(created, 201);
  });

  // PATCH /issues/:id
  app.patch("/issues/:id", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const body = await c.req.json();
    const now = new Date().toISOString();
    const actorInfo = getActorInfo(c);
    const actor = c.get("actor");

    const patch: Record<string, unknown> = { updatedAt: now };

    const allowedFields = [
      "title", "description", "status", "priority",
      "assigneeAgentId", "assigneeUserId", "projectId",
      "goalId", "parentId", "billingCode", "hiddenAt",
      "executionWorkspaceId", "executionWorkspacePreference",
      "executionWorkspaceSettings", "assigneeAdapterOverrides",
    ];
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        patch[key] = body[key];
      }
    }

    if (body.status === "in_progress" && issue.status !== "in_progress" && !issue.startedAt) {
      patch.startedAt = now;
    }
    if (body.status === "done" || body.status === "completed") {
      patch.completedAt = now;
    }
    if (body.status === "cancelled") {
      patch.cancelledAt = now;
    }

    await db.update(issues).set(patch as any).where(eq(issues.id, issueId));
    const updated = await db.select().from(issues).where(eq(issues.id, issueId)).then((r: any[]) => r[0]);

    if (body.comment && typeof body.comment === "string") {
      await db.insert(issueComments).values({
        companyId: issue.companyId,
        issueId: issueId,
        authorAgentId: actor.type === "agent" ? actor.agentId : null,
        authorUserId: actor.type === "board" ? actor.userId : null,
        body: body.comment,
      });
    }

    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.updated",
      entityType: "issue",
      entityId: issueId,
      details: { changedKeys: Object.keys(patch).filter((k) => k !== "updatedAt") },
    });

    if (body.assigneeAgentId && body.assigneeAgentId !== issue.assigneeAgentId) {
      void enqueueHostedHeartbeatRun({
        db,
        env: c.env,
        executionCtx: c.executionCtx,
        agentId: body.assigneeAgentId,
        source: "assignment",
        triggerDetail: "system",
        reason: "issue_assigned",
        payload: {
          issueId,
          mutation: "reassign",
        },
        requestedByActorType: actorInfo.actorType,
        requestedByActorId: actorInfo.actorId,
        contextSnapshot: {
          issueId,
          taskId: issueId,
          source: "issue.update",
          wakeReason: "issue_assigned",
        },
      }).catch(() => undefined);
    }

    return c.json(updated);
  });

  // DELETE /issues/:id
  app.delete("/issues/:id", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);
    assertBoard(c);
    await db.delete(issues).where(eq(issues.id, issueId));
    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.deleted",
      entityType: "issue",
      entityId: issueId,
      details: { title: issue.title },
    });
    return c.json({ success: true });
  });

  // POST /issues/:id/checkout
  app.post("/issues/:id/checkout", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const body = await c.req.json();
    if (!body.agentId) throw badRequest("agentId is required");

    if (issue.checkoutRunId) {
      throw conflict("Issue is already checked out");
    }

    const expectedStatuses = body.expectedStatuses ?? ["backlog", "todo", "in_progress"];
    if (!expectedStatuses.includes(issue.status)) {
      throw conflict(`Issue status "${issue.status}" not in expected statuses`);
    }

    const actor = c.get("actor");
    const runId = actor.type === "agent" ? actor.runId : undefined;
    if (!runId) throw badRequest("runId is required for checkout");

    const now = new Date().toISOString();
    await db
      .update(issues)
      .set({
        checkoutRunId: runId,
        executionRunId: runId,
        assigneeAgentId: body.agentId,
        status: issue.status === "backlog" ? "todo" : issue.status,
        executionLockedAt: now,
        updatedAt: now,
      } as any)
      .where(eq(issues.id, issueId));

    const updated = await db.select().from(issues).where(eq(issues.id, issueId)).then((r: any[]) => r[0]);

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.checked_out",
      entityType: "issue",
      entityId: issueId,
      details: { agentId: body.agentId, runId },
    });

    return c.json(updated);
  });

  // POST /issues/:id/release
  app.post("/issues/:id/release", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const now = new Date().toISOString();
    await db
      .update(issues)
      .set({
        checkoutRunId: null,
        executionLockedAt: null,
        updatedAt: now,
      } as any)
      .where(eq(issues.id, issueId));

    const updated = await db.select().from(issues).where(eq(issues.id, issueId)).then((r: any[]) => r[0]);

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.released",
      entityType: "issue",
      entityId: issueId,
      details: {},
    });

    return c.json(updated);
  });

  // GET /issues/:id/comments
  app.get("/issues/:id/comments", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const order = c.req.query("order") === "asc" ? asc : desc;
    const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
    const afterCommentId = c.req.query("afterCommentId");

    let conditions = [eq(issueComments.issueId, issueId)];
    if (afterCommentId) {
      const afterComment = await db
        .select()
        .from(issueComments)
        .where(eq(issueComments.id, afterCommentId))
        .then((r: any[]) => r[0] ?? null);
      if (afterComment) {
        conditions.push(gt(issueComments.createdAt, afterComment.createdAt));
      }
    }

    const rows = await db
      .select()
      .from(issueComments)
      .where(and(...conditions))
      .orderBy(order(issueComments.createdAt))
      .limit(limit);

    return c.json(rows);
  });

  // GET /issues/:id/comments/:commentId
  app.get("/issues/:id/comments/:commentId", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const commentId = c.req.param("commentId")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const comment = await db
      .select()
      .from(issueComments)
      .where(and(eq(issueComments.id, commentId), eq(issueComments.issueId, issueId)))
      .then((r: any[]) => r[0] ?? null);
    if (!comment) throw notFound("Comment not found");
    return c.json(comment);
  });

  // POST /issues/:id/comments
  app.post("/issues/:id/comments", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const body = await c.req.json();
    if (!body.body) throw badRequest("body is required");

    const actor = c.get("actor");
    const actorInfo = getActorInfo(c);

    await db.insert(issueComments).values({
      companyId: issue.companyId,
      issueId: issueId,
      authorAgentId: actor.type === "agent" ? actor.agentId : null,
      authorUserId: actor.type === "board" ? actor.userId : null,
      body: body.body,
    });

    const created = await db
      .select()
      .from(issueComments)
      .where(eq(issueComments.issueId, issueId))
      .orderBy(desc(issueComments.createdAt))
      .limit(1)
      .then((r: any[]) => r[0]);

    if (body.reopen && issue.status === "done") {
      await db
        .update(issues)
        .set({ status: "in_progress", completedAt: null, updatedAt: new Date().toISOString() } as any)
        .where(eq(issues.id, issueId));
    }

    if (body.interrupt && issue.executionRunId) {
      await db
        .update(heartbeatRuns)
        .set({ status: "cancelled", finishedAt: new Date().toISOString() } as any)
        .where(and(eq(heartbeatRuns.id, issue.executionRunId), eq(heartbeatRuns.status, "running")));
    }

    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.comment_added",
      entityType: "issue",
      entityId: issueId,
      details: { commentId: created?.id },
    });

    if (issue.assigneeAgentId && created?.id) {
      void enqueueHostedHeartbeatRun({
        db,
        env: c.env,
        executionCtx: c.executionCtx,
        agentId: issue.assigneeAgentId,
        source: "automation",
        triggerDetail: "system",
        reason: "issue_commented",
        payload: {
          issueId,
          commentId: created.id,
          mutation: "comment",
        },
        requestedByActorType: actorInfo.actorType,
        requestedByActorId: actorInfo.actorId,
        contextSnapshot: {
          issueId,
          taskId: issueId,
          commentId: created.id,
          wakeCommentId: created.id,
          source: "issue.comment",
          wakeReason: "issue_commented",
        },
      }).catch(() => undefined);
    }

    return c.json(created, 201);
  });

  // GET /issues/:id/attachments
  app.get("/issues/:id/attachments", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);
    const rows = await db
      .select()
      .from(issueAttachments)
      .where(eq(issueAttachments.issueId, issueId))
      .orderBy(desc(issueAttachments.createdAt));
    return c.json(rows);
  });

  // GET /issues/:id/work-products
  app.get("/issues/:id/work-products", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);
    const rows = await db
      .select()
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.issueId, id))
      .orderBy(desc(issueWorkProducts.createdAt));
    return c.json(rows);
  });

  // POST /issues/:id/work-products
  app.post("/issues/:id/work-products", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);

    const body = await c.req.json();
    if (!body.type || !body.provider) throw badRequest("type and provider are required");

    const actor = c.get("actor");
    await db.insert(issueWorkProducts).values({
      companyId: issue.companyId,
      issueId: id,
      projectId: body.projectId ?? issue.projectId ?? null,
      type: body.type,
      provider: body.provider,
      status: body.status ?? "active",
      title: body.title ?? "",
      url: body.url ?? null,
      metadata: body.metadata ?? null,
      createdByRunId: actor.type === "agent" ? actor.runId ?? null : null,
    });

    const created = await db
      .select()
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.issueId, id))
      .orderBy(desc(issueWorkProducts.createdAt))
      .limit(1)
      .then((r: any[]) => r[0]);

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "work_product.created",
      entityType: "issue",
      entityId: id,
      details: { type: body.type, provider: body.provider },
    });

    return c.json(created, 201);
  });

  // PATCH /work-products/:id
  app.patch("/work-products/:id", async (c) => {
    const db = c.get("db");
    const wpId = c.req.param("id")!;
    const wp = await db.select().from(issueWorkProducts).where(eq(issueWorkProducts.id, wpId)).then((r: any[]) => r[0] ?? null);
    if (!wp) throw notFound("Work product not found");
    assertCompanyAccess(c, wp.companyId);

    const body = await c.req.json();
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updatedAt: now };
    const wpFields = ["title", "url", "status", "reviewState", "isPrimary", "healthStatus", "summary", "metadata", "externalId"];
    for (const key of wpFields) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    await db.update(issueWorkProducts).set(patch as any).where(eq(issueWorkProducts.id, wpId));
    const updated = await db.select().from(issueWorkProducts).where(eq(issueWorkProducts.id, wpId)).then((r: any[]) => r[0]);

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: wp.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "work_product.updated",
      entityType: "work_product",
      entityId: wpId,
      details: { changedKeys: Object.keys(patch).filter((k) => k !== "updatedAt") },
    });
    return c.json(updated);
  });

  // DELETE /work-products/:id
  app.delete("/work-products/:id", async (c) => {
    const db = c.get("db");
    const wpId = c.req.param("id")!;
    const wp = await db.select().from(issueWorkProducts).where(eq(issueWorkProducts.id, wpId)).then((r: any[]) => r[0] ?? null);
    if (!wp) throw notFound("Work product not found");
    assertCompanyAccess(c, wp.companyId);
    await db.delete(issueWorkProducts).where(eq(issueWorkProducts.id, wpId));
    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: wp.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "work_product.deleted",
      entityType: "work_product",
      entityId: wpId,
      details: {},
    });
    return c.json({ success: true });
  });

  // POST /issues/:id/read
  app.post("/issues/:id/read", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    assertBoard(c);
    const actor = c.get("actor");
    if (actor.type !== "board") throw forbidden("Only board users can mark as read");

    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const now = new Date().toISOString();
    const existing = await db
      .select()
      .from(issueReadStates)
      .where(and(eq(issueReadStates.issueId, issueId), eq(issueReadStates.userId, actor.userId)))
      .then((r: any[]) => r[0] ?? null);

    if (existing) {
      await db
        .update(issueReadStates)
        .set({ lastReadAt: now, updatedAt: now } as any)
        .where(eq(issueReadStates.id, existing.id));
    } else {
      await db.insert(issueReadStates).values({
        companyId: issue.companyId,
        issueId: issueId,
        userId: actor.userId,
        lastReadAt: now,
      });
    }
    return c.json({ success: true });
  });

  // GET /issues/:id/documents
  app.get("/issues/:id/documents", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);
    const docLinks = await db
      .select()
      .from(issueDocuments)
      .where(eq(issueDocuments.issueId, id));
    if (docLinks.length === 0) return c.json([]);
    const docIds = docLinks.map((d) => d.documentId);
    const docs = await db.select().from(documents).where(inArray(documents.id, docIds));
    return c.json(
      docLinks.map((link) => ({
        ...link,
        document: docs.find((d) => d.id === link.documentId) ?? null,
      }))
    );
  });

  // GET /issues/:id/documents/:key
  app.get("/issues/:id/documents/:key", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const key = c.req.param("key")!;
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);
    const link = await db
      .select()
      .from(issueDocuments)
      .where(and(eq(issueDocuments.issueId, id), eq(issueDocuments.key, key)))
      .then((r: any[]) => r[0] ?? null);
    if (!link) throw notFound("Document not found");
    const doc = await db.select().from(documents).where(eq(documents.id, link.documentId)).then((r: any[]) => r[0] ?? null);
    return c.json({ ...link, document: doc });
  });

  // PUT /issues/:id/documents/:key
  app.put("/issues/:id/documents/:key", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const key = c.req.param("key")!;
    assertBoard(c);
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);

    const body = await c.req.json();
    if (!body.format || !body.body) throw badRequest("format and body are required");

    const actor = c.get("actor");
    const actorInfo = getActorInfo(c);
    const now = new Date().toISOString();

    const existingLink = await db
      .select()
      .from(issueDocuments)
      .where(and(eq(issueDocuments.issueId, id), eq(issueDocuments.key, key)))
      .then((r: any[]) => r[0] ?? null);

    if (existingLink) {
      const doc = await db.select().from(documents).where(eq(documents.id, existingLink.documentId)).then((r: any[]) => r[0]);
      if (!doc) throw notFound("Document record not found");
      const nextRevision = (doc.latestRevisionNumber ?? 1) + 1;
      await db.insert(documentRevisions).values({
        companyId: issue.companyId,
        documentId: doc.id,
        revisionNumber: nextRevision,
        body: body.body,
        changeSummary: body.changeSummary ?? null,
        createdByAgentId: actor.type === "agent" ? actor.agentId : null,
        createdByUserId: actor.type === "board" ? actor.userId : null,
      });
      const newRevision = await db
        .select()
        .from(documentRevisions)
        .where(and(eq(documentRevisions.documentId, doc.id), eq(documentRevisions.revisionNumber, nextRevision)))
        .then((r: any[]) => r[0]);
      await db
        .update(documents)
        .set({
          title: body.title ?? doc.title,
          format: body.format,
          latestBody: body.body,
          latestRevisionId: newRevision?.id ?? null,
          latestRevisionNumber: nextRevision,
          updatedByAgentId: actor.type === "agent" ? actor.agentId : null,
          updatedByUserId: actor.type === "board" ? actor.userId : null,
          updatedAt: now,
        } as any)
        .where(eq(documents.id, doc.id));
      const updatedDoc = await db.select().from(documents).where(eq(documents.id, doc.id)).then((r: any[]) => r[0]);
      return c.json({ ...existingLink, document: updatedDoc });
    } else {
      await db.insert(documents).values({
        companyId: issue.companyId,
        title: body.title ?? key,
        format: body.format,
        latestBody: body.body,
        latestRevisionNumber: 1,
        createdByAgentId: actor.type === "agent" ? actor.agentId : null,
        createdByUserId: actor.type === "board" ? actor.userId : null,
      });
      const newDoc = await db
        .select()
        .from(documents)
        .where(and(eq(documents.companyId, issue.companyId), eq(documents.title, body.title ?? key)))
        .orderBy(desc(documents.createdAt))
        .limit(1)
        .then((r: any[]) => r[0]);
      if (newDoc) {
        await db.insert(documentRevisions).values({
          companyId: issue.companyId,
          documentId: newDoc.id,
          revisionNumber: 1,
          body: body.body,
          changeSummary: body.changeSummary ?? "Initial version",
          createdByAgentId: actor.type === "agent" ? actor.agentId : null,
          createdByUserId: actor.type === "board" ? actor.userId : null,
        });
        await db.insert(issueDocuments).values({
          companyId: issue.companyId,
          issueId: id,
          documentId: newDoc.id,
          key,
        });
      }
      const link = await db
        .select()
        .from(issueDocuments)
        .where(and(eq(issueDocuments.issueId, id), eq(issueDocuments.key, key)))
        .then((r: any[]) => r[0]);
      await logActivity(db, {
        companyId: issue.companyId,
        actorType: actorInfo.actorType,
        actorId: actorInfo.actorId,
        agentId: actorInfo.agentId,
        runId: actorInfo.runId,
        action: "document.created",
        entityType: "issue",
        entityId: id,
        details: { key },
      });
      return c.json({ ...link, document: newDoc }, 201);
    }
  });

  // GET /issues/:id/documents/:key/revisions
  app.get("/issues/:id/documents/:key/revisions", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const key = c.req.param("key")!;
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);
    const link = await db
      .select()
      .from(issueDocuments)
      .where(and(eq(issueDocuments.issueId, id), eq(issueDocuments.key, key)))
      .then((r: any[]) => r[0] ?? null);
    if (!link) throw notFound("Document not found");
    const revisions = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, link.documentId))
      .orderBy(desc(documentRevisions.revisionNumber));
    return c.json(revisions);
  });

  // DELETE /issues/:id/documents/:key
  app.delete("/issues/:id/documents/:key", async (c) => {
    const db = c.get("db");
    const id = c.req.param("id")!;
    const key = c.req.param("key")!;
    assertBoard(c);
    const issue = await db.select().from(issues).where(eq(issues.id, id)).then((r: any[]) => r[0] ?? null);
    if (!issue) throw notFound("Issue not found");
    assertCompanyAccess(c, issue.companyId);
    const link = await db
      .select()
      .from(issueDocuments)
      .where(and(eq(issueDocuments.issueId, id), eq(issueDocuments.key, key)))
      .then((r: any[]) => r[0] ?? null);
    if (!link) throw notFound("Document not found");
    await db.delete(issueDocuments).where(eq(issueDocuments.id, link.id));
    await db.delete(documents).where(eq(documents.id, link.documentId));
    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "document.deleted",
      entityType: "issue",
      entityId: id,
      details: { key },
    });
    return c.json({ success: true });
  });

  // GET /issues/:id/approvals
  app.get("/issues/:id/approvals", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);
    const links = await db.select().from(issueApprovals).where(eq(issueApprovals.issueId, issueId));
    if (links.length === 0) return c.json([]);
    const approvalIds = links.map((l) => l.approvalId);
    const approvalRows = await db.select().from(approvals).where(inArray(approvals.id, approvalIds));
    return c.json(
      links.map((l) => ({
        ...l,
        approval: approvalRows.find((a) => a.id === l.approvalId) ?? null,
      }))
    );
  });

  // POST /issues/:id/approvals
  app.post("/issues/:id/approvals", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);

    const body = await c.req.json();
    if (!body.approvalId) throw badRequest("approvalId is required");

    const actor = c.get("actor");
    await db.insert(issueApprovals).values({
      companyId: issue.companyId,
      issueId: issueId,
      approvalId: body.approvalId,
      linkedByAgentId: actor.type === "agent" ? actor.agentId : null,
      linkedByUserId: actor.type === "board" ? actor.userId : null,
    });

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.approval_linked",
      entityType: "issue",
      entityId: issueId,
      details: { approvalId: body.approvalId },
    });
    return c.json({ success: true }, 201);
  });

  // DELETE /issues/:id/approvals/:approvalId
  app.delete("/issues/:id/approvals/:approvalId", async (c) => {
    const db = c.get("db");
    const rawId = c.req.param("id")!;
    const approvalId = c.req.param("approvalId")!;
    const issue = await resolveIssueByRef(db, rawId);
    if (!issue) throw notFound("Issue not found");
    const issueId = issue.id;
    assertCompanyAccess(c, issue.companyId);
    await db
      .delete(issueApprovals)
      .where(and(eq(issueApprovals.issueId, issueId), eq(issueApprovals.approvalId, approvalId)));
    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: issue.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "issue.approval_unlinked",
      entityType: "issue",
      entityId: issueId,
      details: { approvalId },
    });
    return c.json({ success: true });
  });

  // POST /companies/:companyId/issues/:issueId/attachments — STUBBED (multipart upload needs R2)
  app.post("/companies/:companyId/issues/:issueId/attachments", async (c) => {
    return c.json({ error: "File upload not yet implemented in Workers runtime" }, 501);
  });

  return app;
}
