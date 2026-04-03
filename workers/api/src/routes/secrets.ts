import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { companySecrets, companySecretVersions } from "@ciutatis/db-cloudflare";
import type { AppEnv } from "../lib/types.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../lib/authz.js";
import { notFound } from "../lib/errors.js";
import { logActivity } from "../lib/activity.js";
import { hashToken } from "../lib/crypto.js";

export function secretCompanyRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/providers", (c) => {
    assertBoard(c);
    return c.json([
      { id: "local_encrypted", label: "Local (encrypted at rest)", available: true },
    ]);
  });

  app.get("/", async (c) => {
    const companyId = c.req.param("companyId")!;
    assertBoard(c);
    assertCompanyAccess(c, companyId);
    const db = c.get("db");

    const secrets = await db
      .select({
        id: companySecrets.id,
        companyId: companySecrets.companyId,
        name: companySecrets.name,
        provider: companySecrets.provider,
        description: companySecrets.description,
        externalRef: companySecrets.externalRef,
        latestVersion: companySecrets.latestVersion,
        createdAt: companySecrets.createdAt,
        updatedAt: companySecrets.updatedAt,
      })
      .from(companySecrets)
      .where(eq(companySecrets.companyId, companyId))
      .orderBy(desc(companySecrets.createdAt));

    return c.json(secrets);
  });

  app.post("/", async (c) => {
    assertBoard(c);
    const companyId = c.req.param("companyId")!;
    assertCompanyAccess(c, companyId);
    const db = c.get("db");
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const valueSha256 = await hashToken(body.value ?? "");

    await db.insert(companySecrets).values({
      id,
      companyId,
      name: body.name,
      provider: body.provider ?? "local_encrypted",
      description: body.description ?? null,
      externalRef: body.externalRef ?? null,
      latestVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(companySecretVersions).values({
      secretId: id,
      version: 1,
      material: { value: body.value ?? "" },
      valueSha256,
      createdByUserId: "board",
      createdAt: now,
    });

    const [created] = await db
      .select()
      .from(companySecrets)
      .where(eq(companySecrets.id, id));

    const actor = getActorInfo(c);
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: actor.actorId,
      action: "secret.created",
      entityType: "secret",
      entityId: created.id,
      details: { name: created.name, provider: created.provider },
    });

    return c.json(created, 201);
  });

  return app;
}

export function secretByIdRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/:id/rotate", async (c) => {
    assertBoard(c);
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();

    const existing = await db
      .select()
      .from(companySecrets)
      .where(eq(companySecrets.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Secret not found");
    assertCompanyAccess(c, existing.companyId);

    const newVersion = (existing.latestVersion ?? 0) + 1;
    const now = new Date().toISOString();
    const valueSha256 = await hashToken(body.value ?? "");

    await db.insert(companySecretVersions).values({
      secretId: id,
      version: newVersion,
      material: { value: body.value ?? "" },
      valueSha256,
      createdByUserId: "board",
      createdAt: now,
    });

    await db
      .update(companySecrets)
      .set({
        latestVersion: newVersion,
        externalRef: body.externalRef ?? existing.externalRef,
        updatedAt: now,
      })
      .where(eq(companySecrets.id, id));

    const [rotated] = await db.select().from(companySecrets).where(eq(companySecrets.id, id));

    const actor = getActorInfo(c);
    await logActivity(db, {
      companyId: rotated.companyId,
      actorType: "user",
      actorId: actor.actorId,
      action: "secret.rotated",
      entityType: "secret",
      entityId: rotated.id,
      details: { version: rotated.latestVersion },
    });

    return c.json(rotated);
  });

  app.patch("/:id", async (c) => {
    assertBoard(c);
    const id = c.req.param("id")!;
    const db = c.get("db");
    const body = await c.req.json();

    const existing = await db
      .select()
      .from(companySecrets)
      .where(eq(companySecrets.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Secret not found");
    assertCompanyAccess(c, existing.companyId);

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.externalRef !== undefined) updates.externalRef = body.externalRef;

    await db.update(companySecrets).set(updates).where(eq(companySecrets.id, id));
    const [updated] = await db.select().from(companySecrets).where(eq(companySecrets.id, id));

    const actor = getActorInfo(c);
    await logActivity(db, {
      companyId: updated.companyId,
      actorType: "user",
      actorId: actor.actorId,
      action: "secret.updated",
      entityType: "secret",
      entityId: updated.id,
      details: { name: updated.name },
    });

    return c.json(updated);
  });

  app.delete("/:id", async (c) => {
    assertBoard(c);
    const id = c.req.param("id")!;
    const db = c.get("db");

    const existing = await db
      .select()
      .from(companySecrets)
      .where(eq(companySecrets.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Secret not found");
    assertCompanyAccess(c, existing.companyId);

    await db.delete(companySecretVersions).where(eq(companySecretVersions.secretId, id));
    await db.delete(companySecrets).where(eq(companySecrets.id, id));

    const actor = getActorInfo(c);
    await logActivity(db, {
      companyId: existing.companyId,
      actorType: "user",
      actorId: actor.actorId,
      action: "secret.deleted",
      entityType: "secret",
      entityId: existing.id,
      details: { name: existing.name },
    });

    return c.json({ ok: true });
  });

  return app;
}
