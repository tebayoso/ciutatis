import type { Db } from "@ciutatis/db";
import { companies, instanceSettings } from "@ciutatis/db";
import {
  instanceExperimentalSettingsSchema,
  type InstanceExperimentalSettings,
  type InstanceSettings,
  type PatchInstanceExperimentalSettings,
  tenantProvisioningSettingsSchema,
  type PatchTenantProvisioningSettings,
  type TenantProvisioningSettings,
} from "@ciutatis/shared";
import { eq } from "drizzle-orm";

const DEFAULT_SINGLETON_KEY = "default";

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

function toInstanceSettings(row: typeof instanceSettings.$inferSelect): InstanceSettings {
  const experimentalRecord = typeof row.experimental === "object" && row.experimental !== null
    ? (row.experimental as Record<string, unknown>)
    : {};
  return {
    id: row.id,
    experimental: normalizeExperimentalSettings(experimentalRecord),
    tenantProvisioning: normalizeTenantProvisioningSettings(experimentalRecord.tenantProvisioning),
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
      const experimental = typeof row.experimental === "object" && row.experimental !== null
        ? (row.experimental as Record<string, unknown>)
        : {};
      return normalizeTenantProvisioningSettings(experimental.tenantProvisioning);
    },

    updateTenantProvisioning: async (patch: PatchTenantProvisioningSettings): Promise<InstanceSettings> => {
      const current = await getOrCreateRow();
      const experimental = typeof current.experimental === "object" && current.experimental !== null
        ? (current.experimental as Record<string, unknown>)
        : {};
      const nextTenantProvisioning = normalizeTenantProvisioningSettings({
        ...normalizeTenantProvisioningSettings(experimental.tenantProvisioning),
        ...patch,
      });
      const now = new Date();
      const [updated] = await db
        .update(instanceSettings)
        .set({
          experimental: {
            ...experimental,
            tenantProvisioning: nextTenantProvisioning,
          },
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
