import { z } from "zod";

export const ISSUE_CONTINUATION_SUMMARY_DOCUMENT_KEY = "";
export const MODEL_PROFILE_KEYS: string[] = [];

export function isEnvironmentDriverSupportedForAdapter(): boolean {
  return false;
}

export type ModelProfileKey = string;
export type IssueExecutionMonitorClearReason = string;
// Upstream-only: issue execution monitoring policy (feature removed from Ciutatis)
export interface IssueExecutionMonitorPolicy {
  timeoutAt?: string | null;
  maxAttempts?: number | null;
  recoveryPolicy?: IssueExecutionMonitorRecoveryPolicy | null;
  serviceName?: string | null;
}
export type IssueExecutionMonitorRecoveryPolicy = string;

export type CompanyPortabilityEnvInput = Record<string, unknown>;
export type CompanyPortabilityFileEntry = Record<string, unknown>;
export type CompanyPortabilityExportPreviewResult = Record<string, unknown>;
export type CompanyPortabilityIssueCommentManifestEntry = Record<string, unknown>;
export type CompanyPortabilityProjectManifestEntry = Record<string, unknown>;
export type CompanyPortabilityProjectWorkspaceManifestEntry = Record<string, unknown>;
export type CompanyPortabilityIssueRoutineManifestEntry = Record<string, unknown>;
export type CompanyPortabilityIssueRoutineTriggerManifestEntry = Record<string, unknown>;
export type CompanyPortabilityIssueManifestEntry = Record<string, unknown>;
export type CompanyPortabilitySidebarOrder = Record<string, unknown>;
export type CompanySkill = Record<string, unknown>;
export type RoutineVariable = Record<string, unknown>;

export const ROUTINE_CATCH_UP_POLICIES: string[] = [];
export const ROUTINE_CONCURRENCY_POLICIES: string[] = [];
export const ROUTINE_STATUSES: string[] = [];
export const ROUTINE_TRIGGER_KINDS: string[] = [];
export const ROUTINE_TRIGGER_SIGNING_MODES: string[] = [];

// Upstream-only environment constants (not used in Ciutatis V1)
export const ENVIRONMENT_DRIVERS = ["local", "ssh", "sandbox", "plugin"] as const;
export const ENVIRONMENT_LEASE_CLEANUP_STATUSES = ["success", "failed"] as const;
export const ENVIRONMENT_LEASE_POLICIES = ["ephemeral", "reuse_by_environment", "retain_on_failure", "retain"] as const;
export const ENVIRONMENT_LEASE_STATUSES = ["active", "pending", "ready", "error", "released", "failed", "expired", "retained"] as const;
export const ENVIRONMENT_STATUSES = ["active", "inactive", "error"] as const;

// Upstream-only types for environment system
export type EnvironmentDriver = typeof ENVIRONMENT_DRIVERS[number];
export type LocalEnvironmentConfig = Record<string, unknown>;
export type PluginEnvironmentConfig = Record<string, unknown>;
export type PluginSandboxEnvironmentConfig = Record<string, unknown>;
export type SshEnvironmentConfig = Record<string, unknown>;
export type CreateEnvironment = Record<string, unknown>;
export type UpdateEnvironment = Record<string, unknown>;
export type EnvironmentLeaseCleanupStatus = typeof ENVIRONMENT_LEASE_CLEANUP_STATUSES[number];
export type EnvironmentLeasePolicy = typeof ENVIRONMENT_LEASE_POLICIES[number];

// Upstream-only execution workspace types
export type ExecutionWorkspaceSummary = Record<string, unknown>;
export interface ExecutionWorkspaceCloseAction {
  kind: string;
  label: string;
  description: string;
  command: string | null;
}
export type ExecutionWorkspaceCloseGitReadiness = Record<string, unknown>;
export type ExecutionWorkspaceCloseReadiness = Record<string, unknown>;

// Upstream-only document types
export function isSystemIssueDocumentKey(_key?: string): boolean {
  return false;
}

// Upstream-only user profile types
export type UserProfileDailyPoint = Record<string, unknown>;
export type UserProfileIdentity = Record<string, unknown>;
export type UserProfileResponse = Record<string, unknown>;
export type UserProfileWindowStats = Record<string, unknown>;

// Upstream-only issue reference types
export type IssueReferenceSourceKind = "title" | "description" | "document" | "comment";

export interface IssueReferenceSource {
  kind: IssueReferenceSourceKind;
  sourceRecordId: string | null;
  label: string;
  matchedText: string | null;
}

export interface IssueRelatedWorkItem {
  issue: IssueRelationIssueSummary;
  mentionCount: number;
  sources: IssueReferenceSource[];
}

export interface IssueRelatedWorkSummary {
  outbound: IssueRelatedWorkItem[];
  inbound: IssueRelatedWorkItem[];
}
export { extractIssueReferenceMatches, type IssueReferenceMatch } from "./issue-references.js";

// Upstream-only instance settings constants
export const DEFAULT_FEEDBACK_DATA_SHARING_PREFERENCE = "";
export const DEFAULT_BACKUP_RETENTION = 0;
export type PatchInstanceGeneralSettings = Record<string, unknown>;
export const instanceGeneralSettingsSchema = z.object({}).passthrough();

export const telemetryEventSchema = z.object({}).passthrough();

