import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { instanceSettings, tenantInstances, tenantProvisioningJobs } from "@ciutatis/db-cloudflare";
import {
  CloudflareTenantProvisioner,
  MockTenantProvisioner,
  cloudflareProvisioningSettingsSchema,
  createTenantInstanceSchema,
  deriveTenantDispatcherKey,
  deriveTenantPathPrefix,
  deriveTenantUrl,
  deriveTenantWorkerName,
  patchCloudflareProvisioningSettingsSchema,
  patchTenantProvisioningSettingsSchema,
  tenantProvisioningSettingsSchema,
  updateTenantInstanceSchema,
  type CloudflareProvisioningSettings,
  type CloudflareProvisioningValidationResult,
  type CreateTenantInstance,
  type InstanceAdminOverview,
  type TenantInstance,
  type TenantProvisioner,
  type TenantProvisioningJob,
  type TenantProvisioningJobKind,
  type TenantProvisioningJobTrigger,
  type UpdateTenantInstance,
} from "@ciutatis/shared";
import type { AppEnv } from "../lib/types.js";
import { assertBoard } from "../lib/authz.js";

let isDrainingTenantProvisioningJobs = false;

type TenantRow = typeof tenantInstances.$inferSelect;
type TenantProvisioningJobRow = typeof tenantProvisioningJobs.$inferSelect;
type SettingsRow = typeof instanceSettings.$inferSelect;

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function normalizeProvisioningSettings(raw: unknown) {
  const parsed = tenantProvisioningSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return tenantProvisioningSettingsSchema.parse({});
}

function normalizeCloudflareSettings(raw: unknown) {
  const parsed = cloudflareProvisioningSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return cloudflareProvisioningSettingsSchema.parse({});
}

