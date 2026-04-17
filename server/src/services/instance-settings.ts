import type { Db } from "@paperclipai/db";
import { companies, instanceSettings } from "@paperclipai/db";
import {
  cloudflareProvisioningSettingsSchema,
  type CloudflareProvisioningSettings,
  instanceExperimentalSettingsSchema,
  type InstanceExperimentalSettings,
  type InstanceSettings,
  type PatchCloudflareProvisioningSettings,
  type PatchInstanceExperimentalSettings,
  tenantProvisioningSettingsSchema,
  type PatchTenantProvisioningSettings,
  type TenantProvisioningSettings,
} from "@paperclipai/shared";
import { eq } from "drizzle-orm";

const DEFAULT_SINGLETON_KEY = "default";

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeExperimentalSettings(raw: unknown): InstanceExperimentalSettings {
  const parsed = instanceExperimentalSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) {
    return {
      enableIsolatedWorkspaces: parsed.data.enableIsolatedWorkspaces ?? false,
    };
  }
  return {
    enableIsolatedWorkspaces: false,
  };
}

function normalizeTenantProvisioningSettings(raw: unknown): TenantProvisioningSettings {
  const parsed = tenantProvisioningSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return tenantProvisioningSettingsSchema.parse({});
}

function normalizeCloudflareProvisioningSettings(raw: unknown): CloudflareProvisioningSettings {
  const parsed = cloudflareProvisioningSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return cloudflareProvisioningSettingsSchema.parse({});
}

