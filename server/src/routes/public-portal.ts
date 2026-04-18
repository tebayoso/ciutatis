import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  publicRequestCommentSchema,
  publicRequestCreateSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { heartbeatService, logActivity, publicPortalService } from "../services/index.js";
import { getActorInfo } from "./authz.js";
import { logger } from "../middleware/logger.js";

export function publicPortalRoutes(db: Db) {
  const router = Router();
  const portal = publicPortalService(db);
  const heartbeat = heartbeatService(db);

  router.get("/institutions", async (_req, res) => {
    const institutions = await portal.listInstitutions();
    res.json(institutions);
  });

  router.get("/institutions/:institutionSlug", async (req, res) => {
    const institution = await portal.getInstitutionBySlug(req.params.institutionSlug);
    if (!institution) {
      res.status(404).json({ error: "Institution not found" });
      return;
    }
    res.json(institution);
  });

  router.get("/requests", async (req, res) => {
    const requests = await portal.listPublicRequests({
      institutionSlug:
        typeof req.query.institutionSlug === "string" ? req.query.institutionSlug : undefined,
      publicStatus:
        typeof req.query.publicStatus === "string" ? req.query.publicStatus : undefined,
      category:
        typeof req.query.category === "string" ? req.query.category : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
    });
    res.json(requests);
  });

  router.get("/requests/:publicId", async (req, res) => {
    const detail = await portal.getPublicRequest(req.params.publicId, {
      userId: req.actor.type === "board" ? req.actor.userId ?? null : null,
    });

    if (!detail) {
      res.status(404).json({ error: "Public request not found" });
      return;
    }

    res.json(detail);
  });

  router.post("/requests", validate(publicRequestCreateSchema), async (req, res) => {
    const submissionMode = req.body.submissionMode as string;
    const ownerUserId =
      submissionMode === "account" && req.actor.type === "board"
        ? req.actor.userId ?? null
        : null;

    const created = await portal.createPublicRequest({
      ...req.body,
      ownerUserId,
    });

    if (req.actor.type !== "none") {
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: created.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "issue.created",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          publicId: created.result.publicId,
          submissionMode,
          category: req.body.category,
        },
      });
    } else {
      await logActivity(db, {
        companyId: created.companyId,
        actorType: "system",
        actorId: "public-portal",
        action: "issue.created",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          publicId: created.result.publicId,
          submissionMode,
          category: req.body.category,
        },
      });
    }

    if (created.assigneeAgentId) {
      void heartbeat
        .wakeup(created.assigneeAgentId, {
          source: "assignment",
          triggerDetail: "system",
          reason: "public_portal_request",
          payload: {
            issueId: created.issueId,
            mutation: "create",
            source: "public_portal",
          },
          requestedByActorType: req.actor.type === "board" ? "user" : "system",
          requestedByActorId:
            req.actor.type === "board" ? (req.actor.userId ?? "public-portal") : "public-portal",
          contextSnapshot: {
            issueId: created.issueId,
            source: "public_portal",
          },
        })
        .catch((err) => {
          logger.warn({ err, issueId: created.issueId }, "failed to wake assignee for public portal request");
        });
    }

    res.status(201).json(created.result);
  });

  router.post("/requests/:publicId/comments", validate(publicRequestCommentSchema), async (req, res) => {
    const publicIdParam = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;
    const created = await portal.addPublicComment(publicIdParam, req.body, {
      userId: req.actor.type === "board" ? req.actor.userId ?? null : null,
    });

    if (req.actor.type !== "none") {
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: created.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "issue.comment_added",
        entityType: "issue",
        entityId: created.issueId,
        details: {
          source: "public_portal",
          commentId: created.comment.id,
        },
      });
    } else {
      await logActivity(db, {
        companyId: created.companyId,
        actorType: "system",
        actorId: "public-portal",
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
      void heartbeat
        .wakeup(created.assigneeAgentId, {
          source: "automation",
          triggerDetail: "system",
          reason: "public_portal_follow_up",
          payload: {
            issueId: created.issueId,
            commentId: created.comment.id,
            mutation: "comment",
            source: "public_portal",
          },
          requestedByActorType: req.actor.type === "board" ? "user" : "system",
          requestedByActorId:
            req.actor.type === "board" ? (req.actor.userId ?? "public-portal") : "public-portal",
          contextSnapshot: {
            issueId: created.issueId,
            commentId: created.comment.id,
            source: "public_portal",
          },
        })
        .catch((err) => {
          logger.warn({ err, issueId: created.issueId }, "failed to wake assignee for public portal follow-up");
        });
    }

    res.status(201).json({ ok: true });
  });

  return router;
}
