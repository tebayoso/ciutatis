import { Hono } from "hono";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import {
  agents,
  budgetIncidents,
  budgetPolicies,
  companies,
  costEvents,
  financeEvents,
} from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { badRequest, notFound } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";

function parseDateRange(c: { req: { query(k: string): string | undefined } }) {
  const fromRaw = c.req.query("from");
  const toRaw = c.req.query("to");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if (from && isNaN(from.getTime())) throw badRequest("invalid 'from' date");
  if (to && isNaN(to.getTime())) throw badRequest("invalid 'to' date");
  return from || to ? { from, to } : undefined;
}

function dateConditions(table: typeof costEvents, range?: { from?: Date; to?: Date }) {
  const conds = [];
  if (range?.from) conds.push(gte(table.occurredAt, range.from.toISOString()));
  if (range?.to) conds.push(lte(table.occurredAt, range.to.toISOString()));
  return conds;
}

function financeDateConditions(table: typeof financeEvents, range?: { from?: Date; to?: Date }) {
  const conds = [];
  if (range?.from) conds.push(gte(table.occurredAt, range.from.toISOString()));
  if (range?.to) conds.push(lte(table.occurredAt, range.to.toISOString()));
  return conds;
}

export function costCompanyRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/cost-events", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const actor = c.get("actor");
    const body = await c.req.json();

    if (actor.type === "agent" && actor.agentId !== body.agentId) {
      return c.json({ error: "Agent can only report its own costs" }, 403);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(costEvents).values({
      id,
      companyId,
      agentId: body.agentId,
      issueId: body.issueId ?? null,
      projectId: body.projectId ?? null,
      goalId: body.goalId ?? null,
      heartbeatRunId: body.heartbeatRunId ?? null,
      billingCode: body.billingCode ?? null,
      provider: body.provider,
      biller: body.biller ?? "unknown",
      billingType: body.billingType ?? "unknown",
      model: body.model,
      inputTokens: body.inputTokens ?? 0,
      cachedInputTokens: body.cachedInputTokens ?? 0,
      outputTokens: body.outputTokens ?? 0,
      costCents: body.costCents,
      occurredAt: body.occurredAt ?? now,
      createdAt: now,
    });

    const [event] = await db.select().from(costEvents).where(eq(costEvents.id, id));

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      action: "cost.reported",
      entityType: "cost_event",
      entityId: event.id,
      details: { costCents: event.costCents, model: event.model },
    });

    return c.json(event, 201);
  });

  app.post("/finance-events", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertBoard(c);
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(financeEvents).values({
      id,
      companyId,
      ...body,
      occurredAt: body.occurredAt ?? now,
      createdAt: now,
    });

    const [event] = await db.select().from(financeEvents).where(eq(financeEvents.id, id));
    return c.json(event, 201);
  });

  app.get("/costs/summary", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const [result] = await db
      .select({ total: sql<number>`coalesce(sum(${costEvents.costCents}), 0)` })
      .from(costEvents)
      .where(and(...conditions));

    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0] ?? null);

    const totalCents = Number(result?.total ?? 0);
    const budgetCents = company?.budgetMonthlyCents ?? 0;

    return c.json({
      totalCents,
      budgetCents,
      utilization: budgetCents > 0 ? Number(((totalCents / budgetCents) * 100).toFixed(2)) : 0,
    });
  });

  app.get("/costs/by-agent", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        agentId: costEvents.agentId,
        agentName: agents.name,
        totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        eventCount: sql<number>`count(*)`,
      })
      .from(costEvents)
      .leftJoin(agents, eq(costEvents.agentId, agents.id))
      .where(and(...conditions))
      .groupBy(costEvents.agentId, agents.name);

    return c.json(rows);
  });

  app.get("/costs/by-provider", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        provider: costEvents.provider,
        biller: costEvents.biller,
        billingType: costEvents.billingType,
        model: costEvents.model,
        totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        eventCount: sql<number>`count(*)`,
      })
      .from(costEvents)
      .where(and(...conditions))
      .groupBy(costEvents.provider, costEvents.biller, costEvents.billingType, costEvents.model);

    return c.json(rows);
  });

  app.get("/costs/by-biller", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        biller: costEvents.biller,
        totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        eventCount: sql<number>`count(*)`,
      })
      .from(costEvents)
      .where(and(...conditions))
      .groupBy(costEvents.biller);

    return c.json(rows);
  });

  app.get("/costs/by-agent-model", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        agentId: costEvents.agentId,
        agentName: agents.name,
        provider: costEvents.provider,
        biller: costEvents.biller,
        billingType: costEvents.billingType,
        model: costEvents.model,
        totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        eventCount: sql<number>`count(*)`,
      })
      .from(costEvents)
      .leftJoin(agents, eq(costEvents.agentId, agents.id))
      .where(and(...conditions))
      .groupBy(
        costEvents.agentId,
        agents.name,
        costEvents.provider,
        costEvents.biller,
        costEvents.billingType,
        costEvents.model,
      );

    return c.json(rows);
  });

  app.get("/costs/finance-summary", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(financeEvents.companyId, companyId), ...financeDateConditions(financeEvents, range)];

    const [result] = await db
      .select({
        debitCents: sql<number>`coalesce(sum(case when ${financeEvents.direction} = 'debit' then ${financeEvents.amountCents} else 0 end), 0)`,
        creditCents: sql<number>`coalesce(sum(case when ${financeEvents.direction} = 'credit' then ${financeEvents.amountCents} else 0 end), 0)`,
      })
      .from(financeEvents)
      .where(and(...conditions));

    return c.json({
      debitCents: Number(result?.debitCents ?? 0),
      creditCents: Number(result?.creditCents ?? 0),
      netCents: Number(result?.debitCents ?? 0) - Number(result?.creditCents ?? 0),
    });
  });

  app.get("/costs/finance-by-biller", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(financeEvents.companyId, companyId), ...financeDateConditions(financeEvents, range)];

    const rows = await db
      .select({
        biller: financeEvents.biller,
        debitCents: sql<number>`coalesce(sum(case when ${financeEvents.direction} = 'debit' then ${financeEvents.amountCents} else 0 end), 0)`,
        creditCents: sql<number>`coalesce(sum(case when ${financeEvents.direction} = 'credit' then ${financeEvents.amountCents} else 0 end), 0)`,
      })
      .from(financeEvents)
      .where(and(...conditions))
      .groupBy(financeEvents.biller);

    return c.json(rows);
  });

  app.get("/costs/finance-by-kind", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(financeEvents.companyId, companyId), ...financeDateConditions(financeEvents, range)];

    const rows = await db
      .select({
        eventKind: financeEvents.eventKind,
        debitCents: sql<number>`coalesce(sum(case when ${financeEvents.direction} = 'debit' then ${financeEvents.amountCents} else 0 end), 0)`,
        creditCents: sql<number>`coalesce(sum(case when ${financeEvents.direction} = 'credit' then ${financeEvents.amountCents} else 0 end), 0)`,
      })
      .from(financeEvents)
      .where(and(...conditions))
      .groupBy(financeEvents.eventKind);

    return c.json(rows);
  });

  app.get("/costs/finance-events", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 500) : 100;

    const conditions = [eq(financeEvents.companyId, companyId), ...financeDateConditions(financeEvents, range)];

    const rows = await db
      .select()
      .from(financeEvents)
      .where(and(...conditions))
      .orderBy(desc(financeEvents.occurredAt))
      .limit(limit);

    return c.json(rows);
  });

  app.get("/costs/window-spend", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const now = new Date();
    const windows = [
      { label: "5h", ms: 5 * 60 * 60 * 1000 },
      { label: "24h", ms: 24 * 60 * 60 * 1000 },
      { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
    ];

    const results = await Promise.all(
      windows.map(async (w) => {
        const from = new Date(now.getTime() - w.ms).toISOString();
        const [row] = await db
          .select({ total: sql<number>`coalesce(sum(${costEvents.costCents}), 0)` })
          .from(costEvents)
          .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, from)));
        return { window: w.label, totalCents: Number(row?.total ?? 0) };
      }),
    );

    return c.json(results);
  });

  app.get("/budgets/overview", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const policies = await db
      .select()
      .from(budgetPolicies)
      .where(eq(budgetPolicies.companyId, companyId));

    const incidents = await db
      .select()
      .from(budgetIncidents)
      .where(and(eq(budgetIncidents.companyId, companyId), eq(budgetIncidents.status, "open")));

    const pausedAgentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(and(eq(agents.companyId, companyId), eq(agents.status, "paused")))
      .then((rows) => Number(rows[0]?.count ?? 0));

    return c.json({
      policies,
      activeIncidents: incidents,
      pendingApprovalCount: 0,
      pausedAgentCount,
      pausedProjectCount: 0,
    });
  });

  app.patch("/budgets", async (c) => {
    assertBoard(c);
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    await db
      .update(companies)
      .set({ budgetMonthlyCents: body.budgetMonthlyCents, updatedAt: new Date().toISOString() })
      .where(eq(companies.id, companyId));

    const [updated] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!updated) throw notFound("Company not found");

    const actor = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: actor.actorId,
      action: "company.budget_updated",
      entityType: "company",
      entityId: companyId,
      details: { budgetMonthlyCents: body.budgetMonthlyCents },
    });

    return c.json(updated);
  });

  app.get("/costs/by-project", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        projectId: costEvents.projectId,
        totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        eventCount: sql<number>`count(*)`,
      })
      .from(costEvents)
      .where(and(...conditions))
      .groupBy(costEvents.projectId);

    return c.json(rows);
  });

  return app;
}

export function agentBudgetRoutes() {
  const app = new Hono<AppEnv>();

  app.patch("/:agentId/budgets", async (c) => {
    const agentId = c.req.param("agentId")!;
    const db = c.get("db");
    const actor = c.get("actor");
    const body = await c.req.json();

    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);
    if (!agent) throw notFound("Agent not found");
    assertCompanyAccess(c, agent.companyId);

    if (actor.type === "agent" && actor.agentId !== agentId) {
      return c.json({ error: "Agent can only change its own budget" }, 403);
    }

    await db
      .update(agents)
      .set({ budgetMonthlyCents: body.budgetMonthlyCents, updatedAt: new Date().toISOString() })
      .where(eq(agents.id, agentId));

    const [updated] = await db.select().from(agents).where(eq(agents.id, agentId));

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: updated.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      action: "agent.budget_updated",
      entityType: "agent",
      entityId: updated.id,
      details: { budgetMonthlyCents: updated.budgetMonthlyCents },
    });

    return c.json(updated);
  });

  return app;
}
