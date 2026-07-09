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
export type RoutineVariable = {
  name: string;
  label?: string | null;
  type?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: unknown[];
};
export interface RoutineListItem {
  id: string;
  companyId: string;
  projectId: string | null;
  goalId: string | null;
  parentIssueId: string | null;
  title: string;
  description: string | null;
  assigneeAgentId: string | null;
  priority: string;
  status: string;
  concurrencyPolicy: string;
  catchUpPolicy: string;
  variables: Array<{ name: string; [key: string]: unknown }>;
  latestRevisionId: string | null;
  latestRevisionNumber: number | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  updatedByAgentId: string | null;
  updatedByUserId: string | null;
  lastTriggeredAt: Date | string | null;
  lastEnqueuedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  triggers: unknown[];
  lastRun: unknown | null;
  activeIssue: unknown | null;
}
export type Routine = Omit<RoutineListItem, "triggers" | "lastRun" | "activeIssue"> & {
  triggers?: unknown[];
  lastRun?: unknown | null;
  activeIssue?: unknown | null;
};
export interface RoutineRevisionSnapshotTriggerV1 {
  id?: string;
  kind?: string;
  enabled?: boolean;
  [key: string]: unknown;
}
export interface RoutineRevisionSnapshotV1 {
  version: 1;
  routine: Partial<Routine>;
  triggers: RoutineRevisionSnapshotTriggerV1[];
}
export interface RoutineRevision {
  id: string;
  companyId: string;
  routineId: string;
  revisionNumber: number;
  title: string;
  description: string | null;
  snapshot: RoutineRevisionSnapshotV1 | Record<string, unknown>;
  changeSummary: string | null;
  restoredFromRevisionId: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdByRunId: string | null;
  createdAt: Date | string;
}

export const ROUTINE_CATCH_UP_POLICIES: string[] = [];
export const ROUTINE_CONCURRENCY_POLICIES: string[] = [];
export const ROUTINE_STATUSES: string[] = [];
export const ROUTINE_TRIGGER_KINDS: string[] = [];
export const ROUTINE_TRIGGER_SIGNING_MODES: string[] = [];
export const WORKSPACE_BRANCH_ROUTINE_VARIABLE = "workspaceBranch";

export function extractRoutineVariableNames(values: Array<string | null | undefined>): string[] {
  const names = new Set<string>();
  const variablePattern = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g;
  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(variablePattern)) {
      const name = match[1];
      if (name) names.add(name);
    }
  }
  return [...names];
}

// Upstream-only environment constants (not used in Ciutatis V1)
export const ENVIRONMENT_DRIVERS = ["local", "ssh", "sandbox", "plugin"] as const;
export const ENVIRONMENT_LEASE_CLEANUP_STATUSES = ["success", "failed"] as const;
export const ENVIRONMENT_LEASE_POLICIES = ["ephemeral", "reuse_by_environment", "retain_on_failure", "retain"] as const;
export const ENVIRONMENT_LEASE_STATUSES = ["active", "pending", "ready", "error", "released", "failed", "expired", "retained"] as const;
export const ENVIRONMENT_STATUSES = ["active", "inactive", "error", "archived"] as const;

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

export type {
  UserProfileDailyPoint,
  UserProfileIdentity,
  UserProfileIssueSummary,
  UserProfileResponse,
  UserProfileWindowStats,
} from "./types/user-profile.js";
export type {
  CompanySearchHighlight,
  CompanySearchIssueSummary,
  CompanySearchResponse,
  CompanySearchResult,
  CompanySearchResultType,
  CompanySearchScope,
  CompanySearchSnippet,
} from "./types/search.js";
export {
  COMPANY_SEARCH_SCOPES,
} from "./types/search.js";
export {
  COMPANY_SEARCH_DEFAULT_LIMIT,
  COMPANY_SEARCH_MAX_LIMIT,
  COMPANY_SEARCH_MAX_OFFSET,
  COMPANY_SEARCH_MAX_QUERY_LENGTH,
  COMPANY_SEARCH_MAX_TOKENS,
  companySearchQuerySchema,
  type CompanySearchQuery,
} from "./validators/search.js";

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
  PublicPlaceSummary,
  PublicGeoEntity,
  PublicGeoEntityDetail,
  PublicGeoChildrenPage,
  PublicSearchResult,
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
  DashboardRunActivityDay,
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
  PluginLocalFolderDeclaration,
  PluginUiSlotDeclaration,
  PluginLauncherActionDeclaration,
  PluginLauncherRenderDeclaration,
  PluginLauncherRenderContextSnapshot,
  PluginLauncherDeclaration,
  PluginMinimumHostVersion,
  PluginUiDeclaration,
  PluginApiRouteMethod,
  PluginApiRouteAuthMode,
  PluginApiRouteCheckoutPolicy,
  PluginApiRouteCompanyResolution,
  PluginApiRouteDeclaration,
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
  SuccessfulRunHandoffState,
} from "./types/index.js";

