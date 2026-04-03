import { Hono } from "hono";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { agents, companies, costEvents, issues } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess } from "../lib/authz.js";

export function dashboardRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/dashboard", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const [agentCount] = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.companyId, companyId));

    const [issueCount] = await db
      .select({ count: count() })
      .from(issues)
      .where(eq(issues.companyId, companyId));

    const [company] = await db
      .select({
        budgetMonthlyCents: companies.budgetMonthlyCents,
        spentMonthlyCents: companies.spentMonthlyCents,
      })
      .from(companies)
      .where(eq(companies.id, companyId));

    return c.json({
      agents: Number(agentCount?.count ?? 0),
      issues: Number(issueCount?.count ?? 0),
      budgetMonthlyCents: company?.budgetMonthlyCents ?? 0,
      spentMonthlyCents: company?.spentMonthlyCents ?? 0,
    });
  });

  return app;
}
