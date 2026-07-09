import { Hono } from "hono";
import {
  publicRequestCommentSchema,
  publicRequestCreateSchema,
} from "@paperclipai/shared";
import type { AppEnv } from "../lib/types.js";
import { getActorInfo } from "../lib/authz.js";
import { logActivity } from "../lib/activity.js";
import { enqueueHostedHeartbeatRun } from "../lib/hosted-heartbeats.js";
import { publicPortalService, searchNominatim, lookupNominatim } from "../lib/public-portal.js";
import { publicGeoService } from "../lib/public-geo.js";

export function publicPortalRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/search", async (c) => {
    const portal = publicPortalService(c.get("db"));
    return c.json(await portal.searchPublic({ q: c.req.query("q") ?? undefined }));
  });

  // Canonical geo reference layer (see workfiles/argentina-geo-index-design.md).
  app.get("/geo/search", async (c) => {
    const q = c.req.query("q");
    if (!q) return c.json([]);
    const geo = publicGeoService(c.get("db"));
    const levels = c.req.query("levels")?.split(",").filter(Boolean);
    return c.json(
      await geo.search({
        q,
        country: c.req.query("country") ?? "ar",
        levels,
        max: Number(c.req.query("max")) || undefined,
      }),
    );
  });

  app.get("/geo/by-path", async (c) => {
    const path = c.req.query("path");
    if (!path) return c.json({ error: "path is required" }, 400);
    const geo = publicGeoService(c.get("db"));
    const entity = await geo.getByPath(path);
    if (!entity) return c.json({ error: "Geo entity not found" }, 404);
    return c.json(entity);
  });

  app.get("/geo/children", async (c) => {
    const id = c.req.query("id");
    if (!id) return c.json({ error: "id is required" }, 400);
    const geo = publicGeoService(c.get("db"));
    return c.json(
      await geo.children({
        id,
        level: c.req.query("level") ?? undefined,
        offset: Number(c.req.query("offset")) || 0,
        max: Number(c.req.query("max")) || undefined,
      }),
    );
  });

  app.get("/institutions", async (c) => {
    const portal = publicPortalService(c.get("db"));
    return c.json(await portal.listInstitutions({ q: c.req.query("q") ?? undefined }));
  });

  app.get("/institutions/:institutionSlug", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const institution = await portal.getInstitutionBySlug(c.req.param("institutionSlug"));
    if (!institution) {
      return c.json({ error: "Institution not found" }, 404);
    }
    return c.json(institution);
  });

  app.get("/places/:pathPrefix", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const pathPrefix = decodeURIComponent(c.req.param("pathPrefix"));
    const place = await portal.getPlaceByPathPrefix(pathPrefix);
    if (!place) {
      return c.json({ error: "Place not found" }, 404);
    }
    return c.json(place);
  });

  app.get("/nominatim/search", async (c) => {
    const q = c.req.query("q");
    if (!q?.trim()) {
      return c.json({ error: "Query required" }, 400);
    }
    const country = c.req.query("country") ?? undefined;
    const results = await searchNominatim(q.trim(), country);
    return c.json(results);
  });

  app.get("/nominatim/lookup", async (c) => {
    const osmType = c.req.query("osm_type");
    const osmId = c.req.query("osm_id");
    if (!osmType || !osmId) {
      return c.json({ error: "osm_type and osm_id required" }, 400);
    }
    const result = await lookupNominatim(osmType, osmId);
    if (!result) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json(result);
  });

  app.post("/places", async (c) => {
    const portal = publicPortalService(c.get("db"));
    const body = await c.req.json();
    try {
      const place = await portal.createPlaceFromNominatim(body);
      return c.json(place, 201);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Failed to create place" }, 400);
    }
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
