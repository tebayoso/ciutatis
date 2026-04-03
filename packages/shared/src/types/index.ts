// New canonical exports
export type { Institution } from "./institution.js";
export type { TenantInstance } from "./tenant-instance.js";
export type { Objective } from "./objective.js";
export type {
  Request,
  RequestAncestorProject,
  RequestAncestorObjective,
  RequestAncestor,
  RequestLabel,
  RequestAssigneeAdapterOverrides,
  RequestDocumentSummary,
  RequestDocument,
  RequestComment,
  RequestAttachment,
  DocumentFormat,
  DocumentRevision,
  LegacyPlanDocument,
} from "./request.js";
export type {
  RequestWorkProduct,
  RequestWorkProductType,
  RequestWorkProductProvider,
  RequestWorkProductStatus,
  RequestWorkProductReviewState,
} from "./work-product.js";
export type { InstitutionMembership } from "./access.js";
export type {
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
} from "./institution-portability.js";

// Backward-compat aliases (old names)
export type { Company } from "./company.js";
export type { Goal } from "./goal.js";
export type {
  Issue,
  IssueAssigneeAdapterOverrides,
  IssueComment,
  IssueDocument,
  IssueDocumentSummary,
  IssueAncestor,
  IssueAncestorProject,
  IssueAncestorGoal,
  IssueAttachment,
  IssueLabel,
} from "./issue.js";
export type {
  IssueWorkProduct,
  IssueWorkProductType,
  IssueWorkProductProvider,
  IssueWorkProductStatus,
  IssueWorkProductReviewState,
} from "./work-product.js";
export type { CompanyMembership } from "./access.js";
export type { InstitutionSecret } from "./secrets.js";
export type {
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
} from "./company-portability.js";

// Unchanged exports
export type { InstanceExperimentalSettings, InstanceSettings } from "./instance.js";
export type {
  Agent,
  AgentPermissions,
  AgentKeyCreated,
  AgentConfigRevision,
  AdapterEnvironmentCheckLevel,
  AdapterEnvironmentTestStatus,
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestResult,
} from "./agent.js";
export type { AssetImage } from "./asset.js";
export type { Project, ProjectCodebase, ProjectCodebaseOrigin, ProjectGoalRef, ProjectWorkspace } from "./project.js";
export type {
  ExecutionWorkspace,
  WorkspaceRuntimeService,
  ExecutionWorkspaceStrategyType,
  ExecutionWorkspaceMode,
  ExecutionWorkspaceProviderType,
  ExecutionWorkspaceStatus,
  ExecutionWorkspaceStrategy,
  ProjectExecutionWorkspacePolicy,
  ProjectExecutionWorkspaceDefaultMode,
  IssueExecutionWorkspaceSettings,
} from "./workspace-runtime.js";
export type {
  WorkspaceOperation,
  WorkspaceOperationPhase,
  WorkspaceOperationStatus,
} from "./workspace-operation.js";
export type { Approval, ApprovalComment } from "./approval.js";
export type {
  BudgetPolicy,
  BudgetPolicySummary,
  BudgetIncident,
  BudgetOverview,
  BudgetPolicyUpsertInput,
  BudgetIncidentResolutionInput,
} from "./budget.js";
export type {
  SecretProvider,
  SecretVersionSelector,
  EnvPlainBinding,
  EnvSecretRefBinding,
  EnvBinding,
  AgentEnvConfig,
  CompanySecret,
  SecretProviderDescriptor,
} from "./secrets.js";
export type { CostEvent, CostSummary, CostByAgent, CostByProviderModel, CostByBiller, CostByAgentModel, CostWindowSpendRow, CostByProject } from "./cost.js";
export type { FinanceEvent, FinanceSummary, FinanceByBiller, FinanceByKind } from "./finance.js";
export type {
  HeartbeatRun,
  HeartbeatRunEvent,
  AgentRuntimeState,
  AgentTaskSession,
  AgentWakeupRequest,
  InstanceSchedulerHeartbeatAgent,
} from "./heartbeat.js";
export type { LiveEvent } from "./live.js";
export type { DashboardSummary } from "./dashboard.js";
export type { ActivityEvent } from "./activity.js";
export type { SidebarBadges } from "./sidebar-badges.js";
export type {
  PrincipalPermissionGrant,
  Invite,
  JoinRequest,
  InstanceUserRoleGrant,
} from "./access.js";
export type { QuotaWindow, ProviderQuotaResult } from "./quota.js";
export type {
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
  CiutatisPluginManifestV1,
  PluginRecord,
  PluginStateRecord,
  PluginConfig,
  PluginEntityRecord,
  PluginEntityQuery,
  PluginJobRecord,
  PluginJobRunRecord,
  PluginWebhookDeliveryRecord,
} from "./plugin.js";
