import { Hono } from "hono";
import {
  publicRequestCommentSchema,
  publicRequestCreateSchema,
} from "@paperclipai/shared";
import type { AppEnv } from "../lib/types.js";
import { getActorInfo } from "../lib/authz.js";
import { logActivity } from "../lib/activity.js";
import { enqueueHostedHeartbeatRun } from "../lib/hosted-heartbeats.js";
import { publicPortalService } from "../lib/public-portal.js";

export function publicPortalRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/institutions", async (c) => {
    const portal = publicPortalService(c.get("db"));
    return c.json(await portal.listInstitutions());
  });

  app.get("/institutions/:institutionSlug", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const institution = await portal.getInstitutionBySlug(c.req.param("institutionSlug"));
    if (!institution) {
      return c.json({ error: "Institution not found" }, 404);
    }
    return c.json(institution);
  });

  app.get("/requests", async (c) => {
    const portal = publicPortalService(c.get("db"));
    return c.json(
      await portal.listPublicRequests({
        institutionSlug: c.req.query("institutionSlug") ?? undefined,
        publicStatus: c.req.query("publicStatus") ?? undefined,
        category: c.req.query("category") ?? undefined,
        q: c.req.query("q") ?? undefined,
      }),
    );
  });

  app.get("/requests/:publicId", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const actor = c.get("actor");
    const detail = await portal.getPublicRequest(c.req.param("publicId"), {
      userId: actor.type === "board" ? actor.userId ?? null : null,
    });

    if (!detail) {
      return c.json({ error: "Public request not found" }, 404);
    }

    return c.json(detail);
  });

  app.post("/requests", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const parsed = publicRequestCreateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
    }

    const actor = c.get("actor");
    const ownerUserId =
      parsed.data.submissionMode === "account" && actor.type === "board"
        ? actor.userId ?? null
        : null;

    const created = await portal.createPublicRequest({
      ...parsed.data,
      ownerUserId,
    });

    if (actor.type !== "none") {
      const actorInfo = getActorInfo(c);
      await logActivity(c.get("db"), {
        companyId: created.companyId,
        actorType: actorInfo.actorType,
        actorId: actorInfo.actorId,
        agentId: actorInfo.agentId,
        runId: actorInfo.runId,
        action: "issue.created",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          publicId: created.result.publicId,
          submissionMode: parsed.data.submissionMode,
          category: parsed.data.category,
        },
      });
    } else {
      await logActivity(c.get("db"), {
        companyId: created.companyId,
        actorType: "system",
        actorId: "public-portal",
        agentId: null,
        runId: null,
        action: "issue.created",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          publicId: created.result.publicId,
          submissionMode: parsed.data.submissionMode,
          category: parsed.data.category,
        },
      });
    }

    if (created.assigneeAgentId) {
      const actorInfo = actor.type !== "none" ? getActorInfo(c) : null;
      void enqueueHostedHeartbeatRun({
        db: c.get("db"),
        env: c.env,
        executionCtx: c.executionCtx,
        agentId: created.assigneeAgentId,
        source: "assignment",
        triggerDetail: "system",
        reason: "public_portal_request",
        payload: {
          issueId: created.issueId,
          mutation: "create",
          source: "public_portal",
        },
        requestedByActorType: actorInfo?.actorType ?? "system",
        requestedByActorId: actorInfo?.actorId ?? "public-portal",
        contextSnapshot: {
          issueId: created.issueId,
          source: "public_portal",
        },
      }).catch(() => undefined);
    }

    return c.json(created.result, 201);
  });

  app.post("/requests/:publicId/comments", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const parsed = publicRequestCommentSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
    }

    const actor = c.get("actor");
    const created = await portal.addPublicComment(c.req.param("publicId"), parsed.data, {
      userId: actor.type === "board" ? actor.userId ?? null : null,
    });

    if (actor.type !== "none") {
      const actorInfo = getActorInfo(c);
      await logActivity(c.get("db"), {
        companyId: created.companyId,
        actorType: actorInfo.actorType,
        actorId: actorInfo.actorId,
        agentId: actorInfo.agentId,
        runId: actorInfo.runId,
        action: "issue.comment_added",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          commentId: created.comment.id,
        },
      });
    } else {
      await logActivity(c.get("db"), {
        companyId: created.companyId,
        actorType: "system",
        actorId: "public-portal",
        agentId: null,
        runId: null,
        action: "issue.comment_added",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          commentId: created.comment.id,
        },
      });
    }

    if (created.assigneeAgentId) {
      const actorInfo = actor.type !== "none" ? getActorInfo(c) : null;
      void enqueueHostedHeartbeatRun({
        db: c.get("db"),
        env: c.env,
        executionCtx: c.executionCtx,
        agentId: created.assigneeAgentId,
        source: "automation",
        triggerDetail: "system",
        reason: "public_portal_follow_up",
        payload: {
          issueId: created.issueId,
          commentId: created.comment.id,
          mutation: "comment",
          source: "public_portal",
        },
        requestedByActorType: actorInfo?.actorType ?? "system",
        requestedByActorId: actorInfo?.actorId ?? "public-portal",
        contextSnapshot: {
          issueId: created.issueId,
          commentId: created.comment.id,
          source: "public_portal",
        },
      }).catch(() => undefined);
    }

    return c.json({ ok: true }, 201);
  });

  return app;
}