export {
  PUBLIC_PORTAL_LOCALES,
  PUBLIC_SUBMISSION_MODES,
  PUBLIC_REQUEST_CATEGORIES,
  PUBLIC_REQUEST_STATUSES,
  PUBLIC_REQUEST_UPDATE_KINDS,
  slugifyPublicText,
  buildInstitutionPortalSlug,
  redactPublicText,
  buildPublicSummary,
  derivePublicRequestStatus,
  createPublicRequestId,
  type PublicPortalLocale,
  type PublicSubmissionMode,
  type PublicRequestCategory,
  type PublicRequestStatus,
  type PublicRequestUpdateKind,
} from "./public-portal.js";

export {
  INSTITUTION_STATUSES,
  type InstitutionStatus,
  COMPANY_STATUSES,
  type CompanyStatus,
  DEPLOYMENT_MODES,
  DEPLOYMENT_EXPOSURES,
  AUTH_BASE_URL_MODES,
  TENANT_ROUTING_MODES,
  TENANT_INSTANCE_STATUSES,
  TENANT_BOOTSTRAP_STATUSES,
  TENANT_PROVISIONING_JOB_KINDS,
  TENANT_PROVISIONING_JOB_STATUSES,
  TENANT_PROVISIONING_JOB_TRIGGERS,
  TENANT_PROVISIONING_STEPS,
  AGENT_STATUSES,
  AGENT_ADAPTER_TYPES,
  AGENT_ROLES,
  AGENT_ROLE_LABELS,
  AGENT_ICON_NAMES,
  REQUEST_STATUSES,
  type RequestStatus,
  REQUEST_PRIORITIES,
  type RequestPriority,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  OBJECTIVE_LEVELS,
  type ObjectiveLevel,
  OBJECTIVE_STATUSES,
  type ObjectiveStatus,
  GOAL_LEVELS,
  GOAL_STATUSES,
  PROJECT_STATUSES,
  PAUSE_REASONS,
  PROJECT_COLORS,
  APPROVAL_TYPES,
  APPROVAL_STATUSES,
  SECRET_PROVIDERS,
  STORAGE_PROVIDERS,
  BILLING_TYPES,
  FINANCE_EVENT_KINDS,
  FINANCE_DIRECTIONS,
  FINANCE_UNITS,
  BUDGET_SCOPE_TYPES,
  BUDGET_METRICS,
  BUDGET_WINDOW_KINDS,
  BUDGET_THRESHOLD_TYPES,
  BUDGET_INCIDENT_STATUSES,
  BUDGET_INCIDENT_RESOLUTION_ACTIONS,
  HEARTBEAT_INVOCATION_SOURCES,
  HEARTBEAT_RUN_STATUSES,
  WAKEUP_TRIGGER_DETAILS,
  WAKEUP_REQUEST_STATUSES,
  LIVE_EVENT_TYPES,
  PRINCIPAL_TYPES,
  MEMBERSHIP_STATUSES,
  INSTANCE_USER_ROLES,
  INVITE_TYPES,
  INVITE_JOIN_TYPES,
  JOIN_REQUEST_TYPES,
  JOIN_REQUEST_STATUSES,
  PERMISSION_KEYS,
  PLUGIN_API_VERSION,
  PLUGIN_STATUSES,
  PLUGIN_CATEGORIES,
  PLUGIN_CAPABILITIES,
  PLUGIN_UI_SLOT_TYPES,
  PLUGIN_UI_SLOT_ENTITY_TYPES,
  PLUGIN_LAUNCHER_PLACEMENT_ZONES,
  PLUGIN_LAUNCHER_ACTIONS,
  PLUGIN_LAUNCHER_BOUNDS,
  PLUGIN_LAUNCHER_RENDER_ENVIRONMENTS,
  PLUGIN_STATE_SCOPE_KINDS,
  PLUGIN_JOB_STATUSES,
  PLUGIN_JOB_RUN_STATUSES,
  PLUGIN_JOB_RUN_TRIGGERS,
  PLUGIN_WEBHOOK_DELIVERY_STATUSES,
  PLUGIN_EVENT_TYPES,
  PLUGIN_BRIDGE_ERROR_CODES,
  type DeploymentMode,
  type DeploymentExposure,
  type AuthBaseUrlMode,
  type TenantRoutingMode,
  type TenantInstanceStatus,
  type TenantBootstrapStatus,
  type TenantProvisioningJobKind,
  type TenantProvisioningJobStatus,
  type TenantProvisioningJobTrigger,
  type TenantProvisioningStep,
  type AgentStatus,
  type AgentAdapterType,
  type AgentRole,
  type AgentIconName,
  type IssueStatus,
  type IssuePriority,
  type GoalLevel,
  type GoalStatus,
  type ProjectStatus,
  type PauseReason,
  type ApprovalType,
  type ApprovalStatus,
  type SecretProvider,
  type StorageProvider,
  type BillingType,
  type FinanceEventKind,
  type FinanceDirection,
  type FinanceUnit,
  type BudgetScopeType,
  type BudgetMetric,
  type BudgetWindowKind,
  type BudgetThresholdType,
  type BudgetIncidentStatus,
  type BudgetIncidentResolutionAction,
  type HeartbeatInvocationSource,
  type HeartbeatRunStatus,
  type WakeupTriggerDetail,
  type WakeupRequestStatus,
  type LiveEventType,
  type PrincipalType,
  type MembershipStatus,
  type InstanceUserRole,
  type InviteType,
  type InviteJoinType,
  type JoinRequestType,
  type JoinRequestStatus,
  type PermissionKey,
  type PluginStatus,
  type PluginCategory,
  type PluginCapability,
  type PluginUiSlotType,
  type PluginUiSlotEntityType,
  type PluginLauncherPlacementZone,
  type PluginLauncherAction,
  type PluginLauncherBounds,
  type PluginLauncherRenderEnvironment,
  type PluginStateScopeKind,
  type PluginJobStatus,
  type PluginJobRunStatus,
  type PluginJobRunTrigger,
  type PluginWebhookDeliveryStatus,
  type PluginEventType,
  type PluginBridgeErrorCode,
} from "./constants.js";

