import { createMiddleware } from "hono/factory";
import { and, eq, isNull } from "drizzle-orm";
import {
  agentApiKeys,
  agents,
  authSessions,
  authUsers,
  companyMemberships,
  instanceUserRoles,
} from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import type { Actor } from "../lib/types.js";
import { hashToken } from "../lib/crypto.js";
import { verifyLocalAgentJwt } from "../lib/agent-auth-jwt.js";
import type { DeploymentMode } from "@ciutatis/shared";
import { parseAuthCookie } from "../auth/cookies.js";
import { deleteSessionFromKV, getSessionFromKV } from "../session/kv.js";

function resolveDeploymentMode(env: { DEPLOYMENT_MODE?: string }): DeploymentMode {
  const mode = env.DEPLOYMENT_MODE;
  if (mode === "authenticated" || mode === "local_trusted") return mode;
  return "local_trusted";
}

export const actorMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = c.get("db");
  const deploymentMode = resolveDeploymentMode(c.env);

  let actor: Actor =
    deploymentMode === "local_trusted"
      ? { type: "board", userId: "local-board", isInstanceAdmin: true, source: "local_implicit" }
      : { type: "none", source: "none" };

  const runIdHeader = c.req.header("x-paperclip-run-id");

  const authHeader = c.req.header("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    if (deploymentMode === "authenticated") {
      const sessionToken = parseAuthCookie(c);

      if (sessionToken) {
        const session = await db
          .select()
          .from(authSessions)
          .where(eq(authSessions.token, sessionToken))
          .then((rows: any[]) => rows[0] ?? null);

        if (session) {
          const expiresAtMs = Date.parse(session.expiresAt);
          const isExpired = !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();

          if (isExpired) {
            try {
              const cachedSession = await getSessionFromKV(session.id);
              if (cachedSession) {
                await deleteSessionFromKV(session.id);
              }
            } catch {
            }
          } else {
            const user = await db
              .select()
              .from(authUsers)
              .where(eq(authUsers.id, session.userId))
              .then((rows: any[]) => rows[0] ?? null);

            if (user) {
              const [memberships, roles] = await Promise.all([
                db
                  .select()
                  .from(companyMemberships)
                  .where(and(eq(companyMemberships.principalType, "user"), eq(companyMemberships.principalId, user.id))),
                db.select().from(instanceUserRoles).where(eq(instanceUserRoles.userId, user.id)),
              ]);

              actor = {
                type: "board",
                userId: user.id,
                companyIds: memberships.map((membership: any) => membership.companyId),
                 isInstanceAdmin: roles.some((role: any) => role.role === "instance_admin"),
                source: "session",
              };
            }
          }
        }
      }
    }

    if (runIdHeader && actor.type !== "none") {
      actor = { ...actor, runId: runIdHeader } as Actor;
    }
    c.set("actor", actor);
    await next();
    return;
  }

  const token = authHeader.slice("bearer ".length).trim();
  if (!token) {
    c.set("actor", actor);
    await next();
    return;
  }

  const tokenHash = await hashToken(token);
  const key = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, tokenHash), isNull(agentApiKeys.revokedAt)))
    .then((rows: any[]) => rows[0] ?? null);

  if (!key) {
    const claims = await verifyLocalAgentJwt(token, c.env);
    if (!claims) {
      c.set("actor", actor);
      await next();
      return;
    }

    const agentRecord = await db
      .select()
      .from(agents)
      .where(eq(agents.id, claims.sub))
      .then((rows: any[]) => rows[0] ?? null);

    if (!agentRecord || agentRecord.companyId !== claims.company_id) {
      c.set("actor", actor);
      await next();
      return;
    }

    if (agentRecord.status === "terminated" || agentRecord.status === "pending_approval") {
      c.set("actor", actor);
      await next();
      return;
    }

    c.set("actor", {
      type: "agent",
      agentId: claims.sub,
      companyId: claims.company_id,
      keyId: undefined,
      runId: runIdHeader || claims.run_id || undefined,
      source: "agent_jwt",
    });
    await next();
    return;
  }

  await db
    .update(agentApiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(agentApiKeys.id, key.id));

  const agentRecord = await db
    .select()
    .from(agents)
    .where(eq(agents.id, key.agentId))
    .then((rows: any[]) => rows[0] ?? null);

  if (!agentRecord || agentRecord.status === "terminated" || agentRecord.status === "pending_approval") {
    c.set("actor", actor);
    await next();
    return;
  }

  c.set("actor", {
    type: "agent",
    agentId: key.agentId,
    companyId: key.companyId,
    keyId: key.id,
    runId: runIdHeader || undefined,
    source: "agent_key",
  });
  await next();
});
