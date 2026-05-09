// Primary civic exports (new canonical names)
export { institutions } from "./institutions.js";
export { institutionLogos } from "./institution_logos.js";
export { institutionMemberships } from "./institution_memberships.js";
export { institutionSecrets } from "./institution_secrets.js";
export { institutionSecretVersions } from "./institution_secret_versions.js";
export { objectives } from "./objectives.js";
export { requests } from "./requests.js";
export { publicRequests } from "./public_requests.js";
export { publicRequestUpdates } from "./public_request_updates.js";
export { requestApprovals } from "./request_approvals.js";
export { requestComments } from "./request_comments.js";
export { requestAttachments } from "./request_attachments.js";
export { requestDocuments } from "./request_documents.js";
export { requestLabels } from "./request_labels.js";
export { requestReadStates } from "./request_read_states.js";
export { requestWorkProducts } from "./request_work_products.js";
export { emailDraftStatus, emailDrafts } from "./drafts.js";
export { projectObjectives } from "./project_objectives.js";
export { pluginInstitutionSettings } from "./plugin_institution_settings.js";

// Backward-compat aliases (old names re-exported from shim files)
export { companies } from "./companies.js";
export { companyLogos } from "./company_logos.js";
export { companyMemberships } from "./company_memberships.js";
export { companySecrets } from "./company_secrets.js";
export { companySecretVersions } from "./company_secret_versions.js";
export { goals } from "./goals.js";
export { issues } from "./issues.js";
export { issueApprovals } from "./issue_approvals.js";
export { issueComments } from "./issue_comments.js";
export { issueAttachments } from "./issue_attachments.js";
export { issueDocuments } from "./issue_documents.js";
export { issueLabels } from "./issue_labels.js";
export { issueReadStates } from "./issue_read_states.js";
export { issueWorkProducts } from "./issue_work_products.js";
export { projectGoals } from "./project_goals.js";
export { pluginCompanySettings } from "./plugin_company_settings.js";

// Unchanged exports
export { authUsers, authSessions, authAccounts, authVerifications } from "./auth.js";
export { instanceSettings } from "./instance_settings.js";
export { tenantInstances } from "./tenant_instances.js";
export { tenantProvisioningJobs } from "./tenant_provisioning_jobs.js";
export { instanceUserRoles } from "./instance_user_roles.js";
export { agents } from "./agents.js";
export { principalPermissionGrants } from "./principal_permission_grants.js";
export { invites } from "./invites.js";
export { joinRequests } from "./join_requests.js";
export { budgetPolicies } from "./budget_policies.js";
export { budgetIncidents } from "./budget_incidents.js";
export { agentConfigRevisions } from "./agent_config_revisions.js";
export { agentApiKeys } from "./agent_api_keys.js";
export { agentRuntimeState } from "./agent_runtime_state.js";
export { agentTaskSessions } from "./agent_task_sessions.js";
export { agentWakeupRequests } from "./agent_wakeup_requests.js";
export { projects } from "./projects.js";
export { projectWorkspaces } from "./project_workspaces.js";
export { executionWorkspaces } from "./execution_workspaces.js";
export { environments } from "./environments.js";
export { environmentLeases } from "./environment_leases.js";
export { workspaceOperations } from "./workspace_operations.js";
export { workspaceRuntimeServices } from "./workspace_runtime_services.js";
export { issueReferenceMentions } from "./issue_reference_mentions.js";
export { labels } from "./labels.js";
export { assets } from "./assets.js";
export { documents } from "./documents.js";
export { documentRevisions } from "./document_revisions.js";
export { heartbeatRuns } from "./heartbeat_runs.js";
export { heartbeatRunEvents } from "./heartbeat_run_events.js";
export { heartbeatRunWatchdogDecisions } from "./heartbeat_run_watchdog_decisions.js";
export { costEvents } from "./cost_events.js";
export { financeEvents } from "./finance_events.js";
export { approvals } from "./approvals.js";
export { approvalComments } from "./approval_comments.js";
export { activityLog } from "./activity_log.js";
export { plugins } from "./plugins.js";
export { pluginConfig } from "./plugin_config.js";
export { pluginManagedResources } from "./plugin_managed_resources.js";
export { pluginState } from "./plugin_state.js";
export { pluginEntities } from "./plugin_entities.js";
export { pluginDatabaseNamespaces, pluginMigrations } from "./plugin_database.js";
export { pluginJobs, pluginJobRuns } from "./plugin_jobs.js";
export { pluginWebhookDeliveries } from "./plugin_webhooks.js";
export { pluginLogs } from "./plugin_logs.js";
export { issueTreeHolds } from "./issue_tree_holds.js";
export { issueTreeHoldMembers } from "./issue_tree_hold_members.js";

// Stub exports for upstream compatibility - tables intentionally removed from Ciutatis
// These are minimal table definitions to satisfy upstream type requirements
import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { institutions } from "./institutions.js";
import { requests } from "./requests.js";

export const companySkills = pgTable(
  "company_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyKeyIdx: index("company_skills_company_key_idx").on(table.companyId, table.key),
  })
);

export const issueRelations = pgTable(
  "issue_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id),
    issueId: uuid("issue_id").notNull().references(() => requests.id),
    type: text("type").notNull(),
    relatedIssueId: uuid("related_issue_id").notNull().references(() => requests.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("issue_relations_issue_idx").on(table.issueId),
    companyIdx: index("issue_relations_company_idx").on(table.companyId),
  })
);

export const issueThreadInteractions = pgTable(
  "issue_thread_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id),
    issueId: uuid("issue_id").notNull().references(() => requests.id),
    status: text("status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("issue_thread_interactions_issue_idx").on(table.issueId),
    companyIdx: index("issue_thread_interactions_company_idx").on(table.companyId),
  })
);

export const issueInboxArchives = pgTable(
  "issue_inbox_archives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => institutions.id),
    issueId: uuid("issue_id").notNull().references(() => requests.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("issue_inbox_archives_issue_idx").on(table.issueId),
    companyIdx: index("issue_inbox_archives_company_idx").on(table.companyId),
  })
);
