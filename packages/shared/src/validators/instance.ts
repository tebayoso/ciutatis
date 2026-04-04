import { z } from "zod";
import { TENANT_INSTANCE_STATUSES } from "../constants.js";

export const TENANT_DEFAULT_ROUTING_MODES = ["path", "subdomain", "custom_domain"] as const;

export const instanceExperimentalSettingsSchema = z.object({
  enableIsolatedWorkspaces: z.boolean().default(false),
}).strict();

export const patchInstanceExperimentalSettingsSchema = instanceExperimentalSettingsSchema.partial();

export const tenantProvisioningSettingsSchema = z.object({
  baseDomain: z.string().trim().min(1).default("ciutatis.com"),
  pathTemplate: z.string().trim().min(1).default("/{countryCode}/{citySlug}-{shortCode}"),
  workerNameTemplate: z.string().trim().min(1).default("ciutatis-{countryCode}-{citySlug}-{shortCode}"),
  defaultRoutingMode: z.enum(TENANT_DEFAULT_ROUTING_MODES).default("path"),
}).strict();

export const patchTenantProvisioningSettingsSchema = tenantProvisioningSettingsSchema.partial();

export const cloudflareProvisioningSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  accountId: z.string().trim().default(""),
  zoneId: z.string().trim().default(""),
  zoneName: z.string().trim().default("ciutatis.com"),
  publicHostname: z.string().trim().default("ciutatis.com"),
  adminHostname: z.string().trim().default("admin.ciutatis.com"),
  landingHostname: z.string().trim().default("ciutatis.com"),
  dispatchNamespace: z.string().trim().default("ciutatis-tenants"),
  routingKvNamespaceId: z.string().trim().default(""),
  routingKvNamespaceTitle: z.string().trim().nullable().default(null),
  tenantWorkerScriptPrefix: z.string().trim().default("ciutatis-tenant"),
  tenantDatabasePrefix: z.string().trim().default("ciutatis-tenant-db"),
  tenantBucketPrefix: z.string().trim().default("ciutatis-tenant-r2"),
  tenantKvPrefix: z.string().trim().default("ciutatis-tenant-kv"),
  apiTokenConfigured: z.boolean().default(false),
  lastValidatedAt: z.coerce.date().nullable().default(null),
  lastValidationError: z.string().trim().nullable().default(null),
}).strict();

export const patchCloudflareProvisioningSettingsSchema = cloudflareProvisioningSettingsSchema
  .omit({
    apiTokenConfigured: true,
    lastValidatedAt: true,
    lastValidationError: true,
  })
  .partial();

export const cloudflareProvisioningValidationResultSchema = z.object({
  ok: z.boolean(),
  checkedAt: z.coerce.date(),
  accountReachable: z.boolean(),
  zoneReachable: z.boolean(),
  dispatchNamespaceReachable: z.boolean(),
  routingKvReachable: z.boolean(),
  message: z.string().trim().nullable(),
}).strict();

export const tenantInstanceStatusSchema = z.enum(TENANT_INSTANCE_STATUSES);

export type InstanceExperimentalSettings = z.infer<typeof instanceExperimentalSettingsSchema>;
export type PatchInstanceExperimentalSettings = z.infer<typeof patchInstanceExperimentalSettingsSchema>;
export type TenantProvisioningSettings = z.infer<typeof tenantProvisioningSettingsSchema>;
export type PatchTenantProvisioningSettings = z.infer<typeof patchTenantProvisioningSettingsSchema>;
export type CloudflareProvisioningSettings = z.infer<typeof cloudflareProvisioningSettingsSchema>;
export type PatchCloudflareProvisioningSettings = z.infer<typeof patchCloudflareProvisioningSettingsSchema>;
export type CloudflareProvisioningValidationResult = z.infer<typeof cloudflareProvisioningValidationResultSchema>;
