import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { objectives } from "@ciutatis/db-cloudflare";
import { createObjectiveSchema, updateObjectiveSchema } from "@ciutatis/shared";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess } from "../lib/authz.js";
import { notFound } from "../lib/errors.js";

export function objectiveRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/goals", async (c) => {
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

  app.get("/goals/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const [goal] = await db.select().from(objectives).where(eq(objectives.id, id));
    if (!goal) throw notFound("Goal not found");
    assertCompanyAccess(c, goal.companyId);
    return c.json(goal);
  });

  app.post("/companies/:companyId/goals", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = createObjectiveSchema.parse(await c.req.json());

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(objectives).values({
      id,
      companyId,
      title: body.title,
      description: body.description ?? null,
      level: body.level ?? "task",
      status: body.status ?? "planned",
      parentId: body.parentId ?? null,
      ownerAgentId: body.ownerAgentId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(objectives).where(eq(objectives.id, id));
    return c.json(created, 201);
  });

  app.patch("/goals/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");
    const body = updateObjectiveSchema.parse(await c.req.json());

    const [existing] = await db.select().from(objectives).where(eq(objectives.id, id));
    if (!existing) throw notFound("Goal not found");
    assertCompanyAccess(c, existing.companyId);

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.level !== undefined) updates.level = body.level;
    if (body.status !== undefined) updates.status = body.status;
    if (body.parentId !== undefined) updates.parentId = body.parentId;
    if (body.ownerAgentId !== undefined) updates.ownerAgentId = body.ownerAgentId;

    await db.update(objectives).set(updates).where(eq(objectives.id, id));

    const [updated] = await db.select().from(objectives).where(eq(objectives.id, id));

    if (!updated) throw notFound("Goal not found");
    return c.json(updated);
  });

  app.delete("/goals/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const [existing] = await db.select().from(objectives).where(eq(objectives.id, id));
    if (!existing) throw notFound("Goal not found");
    assertCompanyAccess(c, existing.companyId);

    await db.delete(objectives).where(eq(objectives.id, id));

    return c.json({ success: true });
  });

  return app;
}
