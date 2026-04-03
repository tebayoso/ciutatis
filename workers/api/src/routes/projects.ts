import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { projects, projectWorkspaces } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { notFound } from "../lib/errors.js";

export function projectRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/projects", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId))
      .orderBy(desc(projects.createdAt));

    return c.json(rows);
  });

  app.post("/companies/:companyId/projects", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(projects).values({
      id,
      companyId,
      name: body.name,
      description: body.description ?? null,
      status: body.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(projects).where(eq(projects.id, id));
    return c.json(created, 201);
  });

  app.get("/companies/:companyId/projects/:projectId", async (c) => {
    const companyId = c.req.param("companyId");
    const projectId = c.req.param("projectId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)));

    if (!project) throw notFound("Project not found");
    return c.json(project);
  });

  app.patch("/companies/:companyId/projects/:projectId", async (c) => {
    const companyId = c.req.param("companyId");
    const projectId = c.req.param("projectId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;

    await db
      .update(projects)
      .set(updates)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)));

    const [updated] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)));

    if (!updated) throw notFound("Project not found");
    return c.json(updated);
  });

  app.delete("/companies/:companyId/projects/:projectId", async (c) => {
    const companyId = c.req.param("companyId");
    const projectId = c.req.param("projectId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)));

    return c.json({ success: true });
  });

  return app;
}
