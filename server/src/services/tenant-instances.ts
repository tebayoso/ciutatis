import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { tenantInstances, tenantProvisioningJobs } from "@paperclipai/db";
import {
  CloudflareTenantProvisioner,
  MockTenantProvisioner,
  deriveTenantDispatcherKey,
  deriveTenantPathPrefix,
  deriveTenantUrl,
  deriveTenantWorkerName,
  type CloudflareProvisioningValidationResult,
  type CreateTenantInstance,
  type InstanceAdminOverview,
  type TenantInstance,
  type TenantProvisioner,
  type TenantProvisioningJob,
  type TenantProvisioningJobKind,
  type TenantProvisioningJobSummary,
  type TenantProvisioningJobTrigger,
  type UpdateTenantInstance,
} from "@paperclipai/shared";
import { instanceSettingsService } from "./instance-settings.js";

let isDrainingTenantProvisioningJobs = false;

type TenantRow = typeof tenantInstances.$inferSelect;
type TenantProvisioningJobRow = typeof tenantProvisioningJobs.$inferSelect;

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
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    updatedAt: row.updatedAt,
  };
}

function toTenantProvisioningJobSummary(row: TenantProvisioningJobRow | null): TenantProvisioningJobSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    trigger: row.trigger,
    step: row.step,
    attempt: row.attempt,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    errorMessage: row.errorMessage,
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
    lastDeploymentStartedAt: row.lastDeploymentStartedAt,
    lastDeploymentFinishedAt: row.lastDeploymentFinishedAt,
    lastDeploymentError: row.lastDeploymentError,
    latestJob: toTenantProvisioningJobSummary(latestJob),
    notes: row.notes,
    tenantUrl: deriveTenantUrl(row.routingMode, row.pathPrefix, row.hostname, baseDomain),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function buildLatestJobsByTenant(db: Db) {
  const rows = await db
    .select()
    .from(tenantProvisioningJobs)
    .orderBy(desc(tenantProvisioningJobs.createdAt));
  const latestByTenant = new Map<string, TenantProvisioningJobRow>();
  for (const row of rows) {
    if (!latestByTenant.has(row.tenantId)) {
      latestByTenant.set(row.tenantId, row);
    }
  }
  return latestByTenant;
}