function toTenantProvisioningJob(row: TenantProvisioningJobRow): TenantProvisioningJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    kind: row.kind,
    status: row.status,
    trigger: row.trigger,
    step: row.step,
    attempt: row.attempt,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    details: row.details,
    createdAt: new Date(row.createdAt),
    startedAt: toDate(row.startedAt),
    finishedAt: toDate(row.finishedAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toTenantInstance(
  row: TenantRow,
  latestJob: TenantProvisioningJobRow | null,
  baseDomain: string,
): TenantInstance {
  return {
    id: row.id,
    name: row.name,
    municipalityName: row.municipalityName,
    countryCode: row.countryCode,
    citySlug: row.citySlug,
    shortCode: row.shortCode,
    routingMode: row.routingMode,
    status: row.status,
    pathPrefix: row.pathPrefix,
    dispatcherKey: row.dispatcherKey,
    hostname: row.hostname,
    workerName: row.workerName,
    dispatchScriptName: row.dispatchScriptName,
    tenantD1DatabaseId: row.tenantD1DatabaseId,
    tenantD1DatabaseName: row.tenantD1DatabaseName,
    tenantKvNamespaceId: row.tenantKvNamespaceId,
    tenantKvNamespaceTitle: row.tenantKvNamespaceTitle,
    tenantR2BucketName: row.tenantR2BucketName,
    bootstrapStatus: row.bootstrapStatus,
    lastDeploymentStartedAt: toDate(row.lastDeploymentStartedAt),
    lastDeploymentFinishedAt: toDate(row.lastDeploymentFinishedAt),
    lastDeploymentError: row.lastDeploymentError,
    latestJob: latestJob
      ? {
        id: latestJob.id,
        kind: latestJob.kind,
        status: latestJob.status,
        trigger: latestJob.trigger,
        step: latestJob.step,
        attempt: latestJob.attempt,
        createdAt: new Date(latestJob.createdAt),
        startedAt: toDate(latestJob.startedAt),
        finishedAt: toDate(latestJob.finishedAt),
        errorMessage: latestJob.errorMessage,
      }
      : null,
    notes: row.notes,
    tenantUrl: deriveTenantUrl(row.routingMode, row.pathPrefix, row.hostname, baseDomain),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

async function getOrCreateSettingsRow(db: AppEnv["Variables"]["db"]) {
  const existing = await db
    .select()
    .from(instanceSettings)
    .where(eq(instanceSettings.singletonKey, "default"))
    .then((rows) => rows[0] ?? null);
  if (existing) return existing;

  const now = new Date().toISOString();
  const [created] = await db
    .insert(instanceSettings)
    .values({
      singletonKey: "default",
      experimental: {},
      tenantProvisioning: {},
      cloudflareProvisioning: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created!;
}

async function getTenantProvisioningSettings(db: AppEnv["Variables"]["db"]) {
  const row = await getOrCreateSettingsRow(db);
  return normalizeProvisioningSettings(
    Object.keys(asRecord(row.tenantProvisioning)).length > 0
      ? row.tenantProvisioning
      : asRecord(row.experimental).tenantProvisioning,
  );
}

async function getCloudflareSettings(db: AppEnv["Variables"]["db"], env: AppEnv["Bindings"]) {
  const row = await getOrCreateSettingsRow(db);
  const normalized = normalizeCloudflareSettings(
    Object.keys(asRecord(row.cloudflareProvisioning)).length > 0
      ? row.cloudflareProvisioning
      : asRecord(row.experimental).cloudflareProvisioning,
  );
  return {
    ...normalized,
    apiTokenConfigured: Boolean(env.CLOUDFLARE_API_TOKEN?.trim()),
  };
}

async function updateTenantProvisioningSettings(
  db: AppEnv["Variables"]["db"],
  patch: Partial<ReturnType<typeof tenantProvisioningSettingsSchema.parse>>,
) {
  const current = await getOrCreateSettingsRow(db);
  const next = normalizeProvisioningSettings({
    ...normalizeProvisioningSettings(current.tenantProvisioning),
    ...patch,
  });
  const [updated] = await db
    .update(instanceSettings)
    .set({
      tenantProvisioning: next,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(instanceSettings.id, current.id))
    .returning();
  return updated!;
}

async function updateCloudflareSettings(
  db: AppEnv["Variables"]["db"],
  patch: Partial<CloudflareProvisioningSettings>,
) {
  const current = await getOrCreateSettingsRow(db);
  const next = normalizeCloudflareSettings({
    ...normalizeCloudflareSettings(current.cloudflareProvisioning),
    ...patch,
  });
  const [updated] = await db
    .update(instanceSettings)
    .set({
      cloudflareProvisioning: next as unknown as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(instanceSettings.id, current.id))
    .returning();
  return updated!;
}

async function getTenantRow(db: AppEnv["Variables"]["db"], tenantId: string) {
  return db
    .select()
    .from(tenantInstances)
    .where(eq(tenantInstances.id, tenantId))
    .then((rows) => rows[0] ?? null);
}

async function buildLatestJobsByTenant(db: AppEnv["Variables"]["db"]) {
  const rows = await db.select().from(tenantProvisioningJobs).orderBy(desc(tenantProvisioningJobs.createdAt));
  const latestByTenant = new Map<string, TenantProvisioningJobRow>();
  for (const row of rows) {
    if (!latestByTenant.has(row.tenantId)) {
      latestByTenant.set(row.tenantId, row);
    }
  }
  return latestByTenant;
}

function resolveProvisioner(settings: CloudflareProvisioningSettings, env: AppEnv["Bindings"]): TenantProvisioner {
  if (settings.enabled && env.CLOUDFLARE_API_TOKEN?.trim()) {
    return new CloudflareTenantProvisioner({ apiToken: env.CLOUDFLARE_API_TOKEN });
  }
  return new MockTenantProvisioner();
}

async function createJob(
  db: AppEnv["Variables"]["db"],
  tenantId: string,
  kind: TenantProvisioningJobKind,
  trigger: TenantProvisioningJobTrigger,
) {
  const now = new Date().toISOString();
  const [job] = await db
    .insert(tenantProvisioningJobs)
    .values({
      tenantId,
      kind,
      status: "queued",
      trigger,
      step: "queued",
      attempt: 1,
      details: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return job ?? null;
}

async function selectQueuedJob(db: AppEnv["Variables"]["db"]) {
  return db
    .select()
    .from(tenantProvisioningJobs)
    .where(eq(tenantProvisioningJobs.status, "queued"))
    .orderBy(tenantProvisioningJobs.createdAt)
    .then((rows) => rows[0] ?? null);
}

async function startJob(db: AppEnv["Variables"]["db"], jobId: string) {
  const now = new Date().toISOString();
  const [claimed] = await db
    .update(tenantProvisioningJobs)
    .set({
      status: "running",
      step: "validate_config",
      startedAt: now,
      updatedAt: now,
    })
    .where(and(eq(tenantProvisioningJobs.id, jobId), eq(tenantProvisioningJobs.status, "queued")))
    .returning();
  return claimed ?? null;
}

async function updateJob(
  db: AppEnv["Variables"]["db"],
  jobId: string,
  patch: Partial<TenantProvisioningJobRow>,
) {
  const [updated] = await db
    .update(tenantProvisioningJobs)
    .set({
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tenantProvisioningJobs.id, jobId))
    .returning();
  return updated ?? null;
}

async function processJob(
  db: AppEnv["Variables"]["db"],
  env: AppEnv["Bindings"],
  job: TenantProvisioningJobRow,
) {
  const tenantRow = await getTenantRow(db, job.tenantId);
  if (!tenantRow) {
    await updateJob(db, job.id, {
      status: "failed",
      errorMessage: "Tenant instance not found",
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  const cloudflareSettings = await getCloudflareSettings(db, env);
  const provisioner = resolveProvisioner(cloudflareSettings, env);
  const validation = await provisioner.validate(cloudflareSettings);
  await updateCloudflareSettings(db, {
    apiTokenConfigured: cloudflareSettings.apiTokenConfigured,
    lastValidatedAt: validation.checkedAt,
    lastValidationError: validation.ok ? null : validation.message,
  });

  if (!validation.ok && cloudflareSettings.enabled) {
    const finishedAt = new Date().toISOString();
    await updateJob(db, job.id, {
      status: "failed",
      step: "validate_config",
      errorMessage: validation.message ?? "Cloudflare validation failed",
      finishedAt,
    });
    await db
      .update(tenantInstances)
      .set({
        status: "error",
        lastDeploymentError: validation.message ?? "Cloudflare validation failed",
        lastDeploymentFinishedAt: finishedAt,
        updatedAt: finishedAt,
      })
      .where(eq(tenantInstances.id, tenantRow.id));
    return;
  }

  const startedAt = new Date().toISOString();
  await db
    .update(tenantInstances)
    .set({
      status: "provisioning",
      lastDeploymentStartedAt: startedAt,
      lastDeploymentError: null,
      updatedAt: startedAt,
    })
    .where(eq(tenantInstances.id, tenantRow.id));

  try {
    const resources =
      job.kind === "initial_provision"
        ? await provisioner.provisionTenant(cloudflareSettings, tenantRow)
        : await provisioner.redeployTenant(cloudflareSettings, tenantRow);
    await updateJob(db, job.id, { step: "refresh_routing_cache" });
    await provisioner.refreshRoutingCache(cloudflareSettings, {
      id: tenantRow.id,
      pathPrefix: tenantRow.pathPrefix,
      dispatcherKey: tenantRow.dispatcherKey,
      dispatchScriptName: resources.dispatchScriptName,
      workerName: tenantRow.workerName,
    });

    const finishedAt = new Date().toISOString();
    await db
      .update(tenantInstances)
      .set({
        status: "active",
        dispatchScriptName: resources.dispatchScriptName,
        tenantD1DatabaseId: resources.tenantD1DatabaseId,
        tenantD1DatabaseName: resources.tenantD1DatabaseName,
        tenantKvNamespaceId: resources.tenantKvNamespaceId,
        tenantKvNamespaceTitle: resources.tenantKvNamespaceTitle,
        tenantR2BucketName: resources.tenantR2BucketName,
        lastDeploymentFinishedAt: finishedAt,
        lastDeploymentError: null,
        updatedAt: finishedAt,
      })
      .where(eq(tenantInstances.id, tenantRow.id));

    await updateJob(db, job.id, {
      status: "succeeded",
      step: "finalize",
      finishedAt,
      details: {
        dispatchScriptName: resources.dispatchScriptName,
        tenantD1DatabaseId: resources.tenantD1DatabaseId,
        tenantKvNamespaceId: resources.tenantKvNamespaceId,
        tenantR2BucketName: resources.tenantR2BucketName,
      },
      errorCode: null,
      errorMessage: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tenant provisioning failed";
    const finishedAt = new Date().toISOString();
    await db
      .update(tenantInstances)
      .set({
        status: "error",
        lastDeploymentFinishedAt: finishedAt,
        lastDeploymentError: message,
        updatedAt: finishedAt,
      })
      .where(eq(tenantInstances.id, tenantRow.id));
    await updateJob(db, job.id, {
      status: "failed",
      errorMessage: message,
      finishedAt,
    });
  }
}

async function drainQueuedJobs(db: AppEnv["Variables"]["db"], env: AppEnv["Bindings"]) {
  if (isDrainingTenantProvisioningJobs) return;
  isDrainingTenantProvisioningJobs = true;
  try {
    while (true) {
      const queued = await selectQueuedJob(db);
      if (!queued) break;
      const claimed = await startJob(db, queued.id);
      if (!claimed) continue;
      await processJob(db, env, claimed);
    }
  } finally {
    isDrainingTenantProvisioningJobs = false;
  }
}

function requireTenantId(c: { req: { param(name: string): string | undefined } }) {
  const tenantId = c.req.param("tenantId");
  if (!tenantId) {
    throw new Error("Tenant instance id is required");
  }
  return tenantId;
}

export function instanceSettingsRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/instance-settings", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    return c.json(await getOrCreateSettingsRow(db));
  });

  app.patch("/instance-settings", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = await c.req.json();
    const current = await getOrCreateSettingsRow(db);
    await db
      .update(instanceSettings)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(instanceSettings.id, current.id));
    const [updated] = await db.select().from(instanceSettings).where(eq(instanceSettings.id, current.id));
    return c.json(updated ?? current);
  });

  app.get("/instance/settings/admin-overview", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const env = c.env;
    const [tenantRows, jobs, cloudflareSettings] = await Promise.all([
      db.select().from(tenantInstances),
      db.select().from(tenantProvisioningJobs).orderBy(desc(tenantProvisioningJobs.createdAt)),
      getCloudflareSettings(db, env),
    ]);
    const warnings: string[] = [];
    if (!cloudflareSettings.enabled) warnings.push("Cloudflare provisioning is disabled");
    if (!cloudflareSettings.apiTokenConfigured) warnings.push("Cloudflare API token is not configured");
    if (cloudflareSettings.lastValidationError) warnings.push(cloudflareSettings.lastValidationError);
    const overview: InstanceAdminOverview = {
      generatedAt: new Date(),
      cloudflare: {
        enabled: cloudflareSettings.enabled,
        accountId: cloudflareSettings.accountId,
        zoneName: cloudflareSettings.zoneName,
        publicHostname: cloudflareSettings.publicHostname,
        adminHostname: cloudflareSettings.adminHostname,
        landingHostname: cloudflareSettings.landingHostname,
        dispatchNamespace: cloudflareSettings.dispatchNamespace,
        apiTokenConfigured: cloudflareSettings.apiTokenConfigured,
        lastValidatedAt: cloudflareSettings.lastValidatedAt,
        lastValidationError: cloudflareSettings.lastValidationError,
      },
      tenants: {
        total: tenantRows.length,
        active: tenantRows.filter((tenant) => tenant.status === "active").length,
        provisioning: tenantRows.filter((tenant) => tenant.status === "provisioning").length,
        error: tenantRows.filter((tenant) => tenant.status === "error").length,
        paused: tenantRows.filter((tenant) => tenant.status === "paused").length,
        archived: tenantRows.filter((tenant) => tenant.status === "archived").length,
        bootstrapPending: tenantRows.filter((tenant) => tenant.bootstrapStatus === "pending").length,
      },
      jobs: {
        queued: jobs.filter((job) => job.status === "queued").length,
        running: jobs.filter((job) => job.status === "running").length,
        failed: jobs.filter((job) => job.status === "failed").length,
      },
      warnings,
      recentJobs: jobs.slice(0, 8).map((job) => ({
        id: job.id,
        tenantId: job.tenantId,
        tenantName: tenantRows.find((tenant) => tenant.id === job.tenantId)?.name ?? "Unknown tenant",
        status: job.status,
        step: job.step,
        errorMessage: job.errorMessage,
        createdAt: new Date(job.createdAt),
      })),
    };
    return c.json(overview);
  });

  app.get("/instance/settings/tenant-provisioning", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    return c.json(await getTenantProvisioningSettings(db));
  });

  app.patch("/instance/settings/tenant-provisioning", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = patchTenantProvisioningSettingsSchema.parse(await c.req.json());
    const updated = await updateTenantProvisioningSettings(db, body);
    return c.json(normalizeProvisioningSettings(updated.tenantProvisioning));
  });

  app.get("/instance/settings/cloudflare", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    return c.json(await getCloudflareSettings(db, c.env));
  });

  app.patch("/instance/settings/cloudflare", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = patchCloudflareProvisioningSettingsSchema.parse(await c.req.json());
    await updateCloudflareSettings(db, body);
    return c.json(await getCloudflareSettings(db, c.env));
  });

  app.post("/instance/settings/cloudflare/validate", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const settings = await getCloudflareSettings(db, c.env);
    const provisioner = resolveProvisioner(settings, c.env);
    const validation: CloudflareProvisioningValidationResult = await provisioner.validate(settings);
    await updateCloudflareSettings(db, {
      apiTokenConfigured: settings.apiTokenConfigured,
      lastValidatedAt: validation.checkedAt,
      lastValidationError: validation.ok ? null : validation.message,
    });
    return c.json(validation);
  });

  app.get("/instance/settings/tenants", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const [rows, latestJobs, provisioning] = await Promise.all([
      db.select().from(tenantInstances),
      buildLatestJobsByTenant(db),
      getTenantProvisioningSettings(db),
    ]);
    return c.json(
      rows
        .map((row) => toTenantInstance(row, latestJobs.get(row.id) ?? null, provisioning.baseDomain))
        .sort((left, right) => left.pathPrefix.localeCompare(right.pathPrefix)),
    );
  });

  app.post("/instance/settings/tenants", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    const body = createTenantInstanceSchema.parse(await c.req.json()) as CreateTenantInstance;
    const provisioning = await getTenantProvisioningSettings(db);
    const now = new Date().toISOString();
    const dispatcherKey = deriveTenantDispatcherKey(body.countryCode, body.citySlug, body.shortCode);
    const pathPrefix = deriveTenantPathPrefix(body.countryCode, body.citySlug, body.shortCode);
    const workerName = deriveTenantWorkerName(
      body.countryCode,
      body.citySlug,
      body.shortCode,
      provisioning.workerNameTemplate,
    );

    const [created] = await db
      .insert(tenantInstances)
      .values({
        name: body.name.trim(),
        municipalityName: body.municipalityName.trim(),
        countryCode: body.countryCode.trim().toLowerCase(),
        citySlug: body.citySlug.trim().toLowerCase(),
        shortCode: body.shortCode.trim().toLowerCase(),
        routingMode: body.routingMode ?? provisioning.defaultRoutingMode,
        status: "provisioning",
        pathPrefix,
        dispatcherKey,
        hostname: body.hostname?.trim() || null,
        workerName,
        bootstrapStatus: "pending",
        notes: body.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const job = created ? await createJob(db, created.id, "initial_provision", "tenant_created") : null;
    c.executionCtx.waitUntil(drainQueuedJobs(db, c.env));
    return c.json(toTenantInstance(created!, job, provisioning.baseDomain), 201);
  });

  app.patch("/instance/settings/tenants/:tenantId", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    let tenantId: string;
    try {
      tenantId = requireTenantId(c);
    } catch {
      return c.json({ error: "Tenant instance id is required" }, 400);
    }

    const body = updateTenantInstanceSchema.parse(await c.req.json()) as UpdateTenantInstance;
    const existing = await getTenantRow(db, tenantId);
    if (!existing) {
      return c.json({ error: "Tenant instance not found" }, 404);
    }
    const provisioning = await getTenantProvisioningSettings(db);
    const countryCode = body.countryCode?.trim().toLowerCase() ?? existing.countryCode;
    const citySlug = body.citySlug?.trim().toLowerCase() ?? existing.citySlug;
    const shortCode = body.shortCode?.trim().toLowerCase() ?? existing.shortCode;

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
        pathPrefix: deriveTenantPathPrefix(countryCode, citySlug, shortCode),
        dispatcherKey: deriveTenantDispatcherKey(countryCode, citySlug, shortCode),
        hostname: body.hostname === undefined ? existing.hostname : body.hostname?.trim() || null,
        workerName: deriveTenantWorkerName(countryCode, citySlug, shortCode, provisioning.workerNameTemplate),
        notes: body.notes === undefined ? existing.notes : body.notes?.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantInstances.id, tenantId))
      .returning();

    const latestJobs = await buildLatestJobsByTenant(db);
    return c.json(toTenantInstance(updated!, latestJobs.get(updated!.id) ?? null, provisioning.baseDomain));
  });

  app.get("/instance/settings/tenants/:tenantId/jobs", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    let tenantId: string;
    try {
      tenantId = requireTenantId(c);
    } catch {
      return c.json({ error: "Tenant instance id is required" }, 400);
    }
    const rows = await db
      .select()
      .from(tenantProvisioningJobs)
      .where(eq(tenantProvisioningJobs.tenantId, tenantId))
      .orderBy(desc(tenantProvisioningJobs.createdAt));
    return c.json(rows.map(toTenantProvisioningJob));
  });

  app.post("/instance/settings/tenants/:tenantId/redeploy", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    let tenantId: string;
    try {
      tenantId = requireTenantId(c);
    } catch {
      return c.json({ error: "Tenant instance id is required" }, 400);
    }
    const existing = await getTenantRow(db, tenantId);
    if (!existing) {
      return c.json({ error: "Tenant instance not found" }, 404);
    }
    await db
      .update(tenantInstances)
      .set({
        status: "provisioning",
        lastDeploymentError: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantInstances.id, tenantId));
    await createJob(db, tenantId, "redeploy", "manual_redeploy");
    c.executionCtx.waitUntil(drainQueuedJobs(db, c.env));
    const latestJobs = await buildLatestJobsByTenant(db);
    const updated = await getTenantRow(db, tenantId);
    const provisioning = await getTenantProvisioningSettings(db);
    return c.json(toTenantInstance(updated!, latestJobs.get(updated!.id) ?? null, provisioning.baseDomain));
  });

  app.post("/instance/settings/tenants/:tenantId/pause", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    let tenantId: string;
    try {
      tenantId = requireTenantId(c);
    } catch {
      return c.json({ error: "Tenant instance id is required" }, 400);
    }
    const [updated] = await db
      .update(tenantInstances)
      .set({
        status: "paused",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantInstances.id, tenantId))
      .returning();
    if (!updated) {
      return c.json({ error: "Tenant instance not found" }, 404);
    }
    const latestJobs = await buildLatestJobsByTenant(db);
    const provisioning = await getTenantProvisioningSettings(db);
    return c.json(toTenantInstance(updated, latestJobs.get(updated.id) ?? null, provisioning.baseDomain));
  });

  app.post("/instance/settings/tenants/:tenantId/archive", async (c) => {
    assertBoard(c);
    const db = c.get("db");
    let tenantId: string;
    try {
      tenantId = requireTenantId(c);
    } catch {
      return c.json({ error: "Tenant instance id is required" }, 400);
    }
    const existing = await getTenantRow(db, tenantId);
    if (!existing) {
      return c.json({ error: "Tenant instance not found" }, 404);
    }
    const now = new Date().toISOString();
    await db
      .update(tenantInstances)
      .set({
        status: "archived",
        updatedAt: now,
      })
      .where(eq(tenantInstances.id, tenantId));
    await db.insert(tenantProvisioningJobs).values({
      tenantId,
      kind: "archive",
      status: "succeeded",
      trigger: "manual_archive",
      step: "archive_soft_delete",
      attempt: 1,
      details: { cleanup: "pending" },
      createdAt: now,
      startedAt: now,
      finishedAt: now,
      updatedAt: now,
    });
    const latestJobs = await buildLatestJobsByTenant(db);
    const updated = await getTenantRow(db, tenantId);
    const provisioning = await getTenantProvisioningSettings(db);
    return c.json(toTenantInstance(updated!, latestJobs.get(updated!.id) ?? null, provisioning.baseDomain));
  });

  return app;
}