import type { CiutatisPluginManifestV1 } from "./types/index.js";
export type { CiutatisPluginManifestV1 };
export type PaperclipPluginManifestV1 = CiutatisPluginManifestV1;

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
  deriveTenantRoute,
  normalizeTenantShortCode,
  normalizeTenantCountryCode,
  normalizeTenantCitySlug,
  normalizeTenantJurisdictionType,
  normalizeTenantPostalCode,
  deriveTenantDispatcherKey,
  deriveTenantPathPrefix,
  deriveTenantPathPrefixFromDispatcherKey,
  deriveTenantWorkerName,
  deriveTenantUrl,
  parseTenantRoutePathname,
  type DerivedTenantRoute,
  type TenantRouteInput,
  type TenantRouteOptions,
} from "./tenant-routing.js";
export {
  ARGENTINA_TENANT_ROUTING_CONFIG,
  TENANT_JURISDICTION_TYPES,
  TENANT_ROUTING_COUNTRY_CONFIGS,
  getTenantRoutingCountryConfig,
  type TenantCountryRoutingConfig,
  type TenantJurisdictionRoutingConfig,
  type TenantJurisdictionType,
  type TenantRouteSeed,
  type TenantRouteSegmentStrategy,
} from "./tenant-routing-configs/index.js";
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
  terminalBlockers?: IssueRelationIssueSummary[];
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
  const value = _id.trim();
  if (!value) return "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return "";
  }
  if (/^[a-z0-9]+-\d+$/i.test(value)) {
    return value.toUpperCase();
  }
  return "";
}

// Run liveness types
export type RunLivenessState = string;

// Environment / Sandbox types
export type EnvironmentLeaseStatus = typeof ENVIRONMENT_LEASE_STATUSES[number];
export type EnvironmentProbeResult = {
  success?: boolean;
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
  id: string;
  name: string;
  command: string;
  kind: "service" | "job";
  serviceIndex?: number;
  description?: string;
  category?: string;
  rawConfig?: Record<string, unknown>;
  // Allow additional properties for flexibility
  [key: string]: unknown;
}

