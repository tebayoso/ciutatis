import { Hono } from "hono";
import { count, eq, and, gt, isNull, sql } from "drizzle-orm";
import { instanceUserRoles, invites } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import type { DeploymentMode, DeploymentExposure } from "@ciutatis/shared";

const VERSION = "0.1.0-workers";

export function healthRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/", async (c) => {
    const db = c.get("db");
    const deploymentMode = (c.env.DEPLOYMENT_MODE ?? "local_trusted") as DeploymentMode;
    const deploymentExposure = (c.env.DEPLOYMENT_EXPOSURE ?? "private") as DeploymentExposure;

    let bootstrapStatus: "ready" | "bootstrap_pending" = "ready";
    let bootstrapInviteActive = false;

    if (deploymentMode === "authenticated") {
      const roleCount = await db
        .select({ count: count() })
        .from(instanceUserRoles)
        .where(sql`${instanceUserRoles.role} = 'instance_admin'`)
        .then((rows) => Number(rows[0]?.count ?? 0));
      bootstrapStatus = roleCount > 0 ? "ready" : "bootstrap_pending";

      if (bootstrapStatus === "bootstrap_pending") {
        const now = new Date().toISOString();
        const inviteCount = await db
          .select({ count: count() })
          .from(invites)
          .where(
            and(
              eq(invites.inviteType, "bootstrap_ceo"),
              isNull(invites.revokedAt),
              isNull(invites.acceptedAt),
              gt(invites.expiresAt, now),
            ),
          )
          .then((rows) => Number(rows[0]?.count ?? 0));
        bootstrapInviteActive = inviteCount > 0;
      }
    }

    return c.json({
      status: "ok",
      version: VERSION,
      runtime: "cloudflare-workers",
      deploymentMode,
      deploymentExposure,
      authReady: true,
      bootstrapStatus,
      bootstrapInviteActive,
      features: {
        companyDeletionEnabled: true,
      },
    });
  });

  return app;
}
