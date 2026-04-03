import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { objectives } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess } from "../lib/authz.js";
import { notFound } from "../lib/errors.js";

export function objectiveRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/objectives", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const rows = await db
      .select()
      .from(objectives)
      .where(eq(objectives.companyId, companyId))
      .orderBy(desc(objectives.createdAt));

    return c.json(rows);
  });

  app.post("/companies/:companyId/objectives", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(objectives).values({
      id,
      companyId,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(objectives).where(eq(objectives.id, id));
    return c.json(created, 201);
  });

  app.patch("/companies/:companyId/objectives/:objectiveId", async (c) => {
    const companyId = c.req.param("companyId");
    const objectiveId = c.req.param("objectiveId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;

    await db
      .update(objectives)
      .set(updates)
      .where(and(eq(objectives.id, objectiveId), eq(objectives.companyId, companyId)));

    const [updated] = await db
      .select()
      .from(objectives)
      .where(and(eq(objectives.id, objectiveId), eq(objectives.companyId, companyId)));

    if (!updated) throw notFound("Objective not found");
    return c.json(updated);
  });

  app.delete("/companies/:companyId/objectives/:objectiveId", async (c) => {
    const companyId = c.req.param("companyId");
    const objectiveId = c.req.param("objectiveId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    await db
      .delete(objectives)
      .where(and(eq(objectives.id, objectiveId), eq(objectives.companyId, companyId)));

    return c.json({ success: true });
  });

  return app;
}
