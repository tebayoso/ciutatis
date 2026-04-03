import { eq } from "drizzle-orm";
import type { Db } from "@ciutatis/db";
import { tenantInstances } from "@ciutatis/db";
import type { CreateTenantInstance, TenantInstance, UpdateTenantInstance } from "@ciutatis/shared";

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

function deriveTenantUrl(row: typeof tenantInstances.$inferSelect) {
  if (row.routingMode === "custom_domain" && row.hostname) {
    return `https://${row.hostname}`;
  }
  if (row.routingMode === "subdomain" && row.hostname) {
    return `https://${row.hostname}`;
  }
  return `https://ciutatis.com${row.pathPrefix}`;
}

function toTenantInstance(row: typeof tenantInstances.$inferSelect): TenantInstance {
  return {
    id: row.id,
    name: row.name,
    municipalityName: row.municipalityName,
    countryCode: row.countryCode,
    citySlug: row.citySlug,
    shortCode: row.shortCode,
    routingMode: row.routingMode as TenantInstance["routingMode"],
    status: row.status as TenantInstance["status"],
    pathPrefix: row.pathPrefix,
    hostname: row.hostname,
    workerName: row.workerName,
    notes: row.notes,
    tenantUrl: deriveTenantUrl(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function tenantInstancesService(db: Db) {
  return {
    list: async (): Promise<TenantInstance[]> => {
      const rows = await db.select().from(tenantInstances);
      return rows.map(toTenantInstance).sort((a, b) => a.pathPrefix.localeCompare(b.pathPrefix));
    },

    create: async (input: CreateTenantInstance): Promise<TenantInstance> => {
      const now = new Date();
      const routingMode = input.routingMode ?? "path";
      const pathPrefix = derivePathPrefix(input.countryCode, input.citySlug, input.shortCode);
      const workerName = deriveWorkerName(input.countryCode, input.citySlug, input.shortCode);
      const [created] = await db
        .insert(tenantInstances)
        .values({
          name: input.name.trim(),
          municipalityName: input.municipalityName.trim(),
          countryCode: normalizeCountryCode(input.countryCode),
          citySlug: normalizeCitySlug(input.citySlug),
          shortCode: normalizeShortCode(input.shortCode),
          routingMode,
          status: "provisioning",
          pathPrefix,
          hostname: input.hostname?.trim() || null,
          workerName,
          notes: input.notes?.trim() || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return toTenantInstance(created!);
    },

    update: async (tenantId: string, patch: UpdateTenantInstance): Promise<TenantInstance | null> => {
      const existing = await db
        .select()
        .from(tenantInstances)
        .where(eq(tenantInstances.id, tenantId))
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      const countryCode = patch.countryCode ? normalizeCountryCode(patch.countryCode) : existing.countryCode;
      const citySlug = patch.citySlug ? normalizeCitySlug(patch.citySlug) : existing.citySlug;
      const shortCode = patch.shortCode ? normalizeShortCode(patch.shortCode) : existing.shortCode;
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
          pathPrefix: derivePathPrefix(countryCode, citySlug, shortCode),
          hostname: patch.hostname === undefined ? existing.hostname : patch.hostname?.trim() || null,
          workerName: deriveWorkerName(countryCode, citySlug, shortCode),
          notes: patch.notes === undefined ? existing.notes : patch.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(tenantInstances.id, tenantId))
        .returning();
      return updated ? toTenantInstance(updated) : null;
    },
  };
}