export type {
  Institution,
  Company,
  PublicContactSubmission,
  PublicContactLocale,
  PublicInstitutionSummary,
  PublicRequestSummary,
  PublicRequestUpdate,
  PublicRequestDetail,
  PublicRequestCreateInput,
  PublicRequestCreateResult,
  PublicRequestCommentInput,
  TenantInstance,
  TenantProvisioningJobSummary,
  InstanceExperimentalSettings,
  InstanceSettings,
  InstanceGeneralSettings,
  CloudflareProvisioningSettings,
  CloudflareProvisioningValidationResult,
  InstanceAdminOverview,
  TenantProvisioningJob,
  Agent,
  AgentPermissions,
  AgentKeyCreated,
  AgentConfigRevision,
  AdapterEnvironmentCheckLevel,
  AdapterEnvironmentTestStatus,
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestResult,
  AssetImage,
  Project,
  ProjectCodebase,
  ProjectCodebaseOrigin,
  ProjectGoalRef,
  ProjectWorkspace,
  ExecutionWorkspace,
  WorkspaceRuntimeService,
  WorkspaceOperation,
  WorkspaceOperationPhase,
  WorkspaceOperationStatus,
  ExecutionWorkspaceStrategyType,
  ExecutionWorkspaceMode,
  ExecutionWorkspaceProviderType,
  ExecutionWorkspaceStatus,
  ExecutionWorkspaceStrategy,
  ProjectExecutionWorkspacePolicy,
  ProjectExecutionWorkspaceDefaultMode,
  RequestWorkProduct,
  RequestWorkProductType,
  RequestWorkProductProvider,
  RequestWorkProductStatus,
  RequestWorkProductReviewState,
  IssueWorkProduct,
  IssueWorkProductType,
  IssueWorkProductProvider,
  IssueWorkProductStatus,
  IssueWorkProductReviewState,
  Request,
  RequestAssigneeAdapterOverrides,
  RequestComment,
  RequestDocument,
  RequestDocumentSummary,
  RequestAttachment,
  RequestLabel,
  Issue,
  IssueAssigneeAdapterOverrides,
  IssueComment,
  IssueDocument,
  IssueDocumentSummary,
  IssueAttachment,
  IssueLabel,
  DocumentRevision,
  DocumentFormat,
  LegacyPlanDocument,
  Objective,
  Goal,
  Approval,
  ApprovalComment,
  BudgetPolicy,
  BudgetPolicySummary,
  BudgetIncident,
  BudgetOverview,
  BudgetPolicyUpsertInput,
  BudgetIncidentResolutionInput,
  CostEvent,
  CostSummary,
  CostByAgent,
  CostByProviderModel,
  CostByBiller,
  CostByAgentModel,
  CostWindowSpendRow,
  CostByProject,
  FinanceEvent,
  FinanceSummary,
  FinanceByBiller,
  FinanceByKind,
  HeartbeatRun,
  HeartbeatRunEvent,
  AgentRuntimeState,
  AgentTaskSession,
  AgentWakeupRequest,
  InstanceSchedulerHeartbeatAgent,
  LiveEvent,
  DashboardSummary,
  ActivityEvent,
  SidebarBadges,
  InstitutionMembership,
  CompanyMembership,
  PrincipalPermissionGrant,
  Invite,
  JoinRequest,
  InstanceUserRoleGrant,
  InstitutionPortabilityInclude,
  InstitutionPortabilitySecretRequirement,
  InstitutionPortabilityInstitutionManifestEntry,
  InstitutionPortabilityAgentManifestEntry,
  InstitutionPortabilityManifest,
  InstitutionPortabilityExportResult,
  InstitutionPortabilitySource,
  InstitutionPortabilityImportTarget,
  InstitutionPortabilityAgentSelection,
  InstitutionPortabilityCollisionStrategy,
  InstitutionPortabilityPreviewRequest,
  InstitutionPortabilityPreviewAgentPlan,
  InstitutionPortabilityPreviewResult,
  InstitutionPortabilityImportRequest,
  InstitutionPortabilityImportResult,
  InstitutionPortabilityExportRequest,
  CompanyPortabilityInclude,
  CompanyPortabilitySecretRequirement,
  CompanyPortabilityCompanyManifestEntry,
  CompanyPortabilityAgentManifestEntry,
  CompanyPortabilityManifest,
  CompanyPortabilityExportResult,
  CompanyPortabilitySource,
  CompanyPortabilityImportTarget,
  CompanyPortabilityAgentSelection,
  CompanyPortabilityCollisionStrategy,
  CompanyPortabilityPreviewRequest,
  CompanyPortabilityPreviewAgentPlan,
  CompanyPortabilityPreviewResult,
  CompanyPortabilityImportRequest,
  CompanyPortabilityImportResult,
  CompanyPortabilityExportRequest,
  EnvBinding,
  AgentEnvConfig,
  InstitutionSecret,
  CompanySecret,
  SecretProviderDescriptor,
  JsonSchema,
  PluginJobDeclaration,
  PluginWebhookDeclaration,
  PluginToolDeclaration,
  PluginUiSlotDeclaration,
  PluginLauncherActionDeclaration,
  PluginLauncherRenderDeclaration,
  PluginLauncherRenderContextSnapshot,
  PluginLauncherDeclaration,
  PluginMinimumHostVersion,
  PluginUiDeclaration,
  PluginRecord,
  PluginStateRecord,
  PluginConfig,
  PluginEntityRecord,
  PluginEntityQuery,
  PluginJobRecord,
  PluginJobRunRecord,
  PluginWebhookDeliveryRecord,
  QuotaWindow,
  ProviderQuotaResult,
} from "./types/index.js";