function readRuntimeArray(runtime: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = runtime[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function listWorkspaceServiceCommandDefinitions(
  runtime?: Record<string, unknown> | null,
): WorkspaceServiceCommandDefinition[] {
  if (!runtime) return [];
  const serviceEntries: WorkspaceServiceCommandDefinition[] = [];
  for (const [index, entry] of readRuntimeArray(runtime, ["services", "serviceCommands"]).entries()) {
    const record = readRecord(entry);
    if (!record) continue;
    const name = readString(record.name) ?? readString(record.serviceName) ?? `service-${index + 1}`;
    const command = readString(record.command) ?? readString(record.startCommand);
    if (!command) continue;
    serviceEntries.push({
      id: readString(record.id) ?? `service:${name}`,
      name,
      command,
      kind: "service" as const,
      serviceIndex: index,
      description: readString(record.description) ?? undefined,
      category: readString(record.category) ?? "service",
      rawConfig: record,
    });
  }

  const jobEntries: WorkspaceServiceCommandDefinition[] = [];
  for (const [index, entry] of readRuntimeArray(runtime, ["jobs", "commands", "tasks"]).entries()) {
    const record = readRecord(entry);
    if (!record) continue;
    const declaredKind = readString(record.kind);
    const name = readString(record.name) ?? readString(record.id) ?? `job-${index + 1}`;
    const command = readString(record.command) ?? readString(record.run);
    if (!command) continue;
    if (declaredKind === "service") {
      serviceEntries.push({
        id: readString(record.id) ?? `service:${name}`,
        name,
        command,
        kind: "service" as const,
        serviceIndex: serviceEntries.length,
        description: readString(record.description) ?? undefined,
        category: readString(record.category) ?? "service",
        rawConfig: record,
      });
      continue;
    }
    jobEntries.push({
      id: readString(record.id) ?? `job:${name}`,
      name,
      command,
      kind: "job" as const,
      description: readString(record.description) ?? undefined,
      category: readString(record.category) ?? "job",
      rawConfig: record,
    });
  }

  return [...serviceEntries, ...jobEntries];
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
export interface IssueBlockerAttention {
  state: "none" | "covered" | "stalled" | "needs_attention" | string;
  reason?: "active_child" | "active_dependency" | "stalled_review" | "attention_required" | string | null;
  coveredBlockerCount?: number;
  sampleBlockerIdentifier?: string | null;
  stalledBlockerCount?: number;
  sampleStalledBlockerIdentifier?: string | null;
  attentionBlockerCount?: number;
  unresolvedBlockerCount?: number;
}
export type IssueProductivityReview = unknown;
export type IssueProductivityReviewTrigger = unknown;
export type IssueWorkMode = "managed" | "manual" | "background" | string;

export interface IssueScheduledRetry {
  runId: string;
  status: string;
  agentId: string;
  agentName?: string | null;
  retryOfRunId: string | null;
  scheduledRetryAt: string | Date | null;
  scheduledRetryAttempt: number | null;
  scheduledRetryReason: string | null;
  retryExhaustedReason: string | null;
  error: string | null;
  errorCode: string | null;
}

export type IssueRetryNowOutcome =
  | "promoted"
  | "already_promoted"
  | "no_scheduled_retry"
  | "gate_suppressed";

export interface IssueRetryNowResponse {
  outcome: IssueRetryNowOutcome;
  message: string;
  scheduledRetry: IssueScheduledRetry | null;
}

export type IssueThreadInteractionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "answered"
  | "cancelled"
  | "expired"
  | "failed";
export type IssueThreadInteractionContinuationPolicy =
  | "none"
  | "wake_assignee"
  | "wake_assignee_on_accept";

export interface IssueThreadInteractionActorFields {
  createdByAgentId: string | null;
  createdByUserId: string | null;
  resolvedByAgentId: string | null;
  resolvedByUserId: string | null;
}

export interface IssueThreadInteractionBase extends IssueThreadInteractionActorFields {
  id: string;
  companyId: string;
  issueId: string;
  kind: "suggest_tasks" | "ask_user_questions" | "request_confirmation";
  title?: string | null;
  summary?: string | null;
  status: IssueThreadInteractionStatus;
  continuationPolicy: IssueThreadInteractionContinuationPolicy;
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt: Date | string | null;
}

export interface SuggestedTaskDraft {
  clientKey: string;
  parentClientKey?: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  billingCode?: string | null;
  projectId?: string | null;
  labels?: string[];
  hiddenInPreview?: boolean;
}

export interface SuggestTasksResultCreatedTask {
  clientKey: string;
  issueId: string;
  identifier?: string | null;
  title?: string | null;
  parentIssueId?: string | null;
  [key: string]: unknown;
}

export interface SuggestTasksPayload {
  version: 1;
  defaultParentId?: string | null;
  tasks: SuggestedTaskDraft[];
}

export interface SuggestTasksResult {
  version?: number;
  createdTasks?: SuggestTasksResultCreatedTask[];
  skippedClientKeys?: string[];
  selectedClientKeys?: string[];
  rejectionReason?: string | null;
  [key: string]: unknown;
}

export interface SuggestTasksInteraction extends IssueThreadInteractionBase {
  kind: "suggest_tasks";
  payload: SuggestTasksPayload;
  result: SuggestTasksResult | null;
}

export interface AskUserQuestionsQuestionOption {
  id: string;
  label: string;
  description?: string | null;
}

export interface AskUserQuestionsQuestion {
  id: string;
  prompt: string;
  helpText?: string | null;
  selectionMode: "single" | "multi";
  required: boolean;
  options: AskUserQuestionsQuestionOption[];
}

export interface AskUserQuestionsAnswer {
  questionId: string;
  optionIds: string[];
}

export interface AskUserQuestionsPayload {
  version: 1;
  title?: string | null;
  submitLabel?: string | null;
  questions: AskUserQuestionsQuestion[];
}

export interface AskUserQuestionsResult {
  version?: number;
  answers?: AskUserQuestionsAnswer[];
  summaryMarkdown?: string | null;
  cancellationReason?: string | null;
  [key: string]: unknown;
}

export interface AskUserQuestionsInteraction extends IssueThreadInteractionBase {
  kind: "ask_user_questions";
  payload: AskUserQuestionsPayload;
  result: AskUserQuestionsResult | null;
}

export interface RequestConfirmationIssueDocumentTarget {
  type: "issue_document";
  issueId?: string | null;
  key: string;
  revisionId?: string | null;
  revisionNumber?: number | null;
  label?: string | null;
  href?: string | null;
}

export type RequestConfirmationTarget =
  | RequestConfirmationIssueDocumentTarget
  | {
    type: string;
    key?: string;
    label?: string | null;
    href?: string | null;
    revisionNumber?: number | null;
    [key: string]: unknown;
  };

export interface RequestConfirmationPayload {
  version: 1;
  prompt: string;
  acceptLabel?: string | null;
  rejectLabel?: string | null;
  rejectRequiresReason?: boolean;
  rejectReasonLabel?: string | null;
  declineReasonPlaceholder?: string | null;
  allowDeclineReason?: boolean;
  detailsMarkdown?: string | null;
  supersedeOnUserComment?: boolean;
  target?: RequestConfirmationTarget | null;
}

export interface RequestConfirmationResult {
  version?: number;
  outcome?: "accepted" | "rejected" | "superseded_by_comment" | "stale_target" | "failed" | string;
  reason?: string | null;
  commentId?: string | null;
  staleTarget?: RequestConfirmationTarget | null;
  error?: string | null;
  [key: string]: unknown;
}

export interface RequestConfirmationInteraction extends IssueThreadInteractionBase {
  kind: "request_confirmation";
  payload: RequestConfirmationPayload;
  result: RequestConfirmationResult | null;
}

export type IssueThreadInteraction =
  | SuggestTasksInteraction
  | AskUserQuestionsInteraction
  | RequestConfirmationInteraction;

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
  description: z.string().nullable().optional(),
  driver: z.string(),
  status: z.enum(ENVIRONMENT_STATUSES).default("active"),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const updateEnvironmentSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  driver: z.string().optional(),
  status: z.enum(ENVIRONMENT_STATUSES).optional(),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const probeEnvironmentConfigSchema = z.object({
  driver: z.string(),
  config: z.record(z.unknown()),
});

export type EnvironmentSupportLevel = "supported" | "unsupported";

export interface AdapterEnvironmentSupport {
  adapterType: string;
  drivers: {
    local: EnvironmentSupportLevel;
    ssh: EnvironmentSupportLevel;
    sandbox: EnvironmentSupportLevel;
    plugin: EnvironmentSupportLevel;
  };
  sandboxProviders: Record<string, EnvironmentSupportLevel>;
}

export interface EnvironmentSandboxProviderCapability {
  status: EnvironmentSupportLevel;
  supportsSavedProbe: boolean;
  supportsUnsavedProbe: boolean;
  supportsRunExecution: boolean;
  supportsReusableLeases: boolean;
  displayName: string;
  description: string | null;
  source?: "core" | "plugin";
  pluginKey?: string;
  pluginId?: string;
  configSchema?: Record<string, unknown>;
}

export interface EnvironmentCapabilities {
  drivers: Record<string, EnvironmentSupportLevel>;
  sandboxProviders: Record<string, EnvironmentSandboxProviderCapability>;
  adapters: AdapterEnvironmentSupport[];
}

export function getAdapterEnvironmentSupport(
  adapterType: string,
  sandboxProviders: Record<string, EnvironmentSandboxProviderCapability> = {},
): AdapterEnvironmentSupport {
  const runCapableSandboxProviders = Object.fromEntries(
    Object.entries(sandboxProviders).map(([provider, capability]) => [
      provider,
      capability.supportsRunExecution ? "supported" : "unsupported",
    ] as const),
  );

  return {
    adapterType,
    drivers: {
      local: "supported",
      ssh: "supported",
      sandbox: Object.values(runCapableSandboxProviders).some((status) => status === "supported")
        ? "supported"
        : "unsupported",
      plugin: "unsupported",
    },
    sandboxProviders: runCapableSandboxProviders,
  };
}

export function getEnvironmentCapabilities(
  adapters: readonly string[],
  options: {
    sandboxProviders?: Record<string, EnvironmentSandboxProviderCapability>;
  } = {},
): EnvironmentCapabilities {
  const sandboxProviders: Record<string, EnvironmentSandboxProviderCapability> = {
    fake: {
      status: "supported",
      supportsSavedProbe: true,
      supportsUnsavedProbe: true,
      supportsRunExecution: false,
      supportsReusableLeases: false,
      displayName: "Fake sandbox",
      description: "Deterministic test provider for probes only.",
      source: "core",
      configSchema: {},
    },
    ...(options.sandboxProviders ?? {}),
  };

  const hasRunCapableSandbox = Object.values(sandboxProviders).some(
    (provider) => provider.supportsRunExecution,
  );

  return {
    drivers: {
      local: "supported",
      ssh: "supported",
      sandbox: hasRunCapableSandbox ? "supported" : "unsupported",
      plugin: "unsupported",
    },
    sandboxProviders,
    adapters: adapters.map((adapterType) => getAdapterEnvironmentSupport(adapterType, sandboxProviders)),
  };
}

// Workspace execution stub exports
export function findWorkspaceCommandDefinition(
  config: Record<string, unknown> | null,
  commandId: string | null,
): WorkspaceServiceCommandDefinition & { kind: "service" | "job"; serviceIndex?: number; id: string } | null {
  const commands = listWorkspaceServiceCommandDefinitions(config);
  if (!commandId) {
    return commands.find((command) => command.kind === "service") ?? commands.find((command) => command.kind === "job") ?? null;
  }
  return commands.find((command) => command.id === commandId || command.name === commandId) ?? null;
}

export function matchWorkspaceRuntimeServiceToCommand(
  command: Record<string, unknown>,
  services: Array<{ id: string; serviceName?: string | null; command?: string | null }>,
): { id: string } | null {
  const serviceName = readString(command.serviceName) ?? readString(command.name);
  const commandText = readString(command.command);
  return services.find((service) => {
    if (serviceName && service.serviceName === serviceName) return true;
    return Boolean(commandText && service.command === commandText);
  }) ?? null;
}

export const issueGraphLivenessAutoRecoveryRequestSchema = z.object({
  enabled: z.boolean().optional(),
  thresholdMinutes: z.number().int().positive().optional(),
  lookbackHours: z.number().int().positive().optional(),
});

export const patchInstanceGeneralSettingsSchema = z.object({
  instanceName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  backupRetention: z.number().optional(),
  censorUsernameInLogs: z.boolean().optional(),
  keyboardShortcuts: z.boolean().optional(),
  feedbackDataSharingPreference: z.enum(["prompt", "allowed", "denied"]).optional(),
  autoRestartDevServerWhenIdle: z.boolean().optional(),
});

const issueTreeControlModeSchema = z.enum(["pause", "resume", "cancel", "restore"]);
const issueTreeHoldReleasePolicySchema = z.object({
  strategy: z.enum(["manual", "auto_on_ready", "after_active_runs_finish"]),
  readyAfterMinutes: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
}).optional();

export const createIssueTreeHoldSchema = z.object({
  mode: issueTreeControlModeSchema,
  reason: z.string().optional(),
  releasePolicy: issueTreeHoldReleasePolicySchema,
  metadata: z.record(z.unknown()).optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export const previewIssueTreeControlSchema = z.object({
  mode: issueTreeControlModeSchema,
  reason: z.string().optional(),
  releasePolicy: issueTreeHoldReleasePolicySchema,
  metadata: z.record(z.unknown()).optional(),
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

export const workspaceRuntimeControlTargetSchema = z
  .object({
    workspaceCommandId: z.string().optional().nullable(),
    runtimeServiceId: z.string().optional().nullable(),
    serviceIndex: z.coerce.number().int().nonnegative().optional().nullable(),
  })
  .strict();

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
