import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { executionWorkspaces, issues } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { notFound, conflict } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";

const TERMINAL_ISSUE_STATUSES = new Set(["done", "cancelled"]);

export function executionWorkspaceRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/execution-workspaces", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const projectId = c.req.query("projectId");
    const projectWorkspaceId = c.req.query("projectWorkspaceId");
    const sourceIssueId = c.req.query("issueId");
    const status = c.req.query("status");

    let rows = await db
      .select()
      .from(executionWorkspaces)
      .where(eq(executionWorkspaces.companyId, companyId));

    if (projectId) rows = rows.filter((r) => r.projectId === projectId);
    if (projectWorkspaceId)
      rows = rows.filter((r) => r.projectWorkspaceId === projectWorkspaceId);
    if (sourceIssueId) rows = rows.filter((r) => r.sourceIssueId === sourceIssueId);
    if (status) rows = rows.filter((r) => r.status === status);

    return c.json(rows);
  });

  app.get("/execution-workspaces/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const [workspace] = await db
      .select()
      .from(executionWorkspaces)
      .where(eq(executionWorkspaces.id, id));

    if (!workspace) throw notFound("Execution workspace not found");
    assertCompanyAccess(c, workspace.companyId);
    return c.json(workspace);
  });

  app.patch("/execution-workspaces/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const [existing] = await db
      .select()
      .from(executionWorkspaces)
      .where(eq(executionWorkspaces.id, id));

    if (!existing) throw notFound("Execution workspace not found");
    assertCompanyAccess(c, existing.companyId);

    const body = await c.req.json();
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      ...body,
      updatedAt: now,
    };

    if (body.status === "archived" && existing.status !== "archived") {
      const linkedIssues = await db
        .select({ id: issues.id, status: issues.status })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, existing.companyId),
            eq(issues.executionWorkspaceId, existing.id),
          ),
        );
      const activeLinked = linkedIssues.filter(
        (i) => !TERMINAL_ISSUE_STATUSES.has(i.status),
      );

      if (activeLinked.length > 0) {
        throw conflict(
          `Cannot archive execution workspace while ${activeLinked.length} linked issue(s) are still open`,
        );
      }

      patch.status = "archived";
      patch.closedAt = now;
      patch.cleanupReason = null;
    }

    await db
      .update(executionWorkspaces)
      .set(patch)
      .where(eq(executionWorkspaces.id, id));

    const [updated] = await db
      .select()
      .from(executionWorkspaces)
      .where(eq(executionWorkspaces.id, id));

    if (!updated) throw notFound("Execution workspace not found");

    const actor = getActorInfo(c);
    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "execution_workspace.updated",
      entityType: "execution_workspace",
      entityId: updated.id,
      details: { changedKeys: Object.keys(body).sort() },
    });

    return c.json(updated);
  });

  return app;
}