import type { CiutatisPluginManifestV1 } from "./types/index.js";
export type { CiutatisPluginManifestV1 };
export type PaperclipPluginManifestV1 = CiutatisPluginManifestV1;

export type PluginApiRouteDeclaration = {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  handler: string;
  description?: string;
};

export {
  instanceExperimentalSettingsSchema,
  patchInstanceExperimentalSettingsSchema,
  tenantProvisioningSettingsSchema,
  patchTenantProvisioningSettingsSchema,
  cloudflareProvisioningSettingsSchema,
  patchCloudflareProvisioningSettingsSchema,
  cloudflareProvisioningValidationResultSchema,
  tenantInstanceStatusSchema,
  type PatchInstanceExperimentalSettings,
  type TenantProvisioningSettings,
  type PatchTenantProvisioningSettings,
  type PatchCloudflareProvisioningSettings,
} from "./validators/index.js";

export {
  publicContactSubmissionSchema,
  publicRequestCreateSchema,
  publicRequestCommentSchema,
  type PublicContactSubmissionInput,
  type PublicRequestCreate,
  type PublicRequestComment,
  createInstitutionSchema,
  updateInstitutionSchema,
  type CreateInstitution,
  type UpdateInstitution,
  createTenantInstanceSchema,
  updateTenantInstanceSchema,
  tenantBootstrapStatusSchema,
  tenantProvisioningJobSchema,
  type CreateTenantInstance,
  type TenantProvisioningJobInput,
  type UpdateTenantInstance,
  createCompanySchema,
  updateCompanySchema,
  type CreateCompany,
  type UpdateCompany,
  createAgentSchema,
  createAgentHireSchema,
  updateAgentSchema,
  updateAgentInstructionsPathSchema,
  createAgentKeySchema,
  wakeAgentSchema,
  resetAgentSessionSchema,
  testAdapterEnvironmentSchema,
  agentPermissionsSchema,
  updateAgentPermissionsSchema,
  type CreateAgent,
  type CreateAgentHire,
  type UpdateAgent,
  type UpdateAgentInstructionsPath,
  type CreateAgentKey,
  type WakeAgent,
  type ResetAgentSession,
  type TestAdapterEnvironment,
  type UpdateAgentPermissions,
  createProjectSchema,
  updateProjectSchema,
  createProjectWorkspaceSchema,
  updateProjectWorkspaceSchema,
  type CreateProject,
  type UpdateProject,
  type CreateProjectWorkspace,
  type UpdateProjectWorkspace,
  projectExecutionWorkspacePolicySchema,
  createRequestSchema,
  createRequestLabelSchema,
  updateRequestSchema,
  requestExecutionWorkspaceSettingsSchema,
  requestAssigneeAdapterOverridesSchema,
  checkoutRequestSchema,
  addRequestCommentSchema,
  linkRequestApprovalSchema,
  createRequestAttachmentMetadataSchema,
  REQUEST_DOCUMENT_FORMATS,
  requestDocumentFormatSchema,
  requestDocumentKeySchema,
  upsertRequestDocumentSchema,
  createRequestWorkProductSchema,
  updateRequestWorkProductSchema,
  requestWorkProductTypeSchema,
  requestWorkProductStatusSchema,
  requestWorkProductReviewStateSchema,
  type CreateRequest,
  type CreateRequestLabel,
  type UpdateRequest,
  type RequestExecutionWorkspaceSettings,
  type CheckoutRequest,
  type AddRequestComment,
  type LinkRequestApproval,
  type CreateRequestAttachmentMetadata,
  type RequestDocumentFormat,
  type UpsertRequestDocument,
  type CreateRequestWorkProduct,
  type UpdateRequestWorkProduct,
  createIssueSchema,
  createIssueLabelSchema,
  updateIssueSchema,
  issueExecutionWorkspaceSettingsSchema,
  issueAssigneeAdapterOverridesSchema,
  checkoutIssueSchema,
  addIssueCommentSchema,
  linkIssueApprovalSchema,
  createIssueAttachmentMetadataSchema,
  ISSUE_DOCUMENT_FORMATS,
  issueDocumentFormatSchema,
  issueDocumentKeySchema,
  upsertIssueDocumentSchema,
  createIssueWorkProductSchema,
  updateIssueWorkProductSchema,
  issueWorkProductTypeSchema,
  issueWorkProductStatusSchema,
  issueWorkProductReviewStateSchema,
  updateExecutionWorkspaceSchema,
  executionWorkspaceStatusSchema,
  type CreateIssue,
  type CreateIssueLabel,
  type UpdateIssue,
  type IssueExecutionWorkspaceSettings,
  type CheckoutIssue,
  type AddIssueComment,
  type LinkIssueApproval,
  type CreateIssueAttachmentMetadata,
  type CreateIssueWorkProduct,
  type UpdateIssueWorkProduct,
  type UpdateExecutionWorkspace,
  type IssueDocumentFormat,
  type UpsertIssueDocument,
  createObjectiveSchema,
  updateObjectiveSchema,
  type CreateObjective,
  type UpdateObjective,
  createGoalSchema,
  updateGoalSchema,
  type CreateGoal,
  type UpdateGoal,
  createApprovalSchema,
  upsertBudgetPolicySchema,
  resolveBudgetIncidentSchema,
  resolveApprovalSchema,
  requestApprovalRevisionSchema,
  resubmitApprovalSchema,
  addApprovalCommentSchema,
  type CreateApproval,
  type UpsertBudgetPolicy,
  type ResolveBudgetIncident,
  type ResolveApproval,
  type RequestApprovalRevision,
  type ResubmitApproval,
  type AddApprovalComment,
  envBindingPlainSchema,
  envBindingSecretRefSchema,
  envBindingSchema,
  envConfigSchema,
  createSecretSchema,
  rotateSecretSchema,
  updateSecretSchema,
  type CreateSecret,
  type RotateSecret,
  type UpdateSecret,
  createCostEventSchema,
  createFinanceEventSchema,
  updateBudgetSchema,
  createAssetImageMetadataSchema,
  createInstitutionInviteSchema,
  type CreateInstitutionInvite,
  updateUserInstitutionAccessSchema,
  type UpdateUserInstitutionAccess,
  createCompanyInviteSchema,
  type CreateCompanyInvite,
  updateUserCompanyAccessSchema,
  type UpdateUserCompanyAccess,
  createOpenClawInvitePromptSchema,
  acceptInviteSchema,
  listJoinRequestsQuerySchema,
  claimJoinRequestApiKeySchema,
  updateMemberPermissionsSchema,
  type CreateCostEvent,
  type CreateFinanceEvent,
  type UpdateBudget,
  type CreateAssetImageMetadata,
  type CreateOpenClawInvitePrompt,
  type AcceptInvite,
  type ListJoinRequestsQuery,
  type ClaimJoinRequestApiKey,
  type UpdateMemberPermissions,
  portabilityIncludeSchema,
  portabilitySecretRequirementSchema,
  portabilityInstitutionManifestEntrySchema,
  portabilityCompanyManifestEntrySchema,
  portabilityAgentManifestEntrySchema,
  portabilityManifestSchema,
  portabilitySourceSchema,
  portabilityTargetSchema,
  portabilityAgentSelectionSchema,
  portabilityCollisionStrategySchema,
  institutionPortabilityExportSchema,
  institutionPortabilityPreviewSchema,
  institutionPortabilityImportSchema,
  type InstitutionPortabilityExport,
  type InstitutionPortabilityPreview,
  type InstitutionPortabilityImport,
  companyPortabilityExportSchema,
  companyPortabilityPreviewSchema,
  companyPortabilityImportSchema,
  type CompanyPortabilityExport,
  type CompanyPortabilityPreview,
  type CompanyPortabilityImport,
  jsonSchemaSchema,
  pluginJobDeclarationSchema,
  pluginWebhookDeclarationSchema,
  pluginToolDeclarationSchema,
  pluginUiSlotDeclarationSchema,
  pluginLauncherActionDeclarationSchema,
  pluginLauncherRenderDeclarationSchema,
  pluginLauncherDeclarationSchema,
  pluginManifestV1Schema,
  installPluginSchema,
  upsertPluginConfigSchema,
  patchPluginConfigSchema,
  updatePluginStatusSchema,
  uninstallPluginSchema,
  pluginStateScopeKeySchema,
  setPluginStateSchema,
  listPluginStateSchema,
  type PluginJobDeclarationInput,
  type PluginWebhookDeclarationInput,
  type PluginToolDeclarationInput,
  type PluginUiSlotDeclarationInput,
  type PluginLauncherActionDeclarationInput,
  type PluginLauncherRenderDeclarationInput,
  type PluginLauncherDeclarationInput,
  type PluginManifestV1Input,
  type InstallPlugin,
  type UpsertPluginConfig,
  type PatchPluginConfig,
  type UpdatePluginStatus,
  type UninstallPlugin,
  type PluginStateScopeKey,
  type SetPluginState,
  type ListPluginState,
} from "./validators/index.js";