function toInstanceSettings(row: typeof instanceSettings.$inferSelect): InstanceSettings {
  const experimentalRecord = asRecord(row.experimental);
  const tenantProvisioningRecord = Object.keys(asRecord(row.tenantProvisioning)).length > 0
    ? asRecord(row.tenantProvisioning)
    : asRecord(experimentalRecord.tenantProvisioning);
  const cloudflareProvisioningRecord = Object.keys(asRecord(row.cloudflareProvisioning)).length > 0
    ? asRecord(row.cloudflareProvisioning)
    : asRecord(experimentalRecord.cloudflareProvisioning);
  return {
    id: row.id,
    experimental: normalizeExperimentalSettings(experimentalRecord),
    tenantProvisioning: normalizeTenantProvisioningSettings(tenantProvisioningRecord),
    cloudflareProvisioning: normalizeCloudflareProvisioningSettings(cloudflareProvisioningRecord),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function instanceSettingsService(db: Db) {
  async function getOrCreateRow() {
    const existing = await db
      .select()
      .from(instanceSettings)
      .where(eq(instanceSettings.singletonKey, DEFAULT_SINGLETON_KEY))
      .then((rows) => rows[0] ?? null);
    if (existing) return existing;

    const now = new Date();
    const [created] = await db
        .insert(instanceSettings)
        .values({
          singletonKey: DEFAULT_SINGLETON_KEY,
          experimental: {},
          tenantProvisioning: {},
          cloudflareProvisioning: {},
          createdAt: now,
          updatedAt: now,
        })
      .onConflictDoUpdate({
        target: [instanceSettings.singletonKey],
        set: {
          updatedAt: now,
        },
      })
      .returning();

    return created;
  }

  return {
    get: async (): Promise<InstanceSettings> => toInstanceSettings(await getOrCreateRow()),

    getExperimental: async (): Promise<InstanceExperimentalSettings> => {
      const row = await getOrCreateRow();
      return normalizeExperimentalSettings(row.experimental);
    },

    updateExperimental: async (patch: PatchInstanceExperimentalSettings): Promise<InstanceSettings> => {
      const current = await getOrCreateRow();
      const nextExperimental = normalizeExperimentalSettings({
        ...normalizeExperimentalSettings(current.experimental),
        ...patch,
      });
      const now = new Date();
      const [updated] = await db
        .update(instanceSettings)
        .set({
          experimental: { ...nextExperimental },
          updatedAt: now,
        })
        .where(eq(instanceSettings.id, current.id))
        .returning();
      return toInstanceSettings(updated ?? current);
    },

    getTenantProvisioning: async (): Promise<TenantProvisioningSettings> => {
      const row = await getOrCreateRow();
      const tenantProvisioning = Object.keys(asRecord(row.tenantProvisioning)).length > 0
        ? row.tenantProvisioning
        : asRecord(row.experimental).tenantProvisioning;
      return normalizeTenantProvisioningSettings(tenantProvisioning);
    },

    updateTenantProvisioning: async (patch: PatchTenantProvisioningSettings): Promise<InstanceSettings> => {
      const current = await getOrCreateRow();
      const experimental = asRecord(current.experimental);
      const nextTenantProvisioning = normalizeTenantProvisioningSettings({
        ...normalizeTenantProvisioningSettings(
          Object.keys(asRecord(current.tenantProvisioning)).length > 0
            ? current.tenantProvisioning
            : experimental.tenantProvisioning,
        ),
        ...patch,
      });
      const now = new Date();
      const [updated] = await db
        .update(instanceSettings)
        .set({
          experimental,
          tenantProvisioning: nextTenantProvisioning,
          updatedAt: now,
        })
        .where(eq(instanceSettings.id, current.id))
        .returning();
      return toInstanceSettings(updated ?? current);
    },

    getCloudflareProvisioning: async (): Promise<CloudflareProvisioningSettings> => {
      const row = await getOrCreateRow();
      const cloudflareProvisioning = Object.keys(asRecord(row.cloudflareProvisioning)).length > 0
        ? row.cloudflareProvisioning
        : asRecord(row.experimental).cloudflareProvisioning;
      return normalizeCloudflareProvisioningSettings(cloudflareProvisioning);
    },

    updateCloudflareProvisioning: async (patch: PatchCloudflareProvisioningSettings): Promise<InstanceSettings> => {
      const current = await getOrCreateRow();
      const experimental = asRecord(current.experimental);
      const nextCloudflareProvisioning = normalizeCloudflareProvisioningSettings({
        ...normalizeCloudflareProvisioningSettings(
          Object.keys(asRecord(current.cloudflareProvisioning)).length > 0
            ? current.cloudflareProvisioning
            : experimental.cloudflareProvisioning,
        ),
        ...patch,
      });
      const now = new Date();
      const [updated] = await db
        .update(instanceSettings)
        .set({
          experimental,
          cloudflareProvisioning: nextCloudflareProvisioning as unknown as Record<string, unknown>,
          updatedAt: now,
        })
        .where(eq(instanceSettings.id, current.id))
        .returning();
      return toInstanceSettings(updated ?? current);
    },

    recordCloudflareValidation: async (
      patch: Pick<CloudflareProvisioningSettings, "apiTokenConfigured" | "lastValidatedAt" | "lastValidationError">,
    ): Promise<InstanceSettings> => {
      const current = await getOrCreateRow();
      const experimental = asRecord(current.experimental);
      const nextCloudflareProvisioning = normalizeCloudflareProvisioningSettings({
        ...normalizeCloudflareProvisioningSettings(
          Object.keys(asRecord(current.cloudflareProvisioning)).length > 0
            ? current.cloudflareProvisioning
            : experimental.cloudflareProvisioning,
        ),
        ...patch,
      });
      const now = new Date();
      const [updated] = await db
        .update(instanceSettings)
        .set({
          experimental,
          cloudflareProvisioning: nextCloudflareProvisioning as unknown as Record<string, unknown>,
          updatedAt: now,
        })
        .where(eq(instanceSettings.id, current.id))
        .returning();
      return toInstanceSettings(updated ?? current);
    },

    listCompanyIds: async (): Promise<string[]> =>
      db
        .select({ id: companies.id })
        .from(companies)
        .then((rows) => rows.map((row) => row.id)),
  };
}
