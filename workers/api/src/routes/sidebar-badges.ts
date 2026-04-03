import { Hono } from "hono";
import { eq, and, count } from "drizzle-orm";
import { agents, approvals, heartbeatRuns } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertCompanyAccess } from "../lib/authz.js";

export function sidebarBadgeRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/companies/:companyId/sidebar-badges", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const [failedRunCount] = await db
      .select({ count: count() })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.companyId, companyId),
          eq(heartbeatRuns.status, "failed"),
        ),
      );

    const [pendingApprovalCount] = await db
      .select({ count: count() })
      .from(approvals)
      .where(
        and(
          eq(approvals.companyId, companyId),
          eq(approvals.status, "pending"),
        ),
      );

    return c.json({
      failedRuns: Number(failedRunCount?.count ?? 0),
      pendingApprovals: Number(pendingApprovalCount?.count ?? 0),
      joinRequests: 0,
    });
  });

  return app;
}