export { API_PREFIX, API } from "./api.js";
export { normalizeAgentUrlKey, deriveAgentUrlKey, isUuidLike } from "./agent-url-key.js";
export { deriveProjectUrlKey, normalizeProjectUrlKey } from "./project-url-key.js";
export {
  normalizeTenantShortCode,
  normalizeTenantCountryCode,
  normalizeTenantCitySlug,
  deriveTenantDispatcherKey,
  deriveTenantPathPrefix,
  deriveTenantPathPrefixFromDispatcherKey,
  deriveTenantWorkerName,
  deriveTenantUrl,
  parseTenantRoutePathname,
} from "./tenant-routing.js";
export {
  MockTenantProvisioner,
  CloudflareTenantProvisioner,
  type CloudflareApiEnvelope,
  type CloudflareApiError,
  type TenantProvisioningResources,
  type TenantProvisioner,
  type CloudflareTenantProvisionerOptions,
} from "./cloudflare-provisioning.js";
export {
  PROJECT_MENTION_SCHEME,
  buildProjectMentionHref,
  parseProjectMentionHref,
  extractProjectMentionIds,
  type ParsedProjectMention,
} from "./project-mentions.js";

export {
  paperclipConfigSchema,
  configMetaSchema,
  llmConfigSchema,
  databaseBackupConfigSchema,
  databaseConfigSchema,
  loggingConfigSchema,
  serverConfigSchema,
  authConfigSchema,
  secretsConfigSchema,
  storageConfigSchema,
  storageLocalDiskConfigSchema,
  storageS3ConfigSchema,
  secretsLocalEncryptedConfigSchema,
  type CiutatisConfig,
  type LlmConfig,
  type DatabaseBackupConfig,
  type DatabaseConfig,
  type LoggingConfig,
  type ServerConfig,
  type AuthConfig,
  type StorageConfig,
  type StorageLocalDiskConfig,
  type StorageS3Config,
  type SecretsConfig,
  type SecretsLocalEncryptedConfig,
  type ConfigMeta,
} from "./config-schema.js";

