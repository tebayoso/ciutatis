import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  invites,
  joinRequests,
  agents,
  agentApiKeys,
  institutionMemberships,
  principalPermissionGrants,
  instanceUserRoles,
  companies,
} from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import {
  assertBoard,
  assertCompanyAccess,
  getActorInfo,
} from "../lib/authz.js";
import {
  notFound,
  badRequest,
  conflict,
  forbidden,
  unprocessable,
} from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";
import { hashToken } from "../lib/crypto.js";

export function accessRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/skills/available", async (c) => {
    return c.json([]);
  });

  app.get("/skills/index", async (c) => {
    return c.json([]);
  });

  app.get("/skills/:skillName", async (c) => {
    return c.json({ error: "Skill files not available in Workers runtime" }, 501);
  });

  app.post("/companies/:companyId/invites", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);

    const body = await c.req.json();
    const actor = c.get("actor");
    if (actor.type !== "board") throw forbidden("Only board users can create invites");

    const allowedJoinTypes = body.allowedJoinTypes ?? "both";
    const rawToken = crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.insert(invites).values({
      companyId,
      inviteType: "company_join",
      tokenHash,
      allowedJoinTypes,
      defaultsPayload: body.defaultsPayload ?? null,
      expiresAt,
      invitedByUserId: actor.userId,
    });

    const created = await db
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, tokenHash))
      .then((r: any[]) => r[0]);

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "invite.created",
      entityType: "invite",
      entityId: created?.id ?? "",
      details: { allowedJoinTypes },
    });

    return c.json({ ...created, token: rawToken }, 201);
  });

  app.get("/invites/:token", async (c) => {
    const db = c.get("db");
    const token = c.req.param("token")!;
    const tokenHash = await hashToken(token);

    const invite = await db
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, tokenHash))
      .then((r: any[]) => r[0] ?? null);
    if (!invite) throw notFound("Invite not found");

    if (invite.revokedAt) throw badRequest("Invite has been revoked");
    if (invite.acceptedAt) throw badRequest("Invite has already been accepted");
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw badRequest("Invite has expired");
    }

    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, invite.companyId))
      .then((r: any[]) => r[0] ?? null);

    return c.json({
      id: invite.id,
      companyId: invite.companyId,
      companyName: company?.name ?? null,
      inviteType: invite.inviteType,
      allowedJoinTypes: invite.allowedJoinTypes,
      defaultsPayload: invite.defaultsPayload,
      expiresAt: invite.expiresAt,
    });
  });

  app.get("/invites/:token/onboarding", async (c) => {
    const db = c.get("db");
    const token = c.req.param("token")!;
    const tokenHash = await hashToken(token);

    const invite = await db
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, tokenHash))
      .then((r: any[]) => r[0] ?? null);
    if (!invite) throw notFound("Invite not found");

    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, invite.companyId))
      .then((r: any[]) => r[0] ?? null);

    return c.json({
      companyName: company?.name ?? "Unknown",
      inviteToken: token,
      allowedJoinTypes: invite.allowedJoinTypes,
      defaults: invite.defaultsPayload,
      instructions: "Use the API to accept this invite with POST /invites/:token/accept",
    });
  });

  app.get("/invites/:token/onboarding.txt", async (c) => {
    const token = c.req.param("token")!;
    return c.text(
      `Onboarding Instructions\n\nAccept this invite using:\nPOST /api/invites/${token}/accept\n\nProvide your agent details in the request body.`
    );
  });

  app.post("/invites/:token/accept", async (c) => {
    const db = c.get("db");
    const token = c.req.param("token")!;
    const tokenHash = await hashToken(token);

    const invite = await db
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, tokenHash))
      .then((r: any[]) => r[0] ?? null);
    if (!invite) throw notFound("Invite not found");

    if (invite.revokedAt) throw badRequest("Invite has been revoked");
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw badRequest("Invite has expired");
    }

    const body = await c.req.json();
    const requestType = body.requestType ?? "agent";
    const now = new Date().toISOString();

    const claimSecret = crypto.randomUUID();
    const claimSecretHash = await hashToken(claimSecret);
    const claimSecretExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const requestIp = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";

    await db.insert(joinRequests).values({
      inviteId: invite.id,
      companyId: invite.companyId,
      requestType,
      status: "pending_approval",
      requestIp,
      agentName: body.agentName ?? null,
      adapterType: body.adapterType ?? null,
      capabilities: body.capabilities ?? null,
      agentDefaultsPayload: body.defaults ?? null,
      claimSecretHash,
      claimSecretExpiresAt,
      requestingUserId: body.requestingUserId ?? null,
      requestEmailSnapshot: body.email ?? null,
    });

    const created = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.claimSecretHash, claimSecretHash))
      .then((r: any[]) => r[0]);

    await db
      .update(invites)
      .set({ acceptedAt: now, updatedAt: now } as any)
      .where(eq(invites.id, invite.id));

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: invite.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "join_request.created",
      entityType: "join_request",
      entityId: created?.id ?? "",
      details: { requestType, agentName: body.agentName },
    });

    return c.json({
      id: created?.id,
      status: "pending_approval",
      claimSecret,
      claimSecretExpiresAt,
    }, 201);
  });

  app.post("/invites/:inviteId/revoke", async (c) => {
    const db = c.get("db");
    const inviteId = c.req.param("inviteId")!;
    assertBoard(c);

    const invite = await db
      .select()
      .from(invites)
      .where(eq(invites.id, inviteId))
      .then((r: any[]) => r[0] ?? null);
    if (!invite) throw notFound("Invite not found");
    assertCompanyAccess(c, invite.companyId);

    if (invite.revokedAt) throw conflict("Invite already revoked");
    if (invite.acceptedAt) throw conflict("Invite already consumed");

    const now = new Date().toISOString();
    await db
      .update(invites)
      .set({ revokedAt: now, updatedAt: now } as any)
      .where(eq(invites.id, inviteId));

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: invite.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "invite.revoked",
      entityType: "invite",
      entityId: inviteId,
      details: {},
    });
    return c.json({ success: true });
  });

  app.get("/companies/:companyId/join-requests", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);

    const status = c.req.query("status");
    const requestType = c.req.query("requestType");

    const conditions: ReturnType<typeof eq>[] = [eq(joinRequests.companyId, companyId)];
    if (status) conditions.push(eq(joinRequests.status, status));
    if (requestType) conditions.push(eq(joinRequests.requestType, requestType));

    const rows = await db
      .select()
      .from(joinRequests)
      .where(and(...conditions))
      .orderBy(desc(joinRequests.createdAt));
    return c.json(rows);
  });

  app.post("/companies/:companyId/join-requests/:requestId/approve", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    const requestId = c.req.param("requestId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board") throw forbidden("Only board users can approve");

    const joinReq = await db
      .select()
      .from(joinRequests)
      .where(and(eq(joinRequests.id, requestId), eq(joinRequests.companyId, companyId)))
      .then((r: any[]) => r[0] ?? null);
    if (!joinReq) throw notFound("Join request not found");
    if (joinReq.status !== "pending_approval") throw conflict("Join request is not pending");

    const now = new Date().toISOString();

    if (joinReq.requestType === "agent") {
      const defaults = (joinReq.agentDefaultsPayload as Record<string, unknown>) ?? {};
      await db.insert(agents).values({
        companyId,
        name: joinReq.agentName ?? "Agent",
        role: (defaults.role as string) ?? "worker",
        title: (defaults.title as string) ?? null,
        status: "active",
        adapterType: joinReq.adapterType ?? "unknown",
        adapterConfig: (defaults.adapterConfig as Record<string, unknown>) ?? {},
        runtimeConfig: (defaults.runtimeConfig as Record<string, unknown>) ?? {},
        capabilities: joinReq.capabilities ?? null,
        permissions: (defaults.permissions as Record<string, unknown>) ?? {},
      });

      const newAgent = await db
        .select()
        .from(agents)
        .where(and(eq(agents.companyId, companyId), eq(agents.name, joinReq.agentName ?? "Agent")))
        .orderBy(desc(agents.createdAt))
        .limit(1)
        .then((r: any[]) => r[0]);

      if (newAgent) {
        await db.insert(institutionMemberships).values({
          companyId,
          principalType: "agent",
          principalId: newAgent.id,
          status: "active",
        });

        await db
          .update(joinRequests)
          .set({
            status: "approved",
            createdAgentId: newAgent.id,
            approvedByUserId: actor.userId,
            approvedAt: now,
            updatedAt: now,
          } as any)
          .where(eq(joinRequests.id, requestId));
      }
    } else {
      if (joinReq.requestingUserId) {
        await db.insert(institutionMemberships).values({
          companyId,
          principalType: "user",
          principalId: joinReq.requestingUserId,
          status: "active",
        });
      }

      await db
        .update(joinRequests)
        .set({
          status: "approved",
          approvedByUserId: actor.userId,
          approvedAt: now,
          updatedAt: now,
        } as any)
        .where(eq(joinRequests.id, requestId));
    }

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "join_request.approved",
      entityType: "join_request",
      entityId: requestId,
      details: { requestType: joinReq.requestType },
    });

    return c.json({ success: true, status: "approved" });
  });

  app.post("/companies/:companyId/join-requests/:requestId/reject", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    const requestId = c.req.param("requestId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board") throw forbidden("Only board users can reject");

    const joinReq = await db
      .select()
      .from(joinRequests)
      .where(and(eq(joinRequests.id, requestId), eq(joinRequests.companyId, companyId)))
      .then((r: any[]) => r[0] ?? null);
    if (!joinReq) throw notFound("Join request not found");
    if (joinReq.status !== "pending_approval") throw conflict("Join request is not pending");

    const now = new Date().toISOString();
    await db
      .update(joinRequests)
      .set({
        status: "rejected",
        rejectedByUserId: actor.userId,
        rejectedAt: now,
        updatedAt: now,
      } as any)
      .where(eq(joinRequests.id, requestId));

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "join_request.rejected",
      entityType: "join_request",
      entityId: requestId,
      details: {},
    });

    return c.json({ success: true, status: "rejected" });
  });

  app.post("/join-requests/:requestId/claim-api-key", async (c) => {
    const db = c.get("db");
    const requestId = c.req.param("requestId")!;
    const body = await c.req.json();

    if (!body.claimSecret) throw badRequest("claimSecret is required");

    const joinReq = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.id, requestId))
      .then((r: any[]) => r[0] ?? null);
    if (!joinReq) throw notFound("Join request not found");
    if (joinReq.status !== "approved") throw conflict("Join request is not approved");
    if (joinReq.claimSecretConsumedAt) throw conflict("API key already claimed");

    const secretHash = await hashToken(body.claimSecret);
    if (secretHash !== joinReq.claimSecretHash) throw forbidden("Invalid claim secret");

    if (joinReq.claimSecretExpiresAt && new Date(joinReq.claimSecretExpiresAt) < new Date()) {
      throw badRequest("Claim secret has expired");
    }

    if (!joinReq.createdAgentId) throw conflict("No agent created for this request");

    const rawToken = `pcp_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyHash = await hashToken(rawToken);

    await db.insert(agentApiKeys).values({
      agentId: joinReq.createdAgentId,
      companyId: joinReq.companyId,
      name: `${joinReq.agentName ?? "Agent"} API Key`,
      keyHash,
    });

    const now = new Date().toISOString();
    await db
      .update(joinRequests)
      .set({ claimSecretConsumedAt: now, updatedAt: now } as any)
      .where(eq(joinRequests.id, requestId));

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId: joinReq.companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "agent.key_claimed",
      entityType: "agent",
      entityId: joinReq.createdAgentId,
      details: { joinRequestId: requestId },
    });

    return c.json({
      agentId: joinReq.createdAgentId,
      token: rawToken,
      companyId: joinReq.companyId,
    });
  });

  app.get("/companies/:companyId/members", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);

    const memberships = await db
      .select()
      .from(institutionMemberships)
      .where(eq(institutionMemberships.companyId, companyId))
      .orderBy(desc(institutionMemberships.createdAt));

    const grants = await db
      .select()
      .from(principalPermissionGrants)
      .where(eq(principalPermissionGrants.companyId, companyId));

    const members = memberships.map((m) => ({
      ...m,
      permissions: grants.filter(
        (g) => g.principalType === m.principalType && g.principalId === m.principalId
      ),
    }));

    return c.json(members);
  });

  app.patch("/companies/:companyId/members/:memberId/permissions", async (c) => {
    const db = c.get("db");
    const companyId = c.req.param("companyId")!;
    const memberId = c.req.param("memberId")!;
    assertCompanyAccess(c, companyId);
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board") throw forbidden("Only board users can manage permissions");

    const membership = await db
      .select()
      .from(institutionMemberships)
      .where(and(eq(institutionMemberships.id, memberId), eq(institutionMemberships.companyId, companyId)))
      .then((r: any[]) => r[0] ?? null);
    if (!membership) throw notFound("Member not found");

    const body = await c.req.json();
    const grants = body.grants ?? [];

    await db
      .delete(principalPermissionGrants)
      .where(
        and(
          eq(principalPermissionGrants.companyId, companyId),
          eq(principalPermissionGrants.principalType, membership.principalType),
          eq(principalPermissionGrants.principalId, membership.principalId)
        )
      );

    for (const grant of grants) {
      if (!grant.permissionKey) continue;
      await db.insert(principalPermissionGrants).values({
        companyId,
        principalType: membership.principalType,
        principalId: membership.principalId,
        permissionKey: grant.permissionKey,
        scope: grant.scope ?? null,
        grantedByUserId: actor.userId,
      });
    }

    const actorInfo = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: actorInfo.actorType,
      actorId: actorInfo.actorId,
      agentId: actorInfo.agentId,
      runId: actorInfo.runId,
      action: "member.permissions_updated",
      entityType: "member",
      entityId: memberId,
      details: { grantCount: grants.length },
    });

    return c.json({ success: true });
  });

  app.post("/admin/users/:userId/promote-instance-admin", async (c) => {
    const db = c.get("db");
    const userId = c.req.param("userId")!;
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board" || !actor.isInstanceAdmin) {
      throw forbidden("Only instance admins can promote");
    }

    const existing = await db
      .select()
      .from(instanceUserRoles)
      .where(and(eq(instanceUserRoles.userId, userId), eq(instanceUserRoles.role, "instance_admin")))
      .then((r: any[]) => r[0] ?? null);
    if (existing) return c.json({ success: true, message: "Already an instance admin" });

    await db.insert(instanceUserRoles).values({
      userId,
      role: "instance_admin",
    });
    return c.json({ success: true });
  });

  app.post("/admin/users/:userId/demote-instance-admin", async (c) => {
    const db = c.get("db");
    const userId = c.req.param("userId")!;
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board" || !actor.isInstanceAdmin) {
      throw forbidden("Only instance admins can demote");
    }

    await db
      .delete(instanceUserRoles)
      .where(and(eq(instanceUserRoles.userId, userId), eq(instanceUserRoles.role, "instance_admin")));
    return c.json({ success: true });
  });

  app.get("/admin/users/:userId/company-access", async (c) => {
    const db = c.get("db");
    const userId = c.req.param("userId")!;
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board" || !actor.isInstanceAdmin) {
      throw forbidden("Only instance admins can view company access");
    }

    const memberships = await db
      .select()
      .from(institutionMemberships)
      .where(and(eq(institutionMemberships.principalType, "user"), eq(institutionMemberships.principalId, userId)));
    return c.json(memberships);
  });

  app.put("/admin/users/:userId/company-access", async (c) => {
    const db = c.get("db");
    const userId = c.req.param("userId")!;
    assertBoard(c);

    const actor = c.get("actor");
    if (actor.type !== "board" || !actor.isInstanceAdmin) {
      throw forbidden("Only instance admins can set company access");
    }

    const body = await c.req.json();
    const companyIds: string[] = body.companyIds ?? [];

    await db
      .delete(institutionMemberships)
      .where(
        and(
          eq(institutionMemberships.principalType, "user"),
          eq(institutionMemberships.principalId, userId)
        )
      );

    for (const cid of companyIds) {
      await db.insert(institutionMemberships).values({
        companyId: cid,
        principalType: "user",
        principalId: userId,
        status: "active",
      });
    }

    return c.json({ success: true });
  });

  return app;
}
