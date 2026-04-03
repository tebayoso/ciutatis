import { Hono } from "hono";
import { eq, sql, and, count } from "drizzle-orm";
import { companies, companyLogos, assets } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { forbidden, notFound, unprocessable } from "../lib/errors.js";

export function institutionRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/", async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");

    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        status: companies.status,
        issuePrefix: companies.issuePrefix,
        issueCounter: companies.issueCounter,
        budgetMonthlyCents: companies.budgetMonthlyCents,
        spentMonthlyCents: companies.spentMonthlyCents,
        requireBoardApprovalForNewAgents: companies.requireBoardApprovalForNewAgents,
        brandColor: companies.brandColor,
        logoAssetId: companyLogos.assetId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .leftJoin(companyLogos, eq(companyLogos.companyId, companies.id));

    const enriched = rows.map((r) => ({
      ...r,
      logoUrl: r.logoAssetId ? `/api/assets/${r.logoAssetId}/content` : null,
    }));

    if (actor.type === "agent") {
      return c.json(enriched.filter((r) => r.id === actor.companyId));
    }
    if (actor.type === "board" && actor.source !== "local_implicit" && !actor.isInstanceAdmin) {
      const allowed = new Set(actor.companyIds ?? []);
      return c.json(enriched.filter((r) => allowed.has(r.id)));
    }
    return c.json(enriched);
  });

  app.post("/", async (c) => {
    assertBoard(c);
    const actor = c.get("actor");
    if (actor.type !== "board" || !(actor.source === "local_implicit" || actor.isInstanceAdmin)) {
      throw forbidden("Only instance admins can create companies");
    }
    const db = c.get("db");
    const body = await c.req.json();
    const { name, description, issuePrefix, brandColor } = body;

    if (!name || typeof name !== "string") {
      throw unprocessable("Name is required");
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(companies).values({
      id,
      name,
      description: description ?? null,
      issuePrefix: issuePrefix ?? "CMP",
      brandColor: brandColor ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));

    return c.json(created, 201);
  });

  app.get("/:companyId", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        status: companies.status,
        issuePrefix: companies.issuePrefix,
        issueCounter: companies.issueCounter,
        budgetMonthlyCents: companies.budgetMonthlyCents,
        spentMonthlyCents: companies.spentMonthlyCents,
        requireBoardApprovalForNewAgents: companies.requireBoardApprovalForNewAgents,
        brandColor: companies.brandColor,
        logoAssetId: companyLogos.assetId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .leftJoin(companyLogos, eq(companyLogos.companyId, companies.id))
      .where(eq(companies.id, companyId));

    if (!rows[0]) throw notFound("Institution not found");

    return c.json({
      ...rows[0],
      logoUrl: rows[0].logoAssetId ? `/api/assets/${rows[0].logoAssetId}/content` : null,
    });
  });

  app.patch("/:companyId", async (c) => {
    const companyId = c.req.param("companyId");
    assertBoard(c);
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.issuePrefix !== undefined) updates.issuePrefix = body.issuePrefix;
    if (body.brandColor !== undefined) updates.brandColor = body.brandColor;
    if (body.budgetMonthlyCents !== undefined) updates.budgetMonthlyCents = body.budgetMonthlyCents;
    if (body.requireBoardApprovalForNewAgents !== undefined) {
      updates.requireBoardApprovalForNewAgents = body.requireBoardApprovalForNewAgents;
    }

    await db.update(companies).set(updates).where(eq(companies.id, companyId));

    const [updated] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!updated) throw notFound("Institution not found");
    return c.json(updated);
  });

  app.delete("/:companyId", async (c) => {
    const companyId = c.req.param("companyId");
    assertBoard(c);
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    await db.delete(companies).where(eq(companies.id, companyId));
    return c.json({ success: true });
  });

  return app;
}
