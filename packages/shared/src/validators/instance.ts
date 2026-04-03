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

export const tenantInstanceStatusSchema = z.enum(TENANT_INSTANCE_STATUSES);

export type InstanceExperimentalSettings = z.infer<typeof instanceExperimentalSettingsSchema>;
export type PatchInstanceExperimentalSettings = z.infer<typeof patchInstanceExperimentalSettingsSchema>;
export type TenantProvisioningSettings = z.infer<typeof tenantProvisioningSettingsSchema>;
export type PatchTenantProvisioningSettings = z.infer<typeof patchTenantProvisioningSettingsSchema>;