// === STUB EXPORTS FOR UPSTREAM FEATURES NOT IN CIUTATIS ===
// These are stub implementations to satisfy imports from upstream code
// that references features intentionally removed from ciutatis

// Issue relation types
export interface IssueRelationIssueSummary {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string | null;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
}

// Issue comment types  
export type IssueCommentAuthorType = string;

export interface IssueCommentMetadataRow {
  type: "text" | "code" | "key_value" | "issue_link" | "agent_link" | "run_link";
  label: string;
  text?: string;
  code?: string;
  value?: string;
  issueId?: string;
  identifier?: string | null;
  title?: string | null;
  agentId?: string;
  name?: string | null;
  runId?: string;
}

export interface IssueCommentMetadataSection {
  title: string;
  rows: IssueCommentMetadataRow[];
}

export interface IssueCommentMetadata {
  version?: number;
  sourceRunId?: string | null;
  sections: IssueCommentMetadataSection[];
}

export interface IssueCommentPresentation {
  kind: string;
  tone: string;
  title: string;
  detailsDefaultOpen: boolean;
}

export type IssueCommentMetadataRowType = IssueCommentMetadataRow["type"];
export const issueCommentAuthorTypeSchema = null;
export const issueCommentMetadataSchema = null;
export const issueCommentPresentationSchema = null;

// Issue identifier utilities
export function clampIssueRequestDepth(_depth: number): number {
  return 0;
}
export function extractAgentMentionIds(_text: string): string[] {
  return [];
}
export function normalizeIssueIdentifier(_id: string): string {
  return "";
}

// Run liveness types
export type RunLivenessState = string;

// Environment / Sandbox types
export type EnvironmentLeaseStatus = typeof ENVIRONMENT_LEASE_STATUSES[number];
export type EnvironmentProbeResult = {
  success: boolean;
  ok: boolean;
  summary: string;
  message?: string;
  driver?: string;
  details?: Record<string, unknown>;
};
export interface FakeSandboxEnvironmentConfig {
  enabled?: boolean;
  mockData?: Record<string, unknown>;
  // Allow additional properties for flexibility
  [key: string]: unknown;
}
export interface SandboxEnvironmentConfig {
  provider?: string;
  image?: string;
  resources?: {
    cpu?: number;
    memory?: number;
  };
  reuseLease?: boolean | string | null;
  // Allow additional properties for flexibility
  [key: string]: unknown;
}
export type SandboxEnvironmentProvider = string;

