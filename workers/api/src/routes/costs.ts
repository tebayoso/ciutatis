import { Hono } from "hono";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  agents,
  budgetIncidents,
  companies,
  costEvents,
  financeEvents,
  projects,
} from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { badRequest, notFound } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";

const METERED_BILLING_TYPE = "metered_api";
const SUBSCRIPTION_BILLING_TYPES = ["subscription_included", "subscription_overage"] as const;

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

  app.post("/companies/:companyId/cost-events", async (c) => {
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
      biller: body.biller ?? body.provider ?? "unknown",
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

  app.post("/companies/:companyId/finance-events", async (c) => {
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

  app.get("/companies/:companyId/costs/summary", async (c) => {
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

    const spendCents = Number(result?.total ?? 0);
    const budgetCents = company?.budgetMonthlyCents ?? 0;

    return c.json({
      companyId,
      spendCents,
      budgetCents,
      utilizationPercent: budgetCents > 0 ? Number(((spendCents / budgetCents) * 100).toFixed(2)) : 0,
    });
  });

  app.get("/companies/:companyId/costs/by-agent", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        agentId: costEvents.agentId,
        agentName: agents.name,
        agentStatus: agents.status,
        costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
        cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
        apiRunCount:
          sql<number>`count(distinct case when ${costEvents.billingType} = ${METERED_BILLING_TYPE} then ${costEvents.heartbeatRunId} end)`,
        subscriptionRunCount:
          sql<number>`count(distinct case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.heartbeatRunId} end)`,
        subscriptionCachedInputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.cachedInputTokens} else 0 end), 0)`,
        subscriptionInputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.inputTokens} else 0 end), 0)`,
        subscriptionOutputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.outputTokens} else 0 end), 0)`,
      })
      .from(costEvents)
      .leftJoin(agents, eq(costEvents.agentId, agents.id))
      .where(and(...conditions))
      .groupBy(costEvents.agentId, agents.name, agents.status)
      .orderBy(desc(sql`coalesce(sum(${costEvents.costCents}), 0)`));

    return c.json(rows);
  });

  app.get("/companies/:companyId/costs/by-provider", async (c) => {
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
        costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
        cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
        apiRunCount:
          sql<number>`count(distinct case when ${costEvents.billingType} = ${METERED_BILLING_TYPE} then ${costEvents.heartbeatRunId} end)`,
        subscriptionRunCount:
          sql<number>`count(distinct case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.heartbeatRunId} end)`,
        subscriptionCachedInputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.cachedInputTokens} else 0 end), 0)`,
        subscriptionInputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.inputTokens} else 0 end), 0)`,
        subscriptionOutputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.outputTokens} else 0 end), 0)`,
      })
      .from(costEvents)
      .where(and(...conditions))
      .groupBy(costEvents.provider, costEvents.biller, costEvents.billingType, costEvents.model)
      .orderBy(desc(sql`coalesce(sum(${costEvents.costCents}), 0)`));

    return c.json(rows);
  });

  app.get("/companies/:companyId/costs/by-biller", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        biller: costEvents.biller,
        costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
        cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
        apiRunCount:
          sql<number>`count(distinct case when ${costEvents.billingType} = ${METERED_BILLING_TYPE} then ${costEvents.heartbeatRunId} end)`,
        subscriptionRunCount:
          sql<number>`count(distinct case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.heartbeatRunId} end)`,
        subscriptionCachedInputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.cachedInputTokens} else 0 end), 0)`,
        subscriptionInputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.inputTokens} else 0 end), 0)`,
        subscriptionOutputTokens:
          sql<number>`coalesce(sum(case when ${costEvents.billingType} in (${sql.join(SUBSCRIPTION_BILLING_TYPES.map((value) => sql`${value}`), sql`, `)}) then ${costEvents.outputTokens} else 0 end), 0)`,
        providerCount: sql<number>`count(distinct ${costEvents.provider})`,
        modelCount: sql<number>`count(distinct ${costEvents.model})`,
      })
      .from(costEvents)
      .where(and(...conditions))
      .groupBy(costEvents.biller)
      .orderBy(desc(sql`coalesce(sum(${costEvents.costCents}), 0)`));

    return c.json(rows);
  });

  app.get("/companies/:companyId/costs/by-agent-model", async (c) => {
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
        costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
        cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
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
      )
      .orderBy(costEvents.provider, costEvents.biller, costEvents.billingType, costEvents.model);

    return c.json(rows);
  });

  app.get("/companies/:companyId/costs/finance-summary", async (c) => {
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

  app.get("/companies/:companyId/costs/finance-by-biller", async (c) => {
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

  app.get("/companies/:companyId/costs/finance-by-kind", async (c) => {
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

  app.get("/companies/:companyId/costs/finance-events", async (c) => {
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

  app.get("/companies/:companyId/costs/window-spend", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const windows = [
      { label: "5h", hours: 5 },
      { label: "24h", hours: 24 },
      { label: "7d", hours: 168 },
    ] as const;

    const results = await Promise.all(
      windows.map(async ({ label, hours }) => {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        const rows = await db
          .select({
            provider: costEvents.provider,
            biller: sql<string>`case when count(distinct ${costEvents.biller}) = 1 then min(${costEvents.biller}) else 'mixed' end`,
            costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
            inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
            cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)`,
            outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
          })
          .from(costEvents)
          .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, since)))
          .groupBy(costEvents.provider)
          .orderBy(desc(sql`coalesce(sum(${costEvents.costCents}), 0)`));

        return rows.map((row) => ({
          provider: row.provider,
          biller: row.biller,
          window: label,
          windowHours: hours,
          costCents: row.costCents,
          inputTokens: row.inputTokens,
          cachedInputTokens: row.cachedInputTokens,
          outputTokens: row.outputTokens,
        }));
      }),
    );

    return c.json(results.flat());
  });

  app.get("/companies/:companyId/costs/quota-windows", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertBoard(c);
    assertCompanyAccess(c, companyId);
    return c.json([]);
  });

  app.get("/companies/:companyId/budgets/overview", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const pausedAgentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(and(eq(agents.companyId, companyId), eq(agents.status, "paused")))
      .then((rows) => Number(rows[0]?.count ?? 0));

    const openIncidentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(budgetIncidents)
      .where(and(eq(budgetIncidents.companyId, companyId), eq(budgetIncidents.status, "open")))
      .then((rows) => Number(rows[0]?.count ?? 0));

    return c.json({
      companyId,
      policies: [],
      activeIncidents: [],
      pendingApprovalCount: 0,
      pausedAgentCount,
      pausedProjectCount: 0,
      openIncidentCount,
    });
  });

  app.patch("/companies/:companyId/budgets", async (c) => {
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

  app.get("/companies/:companyId/costs/by-project", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const range = parseDateRange(c);

    const conditions = [eq(costEvents.companyId, companyId), ...dateConditions(costEvents, range)];

    const rows = await db
      .select({
        projectId: costEvents.projectId,
        projectName: projects.name,
        costCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
        cachedInputTokens: sql<number>`coalesce(sum(${costEvents.cachedInputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
      })
      .from(costEvents)
      .leftJoin(projects, eq(costEvents.projectId, projects.id))
      .where(and(...conditions))
      .groupBy(costEvents.projectId, projects.name)
      .orderBy(desc(sql`coalesce(sum(${costEvents.costCents}), 0)`));

    return c.json(rows);
  });

  return app;
}

export function agentBudgetRoutes() {
  const app = new Hono<AppEnv>();

  app.patch("/agents/:agentId/budgets", async (c) => {
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
