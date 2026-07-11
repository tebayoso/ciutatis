import { z } from "zod";
import { DEFAULT_FEEDBACK_DATA_SHARING_PREFERENCE } from "../types/feedback.js";
import {
  DAILY_RETENTION_PRESETS,
  WEEKLY_RETENTION_PRESETS,
  MONTHLY_RETENTION_PRESETS,
  DEFAULT_BACKUP_RETENTION,
  DEFAULT_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS,
  MAX_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS,
  MIN_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS,
} from "../types/instance.js";
import { feedbackDataSharingPreferenceSchema } from "./feedback.js";
import {
  TENANT_ROUTING_MODES,
  TENANT_INSTANCE_STATUSES,
} from "../constants.js";

function presetSchema<T extends readonly number[]>(presets: T, label: string) {
  return z.number().refine(
    (v): v is T[number] => (presets as readonly number[]).includes(v),
    { message: `${label} must be one of: ${presets.join(", ")}` },
  );
}

export const backupRetentionPolicySchema = z.object({
  dailyDays: presetSchema(DAILY_RETENTION_PRESETS, "dailyDays").default(DEFAULT_BACKUP_RETENTION.dailyDays),
  weeklyWeeks: presetSchema(WEEKLY_RETENTION_PRESETS, "weeklyWeeks").default(DEFAULT_BACKUP_RETENTION.weeklyWeeks),
  monthlyMonths: presetSchema(MONTHLY_RETENTION_PRESETS, "monthlyMonths").default(DEFAULT_BACKUP_RETENTION.monthlyMonths),
});

export const instanceGeneralSettingsSchema = z.object({
  censorUsernameInLogs: z.boolean().default(false),
  keyboardShortcuts: z.boolean().default(false),
  feedbackDataSharingPreference: feedbackDataSharingPreferenceSchema.default(
    DEFAULT_FEEDBACK_DATA_SHARING_PREFERENCE,
  ),
  backupRetention: backupRetentionPolicySchema.default(DEFAULT_BACKUP_RETENTION),
  // Execution policy. Absent/"any" = unrestricted; "kubernetes" forces the
  // Kubernetes sandbox provider and denies local/ssh execution (cloud_tenant).
  executionMode: z.enum(["kubernetes", "any"]).optional(),
}).strict();

export const patchInstanceGeneralSettingsSchema = instanceGeneralSettingsSchema.partial();

export const instanceExperimentalSettingsSchema = z.object({
  enableEnvironments: z.boolean().default(false),
  enableIsolatedWorkspaces: z.boolean().default(false),
  enableStreamlinedLeftNavigation: z.boolean().default(true),
  enablePipelines: z.boolean().default(false),
  enableCases: z.boolean().default(false),
  enableConferenceRoomChat: z.boolean().default(false),
  enableTaskWatchdogs: z.boolean().default(false),
  enableIssuePlanDecompositions: z.boolean().default(false),
  enableExperimentalFileViewer: z.boolean().default(false),
  enableCloudSync: z.boolean().default(false),
  enableExternalObjects: z.boolean().default(false),
  enableBuiltInAgents: z.boolean().default(false),
  enableDecisions: z.boolean().default(false),
  enableGoalsSidebarLink: z.boolean().default(false),
  enableServerInfoDebugView: z.boolean().default(false),
  autoRestartDevServerWhenIdle: z.boolean().default(false),
  enableIssueGraphLivenessAutoRecovery: z.boolean().default(false),
  enableWorkspaceBranchReconcileForward: z.boolean().default(true),
  enableWorkspaceDirtyQuarantineRepair: z.boolean().default(true),
  enableWorktreeRunExecution: z.boolean().default(false),
  worktreeRunExecutionActivatedAt: z.string().datetime().nullable().default(null),
  worktreeRunExecutionActivationInstanceId: z.string().min(1).nullable().default(null),
  issueGraphLivenessAutoRecoveryLookbackHours: z
    .number()
    .int()
    .min(MIN_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS)
    .max(MAX_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS)
    .default(DEFAULT_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS),
}).strict();

export const patchInstanceExperimentalSettingsSchema = instanceExperimentalSettingsSchema
  .omit({
    worktreeRunExecutionActivatedAt: true,
    worktreeRunExecutionActivationInstanceId: true,
  })
  .partial()
  .strip();

export const patchInstanceSettingsSchema = z.object({
  defaultEnvironmentId: z.string().uuid().nullable().optional(),
}).strict();

export const issueGraphLivenessAutoRecoveryRequestSchema = z.object({
  lookbackHours: z
    .number()
    .int()
    .min(MIN_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS)
    .max(MAX_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS)
    .optional(),
}).strict();

export type InstanceGeneralSettings = z.infer<typeof instanceGeneralSettingsSchema>;
export type PatchInstanceGeneralSettings = z.infer<typeof patchInstanceGeneralSettingsSchema>;
export type InstanceExperimentalSettings = z.infer<typeof instanceExperimentalSettingsSchema>;
export type PatchInstanceExperimentalSettings = z.infer<typeof patchInstanceExperimentalSettingsSchema>;
export type PatchInstanceSettings = z.infer<typeof patchInstanceSettingsSchema>;
export type IssueGraphLivenessAutoRecoveryRequest = z.infer<
  typeof issueGraphLivenessAutoRecoveryRequestSchema
>;

export const instanceSettingsSchema = z.object({
  id: z.string().uuid(),
  defaultEnvironmentId: z.string().uuid().nullable(),
  general: instanceGeneralSettingsSchema,
  experimental: instanceExperimentalSettingsSchema,
  createdAt: z.union([z.date(), z.string().datetime()]),
  updatedAt: z.union([z.date(), z.string().datetime()]),
}).strict();

// --- Ciutatis tenant / Cloudflare provisioning validators ---
export const tenantProvisioningSettingsSchema = z.object({
  baseDomain: z.string().trim().min(1).default("ciutatis.com"),
  pathTemplate: z.string().trim().min(1).default("/{countryCode}/{jurisdictionType}/{routeSegment}"),
  workerNameTemplate: z.string().trim().min(1).default("ciutatis-{countryCode}-{jurisdictionType}-{routeSegment}"),
  defaultRoutingMode: z.enum(TENANT_ROUTING_MODES).default("path"),
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

export type TenantProvisioningSettings = z.infer<typeof tenantProvisioningSettingsSchema>;

export type PatchTenantProvisioningSettings = z.infer<typeof patchTenantProvisioningSettingsSchema>;

export type CloudflareProvisioningSettings = z.infer<typeof cloudflareProvisioningSettingsSchema>;

export type PatchCloudflareProvisioningSettings = z.infer<typeof patchCloudflareProvisioningSettingsSchema>;

export type CloudflareProvisioningValidationResult = z.infer<typeof cloudflareProvisioningValidationResultSchema>;
