import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { assets, companyLogos } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { badRequest, notFound, unprocessable } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const ALLOWED_ATTACHMENT_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function assetRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/companies/:companyId/assets/images", async (c) => {
    const companyId = c.req.param("companyId");
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const r2 = c.env.ASSETS;

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      throw badRequest("Missing file field 'file'");
    }

    const contentType = (file.type || "").toLowerCase();
    if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
      throw unprocessable(`Unsupported file type: ${contentType || "unknown"}`);
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength <= 0) {
      throw unprocessable("Image is empty");
    }
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      throw unprocessable(`File exceeds ${MAX_ATTACHMENT_BYTES} bytes`);
    }

    const namespace = (body["namespace"] as string) || "general";
    const objectKey = `companies/${companyId}/assets/${namespace}/${crypto.randomUUID()}/${file.name || "asset"}`;
    const hash = await sha256Hex(buffer);

    await r2.put(objectKey, buffer, {
      httpMetadata: { contentType },
      customMetadata: { companyId, sha256: hash },
    });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const actor = getActorInfo(c);

    await db.insert(assets).values({
      id,
      companyId,
      provider: "r2",
      objectKey,
      contentType,
      byteSize: buffer.byteLength,
      sha256: hash,
      originalFilename: file.name || null,
      createdByAgentId: actor.agentId ?? null,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "asset.created",
      entityType: "asset",
      entityId: id,
      details: {
        originalFilename: file.name,
        contentType,
        byteSize: buffer.byteLength,
      },
    });

    return c.json(
      {
        assetId: id,
        companyId,
        provider: "r2",
        objectKey,
        contentType,
        byteSize: buffer.byteLength,
        sha256: hash,
        originalFilename: file.name || null,
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        createdAt: now,
        updatedAt: now,
        contentPath: `/api/assets/${id}/content`,
      },
      201,
    );
  });

  app.post("/companies/:companyId/logo", async (c) => {
    const companyId = c.req.param("companyId");
    assertBoard(c);
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const r2 = c.env.ASSETS;

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      throw badRequest("Missing file field 'file'");
    }

    const contentType = (file.type || "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw unprocessable(`Unsupported image type: ${contentType || "unknown"}`);
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength <= 0) {
      throw unprocessable("Image is empty");
    }
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      throw unprocessable(`Image exceeds ${MAX_ATTACHMENT_BYTES} bytes`);
    }

    const objectKey = `companies/${companyId}/assets/companies/${crypto.randomUUID()}/${file.name || "logo"}`;
    const hash = await sha256Hex(buffer);

    await r2.put(objectKey, buffer, {
      httpMetadata: { contentType },
      customMetadata: { companyId, sha256: hash },
    });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const actor = getActorInfo(c);

    await db.insert(assets).values({
      id,
      companyId,
      provider: "r2",
      objectKey,
      contentType,
      byteSize: buffer.byteLength,
      sha256: hash,
      originalFilename: file.name || null,
      createdByAgentId: actor.agentId ?? null,
      createdByUserId: actor.actorType === "user" ? actor.actorId : null,
      createdAt: now,
      updatedAt: now,
    });

    const [existingLogo] = await db
      .select()
      .from(companyLogos)
      .where(eq(companyLogos.companyId, companyId));

    if (existingLogo) {
      await db
        .update(companyLogos)
        .set({ assetId: id, updatedAt: now })
        .where(eq(companyLogos.companyId, companyId));
    } else {
      await db.insert(companyLogos).values({
        id: crypto.randomUUID(),
        companyId,
        assetId: id,
        createdAt: now,
        updatedAt: now,
      });
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "asset.created",
      entityType: "asset",
      entityId: id,
      details: {
        originalFilename: file.name,
        contentType,
        byteSize: buffer.byteLength,
        namespace: "assets/companies",
      },
    });

    return c.json(
      {
        assetId: id,
        companyId,
        provider: "r2",
        objectKey,
        contentType,
        byteSize: buffer.byteLength,
        sha256: hash,
        originalFilename: file.name || null,
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        createdAt: now,
        updatedAt: now,
        contentPath: `/api/assets/${id}/content`,
      },
      201,
    );
  });

  app.get("/assets/:assetId/content", async (c) => {
    const assetId = c.req.param("assetId");
    const db = c.get("db");
    const r2 = c.env.ASSETS;

    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId));

    if (!asset) throw notFound("Asset not found");
    assertCompanyAccess(c, asset.companyId);

    const object = await r2.get(asset.objectKey);
    if (!object) throw notFound("Asset content not found in storage");

    const responseContentType =
      asset.contentType || object.httpMetadata?.contentType || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", responseContentType);
    if (asset.byteSize) headers.set("Content-Length", String(asset.byteSize));
    headers.set("Cache-Control", "private, max-age=60");
    headers.set("X-Content-Type-Options", "nosniff");

    if (responseContentType === "image/svg+xml") {
      headers.set(
        "Content-Security-Policy",
        "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      );
    }

    const filename = (asset.originalFilename ?? "asset").replace(/"/g, "");
    headers.set("Content-Disposition", `inline; filename="${filename}"`);

    return new Response(object.body, { headers });
  });

  return app;
}