export function tenantInstancesService(
  db: Db,
  options?: {
    cloudflareApiToken?: string | null;
  },
) {
  const settings = instanceSettingsService(db);

  function resolveProvisioner(enabled: boolean): TenantProvisioner {
    const apiToken = options?.cloudflareApiToken?.trim();
    if (enabled && apiToken) {
      return new CloudflareTenantProvisioner({ apiToken });
    }
    return new MockTenantProvisioner();
  }

  async function getBaseDomain() {
    return (await settings.getTenantProvisioning()).baseDomain;
  }

  async function getTenantRow(tenantId: string) {
    return db
      .select()
      .from(tenantInstances)
      .where(eq(tenantInstances.id, tenantId))
      .then((rows) => rows[0] ?? null);
  }

  async function createJob(
    tenantId: string,
    kind: TenantProvisioningJobKind,
    trigger: TenantProvisioningJobTrigger,
  ) {
    const now = new Date();
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

  async function selectQueuedJob() {
    return db
      .select()
      .from(tenantProvisioningJobs)
      .where(eq(tenantProvisioningJobs.status, "queued"))
      .orderBy(tenantProvisioningJobs.createdAt)
      .then((rows) => rows[0] ?? null);
  }

  async function startJob(jobId: string) {
    const now = new Date();
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
    jobId: string,
    patch: Partial<TenantProvisioningJobRow>,
  ) {
    const [updated] = await db
      .update(tenantProvisioningJobs)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(tenantProvisioningJobs.id, jobId))
      .returning();
    return updated ?? null;
  }

  async function processJob(job: TenantProvisioningJobRow) {
    const tenantRow = await getTenantRow(job.tenantId);
    if (!tenantRow) {
      await updateJob(job.id, {
        status: "failed",
        errorMessage: "Tenant instance not found",
        finishedAt: new Date(),
      });
      return;
    }

    const cloudflareSettings = await settings.getCloudflareProvisioning();
    const effectiveCloudflareSettings = {
      ...cloudflareSettings,
      apiTokenConfigured: Boolean(options?.cloudflareApiToken?.trim()),
    };
    const provisioner = resolveProvisioner(effectiveCloudflareSettings.enabled);
    const validation = await provisioner.validate(effectiveCloudflareSettings);
    await settings.recordCloudflareValidation({
      apiTokenConfigured: effectiveCloudflareSettings.apiTokenConfigured,
      lastValidatedAt: validation.checkedAt,
      lastValidationError: validation.ok ? null : validation.message,
    });

    if (!validation.ok && effectiveCloudflareSettings.enabled) {
      await updateJob(job.id, {
        status: "failed",
        step: "validate_config",
        errorMessage: validation.message ?? "Cloudflare validation failed",
        finishedAt: new Date(),
      });
      await db
        .update(tenantInstances)
        .set({
          status: "error",
          lastDeploymentError: validation.message ?? "Cloudflare validation failed",
          lastDeploymentFinishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tenantInstances.id, tenantRow.id));
      return;
    }

    const startedAt = new Date();
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
          ? await provisioner.provisionTenant(effectiveCloudflareSettings, tenantRow)
          : await provisioner.redeployTenant(effectiveCloudflareSettings, tenantRow);
      await updateJob(job.id, { step: "refresh_routing_cache" });
      await provisioner.refreshRoutingCache(effectiveCloudflareSettings, {
        id: tenantRow.id,
        pathPrefix: tenantRow.pathPrefix,
        dispatcherKey: tenantRow.dispatcherKey,
        dispatchScriptName: resources.dispatchScriptName,
        workerName: tenantRow.workerName,
      });

      const finishedAt = new Date();
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

      await updateJob(job.id, {
        status: "succeeded",
        step: "finalize",
        finishedAt,
        errorCode: null,
        errorMessage: null,
        details: {
          dispatchScriptName: resources.dispatchScriptName,
          tenantD1DatabaseId: resources.tenantD1DatabaseId,
          tenantKvNamespaceId: resources.tenantKvNamespaceId,
          tenantR2BucketName: resources.tenantR2BucketName,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tenant provisioning failed";
      const finishedAt = new Date();
      await db
        .update(tenantInstances)
        .set({
          status: "error",
          lastDeploymentFinishedAt: finishedAt,
          lastDeploymentError: message,
          updatedAt: finishedAt,
        })
        .where(eq(tenantInstances.id, tenantRow.id));
      await updateJob(job.id, {
        status: "failed",
        errorMessage: message,
        finishedAt,
      });
    }
  }

  async function drainQueuedJobs() {
    if (isDrainingTenantProvisioningJobs) return;
    isDrainingTenantProvisioningJobs = true;
    try {
      while (true) {
        const queued = await selectQueuedJob();
        if (!queued) break;
        const claimed = await startJob(queued.id);
        if (!claimed) continue;
        await processJob(claimed);
      }
    } finally {
      isDrainingTenantProvisioningJobs = false;
    }
  }

  return {
    list: async (): Promise<TenantInstance[]> => {
      const [rows, latestJobs, baseDomain] = await Promise.all([
        db.select().from(tenantInstances),
        buildLatestJobsByTenant(db),
        getBaseDomain(),
      ]);
      return rows
        .map((row) => toTenantInstance(row, latestJobs.get(row.id) ?? null, baseDomain))
        .sort((left, right) => left.pathPrefix.localeCompare(right.pathPrefix));
    },

    create: async (input: CreateTenantInstance): Promise<TenantInstance> => {
      const now = new Date();
      const provisioning = await settings.getTenantProvisioning();
      const dispatcherKey = deriveTenantDispatcherKey(input.countryCode, input.citySlug, input.shortCode);
      const pathPrefix = deriveTenantPathPrefix(input.countryCode, input.citySlug, input.shortCode);
      const workerName = deriveTenantWorkerName(
        input.countryCode,
        input.citySlug,
        input.shortCode,
        provisioning.workerNameTemplate,
      );
      const [created] = await db
        .insert(tenantInstances)
        .values({
          name: input.name.trim(),
          municipalityName: input.municipalityName.trim(),
          countryCode: input.countryCode.trim().toLowerCase(),
          citySlug: input.citySlug.trim().toLowerCase(),
          shortCode: input.shortCode.trim().toLowerCase(),
          routingMode: input.routingMode ?? provisioning.defaultRoutingMode,
          status: "provisioning",
          pathPrefix,
          dispatcherKey,
          hostname: input.hostname?.trim() || null,
          workerName,
          bootstrapStatus: "pending",
          notes: input.notes?.trim() || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const job = created ? await createJob(created.id, "initial_provision", "tenant_created") : null;
      const baseDomain = provisioning.baseDomain;
      return toTenantInstance(created!, job, baseDomain);
    },

    update: async (tenantId: string, patch: UpdateTenantInstance): Promise<TenantInstance | null> => {
      const existing = await getTenantRow(tenantId);
      if (!existing) return null;

      const countryCode = patch.countryCode?.trim().toLowerCase() ?? existing.countryCode;
      const citySlug = patch.citySlug?.trim().toLowerCase() ?? existing.citySlug;
      const shortCode = patch.shortCode?.trim().toLowerCase() ?? existing.shortCode;
      const provisioning = await settings.getTenantProvisioning();
      const dispatcherKey = deriveTenantDispatcherKey(countryCode, citySlug, shortCode);
      const pathPrefix = deriveTenantPathPrefix(countryCode, citySlug, shortCode);
      const workerName = deriveTenantWorkerName(
        countryCode,
        citySlug,
        shortCode,
        provisioning.workerNameTemplate,
      );

      const [updated] = await db
        .update(tenantInstances)
        .set({
          name: patch.name?.trim() ?? existing.name,
          municipalityName: patch.municipalityName?.trim() ?? existing.municipalityName,
          countryCode,
          citySlug,
          shortCode,
          routingMode: patch.routingMode ?? existing.routingMode,
          status: patch.status ?? existing.status,
          pathPrefix,
          dispatcherKey,
          hostname: patch.hostname === undefined ? existing.hostname : patch.hostname?.trim() || null,
          workerName,
          notes: patch.notes === undefined ? existing.notes : patch.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(tenantInstances.id, tenantId))
        .returning();
      if (!updated) return null;
      const latestJobs = await buildLatestJobsByTenant(db);
      return toTenantInstance(updated, latestJobs.get(updated.id) ?? null, provisioning.baseDomain);
    },

    getJobs: async (tenantId: string): Promise<TenantProvisioningJob[]> => {
      const rows = await db
        .select()
        .from(tenantProvisioningJobs)
        .where(eq(tenantProvisioningJobs.tenantId, tenantId))
        .orderBy(desc(tenantProvisioningJobs.createdAt));
      return rows.map(toTenantProvisioningJob);
    },

    enqueueRedeploy: async (tenantId: string): Promise<TenantInstance | null> => {
      const existing = await getTenantRow(tenantId);
      if (!existing) return null;
      const now = new Date();
      await db
        .update(tenantInstances)
        .set({
          status: "provisioning",
          lastDeploymentError: null,
          updatedAt: now,
        })
        .where(eq(tenantInstances.id, tenantId));
      await createJob(tenantId, "redeploy", "manual_redeploy");
      const latestJobs = await buildLatestJobsByTenant(db);
      const updated = await getTenantRow(tenantId);
      const baseDomain = await getBaseDomain();
      return updated ? toTenantInstance(updated, latestJobs.get(updated.id) ?? null, baseDomain) : null;
    },

    pause: async (tenantId: string): Promise<TenantInstance | null> => {
      const [updated] = await db
        .update(tenantInstances)
        .set({
          status: "paused",
          updatedAt: new Date(),
        })
        .where(eq(tenantInstances.id, tenantId))
        .returning();
      if (!updated) return null;
      const latestJobs = await buildLatestJobsByTenant(db);
      const baseDomain = await getBaseDomain();
      return toTenantInstance(updated, latestJobs.get(updated.id) ?? null, baseDomain);
    },

    archive: async (tenantId: string): Promise<TenantInstance | null> => {
      const existing = await getTenantRow(tenantId);
      if (!existing) return null;
      const now = new Date();
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
      const updated = await getTenantRow(tenantId);
      const baseDomain = await getBaseDomain();
      return updated ? toTenantInstance(updated, latestJobs.get(updated.id) ?? null, baseDomain) : null;
    },

    validateCloudflare: async (): Promise<CloudflareProvisioningValidationResult> => {
      const current = await settings.getCloudflareProvisioning();
      const next = {
        ...current,
        apiTokenConfigured: Boolean(options?.cloudflareApiToken?.trim()),
      };
      const provisioner = resolveProvisioner(next.enabled);
      const result = await provisioner.validate(next);
      await settings.recordCloudflareValidation({
        apiTokenConfigured: next.apiTokenConfigured,
        lastValidatedAt: result.checkedAt,
        lastValidationError: result.ok ? null : result.message,
      });
      return result;
    },

    getOverview: async (): Promise<InstanceAdminOverview> => {
      const [tenantList, jobs, currentCloudflareSettings] = await Promise.all([
        db.select().from(tenantInstances),
        db.select().from(tenantProvisioningJobs).orderBy(desc(tenantProvisioningJobs.createdAt)),
        settings.getCloudflareProvisioning(),
      ]);

      const cloudflare = {
        ...currentCloudflareSettings,
        apiTokenConfigured: Boolean(options?.cloudflareApiToken?.trim()),
      };
      const warnings: string[] = [];
      if (!cloudflare.enabled) {
        warnings.push("Cloudflare provisioning is disabled");
      }
      if (!cloudflare.apiTokenConfigured) {
        warnings.push("Cloudflare API token is not configured");
      }
      if (cloudflare.lastValidationError) {
        warnings.push(cloudflare.lastValidationError);
      }

      const recentJobs = jobs.slice(0, 8).map((job) => {
        const tenant = tenantList.find((candidate) => candidate.id === job.tenantId);
        return {
          id: job.id,
          tenantId: job.tenantId,
          tenantName: tenant?.name ?? "Unknown tenant",
          status: job.status,
          step: job.step,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
        };
      });

      return {
        generatedAt: new Date(),
        cloudflare: {
          enabled: cloudflare.enabled,
          accountId: cloudflare.accountId,
          zoneName: cloudflare.zoneName,
          publicHostname: cloudflare.publicHostname,
          adminHostname: cloudflare.adminHostname,
          landingHostname: cloudflare.landingHostname,
          dispatchNamespace: cloudflare.dispatchNamespace,
          apiTokenConfigured: cloudflare.apiTokenConfigured,
          lastValidatedAt: cloudflare.lastValidatedAt,
          lastValidationError: cloudflare.lastValidationError,
        },
        tenants: {
          total: tenantList.length,
          active: tenantList.filter((tenant) => tenant.status === "active").length,
          provisioning: tenantList.filter((tenant) => tenant.status === "provisioning").length,
          error: tenantList.filter((tenant) => tenant.status === "error").length,
          paused: tenantList.filter((tenant) => tenant.status === "paused").length,
          archived: tenantList.filter((tenant) => tenant.status === "archived").length,
          bootstrapPending: tenantList.filter((tenant) => tenant.bootstrapStatus === "pending").length,
        },
        jobs: {
          queued: jobs.filter((job) => job.status === "queued").length,
          running: jobs.filter((job) => job.status === "running").length,
          failed: jobs.filter((job) => job.status === "failed").length,
        },
        warnings,
        recentJobs,
      };
    },

    drainQueuedJobs,
  };
}
