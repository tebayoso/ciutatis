import { Hono } from "hono";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  agents,
  approvals,
  budgetIncidents,
  companies,
  costEvents,
  issues,
  projects,
} from "@ciutatis/db-cloudflare";
import type { DashboardSummary } from "@paperclipai/shared";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess } from "../lib/authz.js";
import { notFound } from "../lib/errors.js";

export function dashboardRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/dashboard", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const [company] = await db
      .select({
        budgetMonthlyCents: companies.budgetMonthlyCents,
      })
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) throw notFound("Company not found");

    const [
      agentRows,
      taskRows,
      pendingApprovals,
      activeIncidents,
      pausedAgents,
      pausedProjects,
    ] = await Promise.all([
      db
        .select({ status: agents.status, count: sql<number>`count(*)` })
        .from(agents)
        .where(eq(agents.companyId, companyId))
        .groupBy(agents.status),
      db
        .select({ status: issues.status, count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.companyId, companyId))
        .groupBy(issues.status),
      db
        .select({ count: sql<number>`count(*)` })
        .from(approvals)
        .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(budgetIncidents)
        .where(and(eq(budgetIncidents.companyId, companyId), eq(budgetIncidents.status, "open")))
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(agents)
        .where(and(eq(agents.companyId, companyId), eq(agents.status, "paused")))
        .then((rows) => Number(rows[0]?.count ?? 0)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(and(eq(projects.companyId, companyId), eq(projects.status, "paused")))
        .then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    const agentCounts: DashboardSummary["agents"] = {
      active: 0,
      running: 0,
      paused: 0,
      error: 0,
    };
    for (const row of agentRows) {
      const count = Number(row.count ?? 0);
      const bucket = row.status === "idle" ? "active" : row.status;
      if (bucket === "active" || bucket === "running" || bucket === "paused" || bucket === "error") {
        agentCounts[bucket] += count;
      }
    }

    const taskCounts: DashboardSummary["tasks"] = {
      open: 0,
      inProgress: 0,
      blocked: 0,
      done: 0,
    };
    for (const row of taskRows) {
      const count = Number(row.count ?? 0);
      if (row.status === "in_progress") taskCounts.inProgress += count;
      if (row.status === "blocked") taskCounts.blocked += count;
      if (row.status === "done") taskCounts.done += count;
      if (row.status !== "done" && row.status !== "cancelled") taskCounts.open += count;
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const [monthSpendRow] = await db
      .select({
        total: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
      })
      .from(costEvents)
      .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, monthStart)));

    const monthSpendCents = Number(monthSpendRow?.total ?? 0);
    const monthBudgetCents = Number(company.budgetMonthlyCents ?? 0);
    const monthUtilizationPercent =
      monthBudgetCents > 0 ? Number(((monthSpendCents / monthBudgetCents) * 100).toFixed(2)) : 0;

    return c.json({
      companyId,
      agents: agentCounts,
      tasks: taskCounts,
      costs: {
        monthSpendCents,
        monthBudgetCents,
        monthUtilizationPercent,
      },
      pendingApprovals,
      budgets: {
        activeIncidents,
        pendingApprovals,
        pausedAgents,
        pausedProjects,
      },
    } satisfies DashboardSummary);
  });

  return app;
}
