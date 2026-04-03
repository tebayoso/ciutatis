import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { instanceSettings, tenantInstances } from "@ciutatis/db-cloudflare";
import {
  createTenantInstanceSchema,
  patchTenantProvisioningSettingsSchema,
  tenantProvisioningSettingsSchema,
  updateTenantInstanceSchema,
} from "@ciutatis/shared";
import type { AppEnv } from "../lib/types.js";
import { assertBoard } from "../lib/authz.js";

function normalizeProvisioningSettings(raw: unknown) {
  const parsed = tenantProvisioningSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return tenantProvisioningSettingsSchema.parse({});
}

function asExperimentalRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeShortCode(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCountryCode(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCitySlug(value: string) {
  return value.trim().toLowerCase();
}

function derivePathPrefix(countryCode: string, citySlug: string, shortCode: string) {
  return `/${normalizeCountryCode(countryCode)}/${normalizeCitySlug(citySlug)}-${normalizeShortCode(shortCode)}`;
}

function deriveWorkerName(countryCode: string, citySlug: string, shortCode: string) {
  return `ciutatis-${normalizeCountryCode(countryCode)}-${normalizeCitySlug(citySlug)}-${normalizeShortCode(shortCode)}`;
}

function toTenantUrl(row: typeof tenantInstances.$inferSelect) {
  if ((row.routingMode === "custom_domain" || row.routingMode === "subdomain") && row.hostname) {
    return `https://${row.hostname}`;
  }
  return `https://ciutatis.com${row.pathPrefix}`;
}

function toTenantInstance(row: typeof tenantInstances.$inferSelect) {
  return {
    ...row,
    tenantUrl: toTenantUrl(row),
  };
}

export function instanceSettingsRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/instance-settings", async (c) => {
    assertBoard(c);
    const db = c.get("db");

    const rows = await db.select().from(instanceSettings).limit(1);
    return c.json(rows[0] ?? {});
  });

  app.patch("/instance-settings", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = await c.req.json();

    const existing = await db.select().from(instanceSettings).limit(1);
    if (existing.length === 0) {
      await db.insert(instanceSettings).values({
        id: "default",
        ...body,
      });
    } else {
      await db
        .update(instanceSettings)
        .set(body)
        .where(eq(instanceSettings.id, existing[0].id));
    }

    const [updated] = await db.select().from(instanceSettings).limit(1);
    return c.json(updated ?? {});
  });

  app.get("/instance/settings/tenant-provisioning", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const existing = await db.select().from(instanceSettings).limit(1);
    const experimental = asExperimentalRecord(existing[0]?.experimental);
    return c.json(normalizeProvisioningSettings(experimental.tenantProvisioning));
  });

  app.patch("/instance/settings/tenant-provisioning", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = patchTenantProvisioningSettingsSchema.parse(await c.req.json());

    const existing = await db.select().from(instanceSettings).limit(1);
    const currentRow = existing[0] ?? null;
    const currentExperimental = asExperimentalRecord(currentRow?.experimental);
    const nextProvisioning = normalizeProvisioningSettings({
      ...normalizeProvisioningSettings(currentExperimental.tenantProvisioning),
      ...body,
    });
    const nextExperimental = {
      ...currentExperimental,
      tenantProvisioning: nextProvisioning,
    };

    if (!currentRow) {
      await db.insert(instanceSettings).values({
        id: crypto.randomUUID(),
        singletonKey: "default",
        experimental: nextExperimental,
      });
    } else {
      await db
        .update(instanceSettings)
        .set({ experimental: nextExperimental, updatedAt: new Date().toISOString() })
        .where(eq(instanceSettings.id, currentRow.id));
    }

    return c.json(nextProvisioning);
  });

  app.get("/instance/settings/tenants", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const rows = await db.select().from(tenantInstances);
    return c.json(rows.map(toTenantInstance));
  });

  app.post("/instance/settings/tenants", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = createTenantInstanceSchema.parse(await c.req.json());
    const now = new Date().toISOString();
    const countryCode = normalizeCountryCode(body.countryCode);
    const citySlug = normalizeCitySlug(body.citySlug);
    const shortCode = normalizeShortCode(body.shortCode);

    const [created] = await db.insert(tenantInstances).values({
      name: body.name.trim(),
      municipalityName: body.municipalityName.trim(),
      countryCode,
      citySlug,
      shortCode,
      routingMode: body.routingMode,
      status: "provisioning",
      pathPrefix: derivePathPrefix(countryCode, citySlug, shortCode),
      hostname: body.hostname?.trim() || null,
      workerName: deriveWorkerName(countryCode, citySlug, shortCode),
      notes: body.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return c.json(toTenantInstance(created!), 201);
  });

  app.patch("/instance/settings/tenants/:tenantId", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const tenantId = c.req.param("tenantId");
    if (!tenantId) {
      return c.json({ error: "Tenant instance id is required" }, 400);
    }
    const body = updateTenantInstanceSchema.parse(await c.req.json());
    const existing = await db.select().from(tenantInstances).where(eq(tenantInstances.id, tenantId)).then((rows) => rows[0] ?? null);
    if (!existing) {
      return c.json({ error: "Tenant instance not found" }, 404);
    }

    const countryCode = body.countryCode ? normalizeCountryCode(body.countryCode) : existing.countryCode;
    const citySlug = body.citySlug ? normalizeCitySlug(body.citySlug) : existing.citySlug;
    const shortCode = body.shortCode ? normalizeShortCode(body.shortCode) : existing.shortCode;

    const [updated] = await db
      .update(tenantInstances)
      .set({
        name: body.name?.trim() ?? existing.name,
        municipalityName: body.municipalityName?.trim() ?? existing.municipalityName,
        countryCode,
        citySlug,
        shortCode,
        routingMode: body.routingMode ?? existing.routingMode,
        status: body.status ?? existing.status,
        pathPrefix: derivePathPrefix(countryCode, citySlug, shortCode),
        hostname: body.hostname === undefined ? existing.hostname : body.hostname?.trim() || null,
        workerName: deriveWorkerName(countryCode, citySlug, shortCode),
        notes: body.notes === undefined ? existing.notes : body.notes?.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantInstances.id, tenantId))
      .returning();

    return c.json(toTenantInstance(updated!));
  });

  return app;
}