export interface Environment {
  id: string;
  driver: "local" | "ssh" | "sandbox" | "plugin" | string;
  name?: string;
  description?: string | null;
  status?: string;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnvironmentLease {
  id: string;
  environmentId: string;
  providerLeaseId?: string | null;
  provider?: string | null;
  status: EnvironmentLeaseStatus;
  metadata?: Record<string, unknown> | null;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  // Extended properties for workspace realization
  executionWorkspaceId?: string | null;
  issueId?: string | null;
  heartbeatRunId?: string | null;
  projectId?: string | null;
  agentId?: string | null;
  // Upstream-only: lease policy configuration
  leasePolicy?: string | Record<string, unknown> | null;
  // Additional properties from upstream
  acquiredAt?: string | null;
  lastUsedAt?: string | null;
  releasedAt?: string | null;
  cleanupStatus?: "success" | "failed" | null;
  failureReason?: string | null;
}

// Workspace runtime types
export type WorkspaceRuntimeDesiredState = "stopped" | "running" | "manual";

export interface WorkspaceRuntimeServiceState {
  status: "starting" | "running" | "stopped" | "failed" | "unknown" | "manual";
  port?: number | null;
  url?: string | null;
  pid?: number | null;
  startedAt?: string | null;
  stoppedAt?: string | null;
  error?: string | null;
}

export type WorkspaceRuntimeServiceStateMap = Record<string, WorkspaceRuntimeDesiredState>;

export interface WorkspaceServiceCommandDefinition {
  name: string;
  command: string;
  description?: string;
  category?: string;
  rawConfig?: Record<string, unknown>;
  // Allow additional properties for flexibility
  [key: string]: unknown;
}

export function listWorkspaceServiceCommandDefinitions(
  _runtime?: Record<string, unknown> | null,
): WorkspaceServiceCommandDefinition[] {
  return [];
}

export interface ExecutionWorkspaceConfig {
  provisionCommand?: string | null;
  teardownCommand?: string | null;
  cleanupCommand?: string | null;
  // Upstream-only: workspaceRuntime can be an object or string
  workspaceRuntime?: Record<string, unknown> | string | null;
  // Extended properties for workspace runtime
  desiredState?: WorkspaceRuntimeDesiredState | string | null;
  serviceStates?: WorkspaceRuntimeServiceStateMap | null;
  // Upstream-only: environment binding for workspace sessions
  environmentId?: string | null;
}

export interface WorkspaceRealizationLocalSource {
  kind: string;
  strategy: string;
  projectId: string | null;
  projectWorkspaceId?: string | null;
  repoUrl?: string | null;
  repoRef?: string | null;
  branchName?: string | null;
  worktreePath?: string | null;
  localPath?: string | null;
  path?: string | null;
}

export interface WorkspaceRealizationRemote {
  path: string | null;
  host?: string | null;
  port?: number | null;
  username?: string | null;
  sandboxId?: string | null;
  executionWorkspaceId?: string | null;
  issueId?: string | null;
  heartbeatRunId?: string | null;
}

export interface WorkspaceRealizationSync {
  strategy: "none" | "ssh_git_import_export" | "sandbox_archive_upload_download" | "provider_defined";
  prepare: string | null;
  syncBack: string | null;
}

export interface WorkspaceRealizationBootstrap {
  command: string | null;
}

export interface WorkspaceRealizationRebuild {
  executionWorkspaceId: string | null;
  mode: string | null;
  repoUrl: string | null;
  repoRef: string | null;
  localPath: string;
  remotePath: string | null;
  providerLeaseId: string | null;
  metadata: Record<string, unknown>;
}

export interface WorkspaceRealizationRecord {
  version: number;
  transport: "local" | "ssh" | "sandbox" | "plugin";
  provider: string | null;
  environmentId: string;
  leaseId: string;
  providerLeaseId: string | null;
  local: WorkspaceRealizationLocalSource;
  remote: WorkspaceRealizationRemote;
  sync: WorkspaceRealizationSync;
  bootstrap: WorkspaceRealizationBootstrap;
  rebuild: WorkspaceRealizationRebuild;
  summary: string;
}

export interface WorkspaceRealizationRequestSource {
  kind: string;
  strategy: string;
  projectId: string | null;
  projectWorkspaceId?: string | null;
  repoUrl?: string | null;
  repoRef?: string | null;
  branchName?: string | null;
  worktreePath?: string | null;
  localPath: string;
}

export interface WorkspaceRealizationRequestRuntimeOverlay {
  provisionCommand: string | null;
  teardownCommand: string | null;
  cleanupCommand: string | null;
  workspaceRuntime: string | Record<string, unknown> | null;
}

export interface WorkspaceRealizationRequest {
  version?: number;
  adapterType: string;
  companyId: string;
  environmentId: string;
  source: WorkspaceRealizationRequestSource;
  runtimeOverlay: WorkspaceRealizationRequestRuntimeOverlay;
  requestedMode: string | null;
  executionWorkspaceId: string | null;
  issueId: string | null;
  heartbeatRunId: string;
}

// Execution policy types
export type IssueBlockerAttention = unknown;
export type IssueProductivityReview = unknown;
export type IssueProductivityReviewTrigger = unknown;

// Redaction options
export interface CurrentUserRedactionOptions { 
  enabled?: boolean;
  // Allow additional properties for flexibility
  [key: string]: any;
}

// Stub exports for upstream features not in Ciutatis
export const createCliAuthChallengeSchema = z.object({
  provider: z.string().optional(),
  redirectUri: z.string().optional(),
});

export const listCompanyInvitesQuerySchema = z.object({
  status: z.enum(["active", "accepted", "revoked", "expired"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const resolveCliAuthChallengeSchema = z.object({
  challengeId: z.string(),
  code: z.string(),
});

export const searchAdminUsersQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const updateCompanyMemberWithPermissionsSchema = z.object({
  role: z.string().optional(),
  grants: z.array(z.object({
    permissionKey: z.string(),
    scope: z.record(z.unknown()).nullable(),
  })).optional(),
});

export const updateCompanyMemberSchema = z.object({
  role: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

export const archiveCompanyMemberSchema = z.object({
  reason: z.string().optional(),
});

export type HumanCompanyMembershipRole = "owner" | "admin" | "operator" | "viewer";

export const agentSkillSyncSchema = z.object({
  skills: z.array(z.object({
    skillId: z.string(),
    version: z.string().optional(),
    config: z.record(z.unknown()).optional(),
  })),
  replaceAll: z.boolean().default(false),
});

export const agentMineInboxQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["open", "in_progress", "closed", "all"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const AGENT_DEFAULT_MAX_CONCURRENT_RUNS = 3;
export type AgentSkillSnapshot = {
  skillId?: string;
  version?: string;
  config?: Record<string, unknown>;
  syncedAt?: Date;
  adapterType?: string;
  mode?: string;
  supported?: boolean;
  entries?: Array<{ path: string; content: string }>;
  warnings?: string[];
  desiredSkills?: string[];
};

export const upsertAgentInstructionsFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const updateAgentInstructionsBundleSchema = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })),
  entryFile: z.string().default("AGENTS.md"),
});
export function supportedEnvironmentDriversForAdapter(_adapter: string): string[] {
  return [];
}

// Auth stub exports
export function assertAuthenticated(_req: unknown, _res: unknown, _next: unknown): void {
  throw new Error("assertAuthenticated not implemented");
}
export function assertInstanceAdmin(_req: unknown, _res: unknown, _next: unknown): void {
  throw new Error("assertInstanceAdmin not implemented");
}

// Environment stub exports
export const createEnvironmentSchema = z.object({
  name: z.string(),
  driver: z.string(),
  config: z.record(z.unknown()).optional(),
});

export const updateEnvironmentSchema = z.object({
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export const probeEnvironmentConfigSchema = z.object({
  driver: z.string(),
  config: z.record(z.unknown()),
});

export function getEnvironmentCapabilities(
  _drivers: readonly string[],
  _options: {
    sandboxProviders: Record<string, {
      status: "supported";
      supportsSavedProbe: boolean;
      supportsUnsavedProbe: boolean;
      supportsRunExecution: boolean;
      supportsReusableLeases: boolean;
      displayName: string;
      description: string | null;
      source: "plugin";
      pluginKey: string;
      pluginId: string;
      configSchema: Record<string, unknown>;
    }>;
  },
): string[] {
  return [];
}

// Workspace execution stub exports
export function findWorkspaceCommandDefinition(
  _config: Record<string, unknown> | null,
  _commandId: string | null,
): WorkspaceServiceCommandDefinition & { kind: "service" | "job"; serviceIndex?: number; id: string } | null {
  return null;
}

export function matchWorkspaceRuntimeServiceToCommand(
  _command: Record<string, unknown>,
  _services: Array<{ id: string }>,
): { id: string } | null {
  return null;
}

export const issueGraphLivenessAutoRecoveryRequestSchema = z.object({
  enabled: z.boolean().optional(),
  thresholdMinutes: z.number().int().positive().optional(),
});

export const patchInstanceGeneralSettingsSchema = z.object({
  instanceName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  backupRetention: z.number().optional(),
  censorUsernameInLogs: z.boolean().optional(),
  autoRestartDevServerWhenIdle: z.boolean().optional(),
});

export const createIssueTreeHoldSchema = z.object({
  issueId: z.string(),
  reason: z.string(),
  durationMinutes: z.number().int().positive().optional(),
});

export const previewIssueTreeControlSchema = z.object({
  command: z.string(),
  targetIssueId: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
});

export const releaseIssueTreeHoldSchema = z.object({
  holdId: z.string(),
  reason: z.string().optional(),
});

// IssueTree type exports for upstream compatibility
export type {
  IssueTreeControlMode,
  IssueTreeHoldStatus,
  IssueTreeHoldReleasePolicyStrategy,
  IssueTreeHoldReleasePolicy,
  IssueTreePreviewTotals,
  IssueTreePreviewWarning,
  IssueTreePreviewRun,
  IssueTreePreviewIssue,
  IssueTreePreviewAgent,
  IssueTreeControlPreview,
  IssueTreeHoldMember,
  IssueTreeHold,
  IssueGraphLivenessAutoRecoveryPreview,
  IssueGraphLivenessAutoRecoveryPreviewItem,
} from "./types/issue-tree.js";

export {
  DEFAULT_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS,
  MAX_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS,
  MIN_ISSUE_GRAPH_LIVENESS_AUTO_RECOVERY_LOOKBACK_HOURS,
} from "./types/issue-tree.js";

export const workspaceRuntimeControlTargetSchema = z.object({
  executionWorkspaceId: z.string(),
  serviceName: z.string(),
  desiredState: z.enum(["stopped", "running", "manual"]),
});

// Re-export plugin types from types/plugin.ts
export type {
  PluginManagedAgentDeclaration,
  PluginManagedAgentResolution,
  PluginManagedProjectDeclaration,
  PluginManagedProjectResolution,
  PluginCompanySettings,
  PluginDatabaseCoreReadTable,
  PluginDatabaseNamespaceDeclaration,
  PluginMigrationRecord,
} from "./types/plugin.js";

// Project types (upstream compatibility)
export type { ProjectManagedByPlugin } from "./types/project.js";

export type ProjectWorkspaceRuntimeConfig = Record<string, unknown>;

// Utility functions
export function hasNonAsciiContent(_content: string): boolean {
  return false;
}

// telemetry stubs
export function trackAgentFirstHeartbeat(
  _tc: { agentRole: string | null; agentId: string }
): void {
  // No-op - telemetry removed from Ciutatis
}

// skill mention stubs
export function extractSkillMentionIds(_source: string): string[] {
  return [];
}
