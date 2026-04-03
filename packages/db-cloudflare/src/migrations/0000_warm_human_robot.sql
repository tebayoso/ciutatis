CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`actor_type` text DEFAULT 'system' NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`agent_id` text,
	`run_id` text,
	`details` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_log_company_created_idx` ON `activity_log` (`company_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_run_id_idx` ON `activity_log` (`run_id`);--> statement-breakpoint
CREATE INDEX `activity_log_entity_type_id_idx` ON `activity_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `agent_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_api_keys_key_hash_idx` ON `agent_api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `agent_api_keys_company_agent_idx` ON `agent_api_keys` (`company_id`,`agent_id`);--> statement-breakpoint
CREATE TABLE `agent_config_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`source` text DEFAULT 'patch' NOT NULL,
	`rolled_back_from_revision_id` text,
	`changed_keys` text DEFAULT '[]' NOT NULL,
	`before_config` text NOT NULL,
	`after_config` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_config_revisions_company_agent_created_idx` ON `agent_config_revisions` (`company_id`,`agent_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `agent_config_revisions_agent_created_idx` ON `agent_config_revisions` (`agent_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `agent_runtime_state` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`adapter_type` text NOT NULL,
	`session_id` text,
	`state_json` text DEFAULT '{}' NOT NULL,
	`last_run_id` text,
	`last_run_status` text,
	`total_input_tokens` integer DEFAULT 0 NOT NULL,
	`total_output_tokens` integer DEFAULT 0 NOT NULL,
	`total_cached_input_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost_cents` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_runtime_state_company_agent_idx` ON `agent_runtime_state` (`company_id`,`agent_id`);--> statement-breakpoint
CREATE INDEX `agent_runtime_state_company_updated_idx` ON `agent_runtime_state` (`company_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `agent_task_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`adapter_type` text NOT NULL,
	`task_key` text NOT NULL,
	`session_params_json` text,
	`session_display_id` text,
	`last_run_id` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_task_sessions_company_agent_adapter_task_uniq` ON `agent_task_sessions` (`company_id`,`agent_id`,`adapter_type`,`task_key`);--> statement-breakpoint
CREATE INDEX `agent_task_sessions_company_agent_updated_idx` ON `agent_task_sessions` (`company_id`,`agent_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `agent_task_sessions_company_task_updated_idx` ON `agent_task_sessions` (`company_id`,`task_key`,`updated_at`);--> statement-breakpoint
CREATE TABLE `agent_wakeup_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`source` text NOT NULL,
	`trigger_detail` text,
	`reason` text,
	`payload` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`coalesced_count` integer DEFAULT 0 NOT NULL,
	`requested_by_actor_type` text,
	`requested_by_actor_id` text,
	`idempotency_key` text,
	`run_id` text,
	`requested_at` text NOT NULL,
	`claimed_at` text,
	`finished_at` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_wakeup_requests_company_agent_status_idx` ON `agent_wakeup_requests` (`company_id`,`agent_id`,`status`);--> statement-breakpoint
CREATE INDEX `agent_wakeup_requests_company_requested_idx` ON `agent_wakeup_requests` (`company_id`,`requested_at`);--> statement-breakpoint
CREATE INDEX `agent_wakeup_requests_agent_requested_idx` ON `agent_wakeup_requests` (`agent_id`,`requested_at`);--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'general' NOT NULL,
	`title` text,
	`icon` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`reports_to` text,
	`capabilities` text,
	`adapter_type` text DEFAULT 'process' NOT NULL,
	`adapter_config` text DEFAULT '{}' NOT NULL,
	`runtime_config` text DEFAULT '{}' NOT NULL,
	`budget_monthly_cents` integer DEFAULT 0 NOT NULL,
	`spent_monthly_cents` integer DEFAULT 0 NOT NULL,
	`pause_reason` text,
	`paused_at` text,
	`permissions` text DEFAULT '{}' NOT NULL,
	`last_heartbeat_at` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reports_to`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agents_company_status_idx` ON `agents` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `agents_company_reports_to_idx` ON `agents` (`company_id`,`reports_to`);--> statement-breakpoint
CREATE TABLE `approval_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`approval_id` text NOT NULL,
	`author_agent_id` text,
	`author_user_id` text,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `approval_comments_company_idx` ON `approval_comments` (`company_id`);--> statement-breakpoint
CREATE INDEX `approval_comments_approval_idx` ON `approval_comments` (`approval_id`);--> statement-breakpoint
CREATE INDEX `approval_comments_approval_created_idx` ON `approval_comments` (`approval_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`type` text NOT NULL,
	`requested_by_agent_id` text,
	`requested_by_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL,
	`decision_note` text,
	`decided_by_user_id` text,
	`decided_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `approvals_company_status_type_idx` ON `approvals` (`company_id`,`status`,`type`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`provider` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`original_filename` text,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_company_created_idx` ON `assets` (`company_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `assets_company_provider_idx` ON `assets` (`company_id`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_company_object_key_uq` ON `assets` (`company_id`,`object_key`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` text,
	`refresh_token_expires_at` text,
	`scope` text,
	`password` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `budget_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`policy_id` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`metric` text NOT NULL,
	`window_kind` text NOT NULL,
	`window_start` text NOT NULL,
	`window_end` text NOT NULL,
	`threshold_type` text NOT NULL,
	`amount_limit` integer NOT NULL,
	`amount_observed` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`approval_id` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`policy_id`) REFERENCES `budget_policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budget_incidents_company_status_idx` ON `budget_incidents` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `budget_incidents_company_scope_idx` ON `budget_incidents` (`company_id`,`scope_type`,`scope_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `budget_incidents_policy_window_threshold_idx` ON `budget_incidents` (`policy_id`,`window_start`,`threshold_type`);--> statement-breakpoint
CREATE TABLE `budget_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`metric` text DEFAULT 'billed_cents' NOT NULL,
	`window_kind` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`warn_percent` integer DEFAULT 80 NOT NULL,
	`hard_stop_enabled` integer DEFAULT true NOT NULL,
	`notify_enabled` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budget_policies_company_scope_active_idx` ON `budget_policies` (`company_id`,`scope_type`,`scope_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `budget_policies_company_window_idx` ON `budget_policies` (`company_id`,`window_kind`,`metric`);--> statement-breakpoint
CREATE UNIQUE INDEX `budget_policies_company_scope_metric_unique_idx` ON `budget_policies` (`company_id`,`scope_type`,`scope_id`,`metric`,`window_kind`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`pause_reason` text,
	`paused_at` text,
	`issue_prefix` text DEFAULT 'PAP' NOT NULL,
	`issue_counter` integer DEFAULT 0 NOT NULL,
	`budget_monthly_cents` integer DEFAULT 0 NOT NULL,
	`spent_monthly_cents` integer DEFAULT 0 NOT NULL,
	`require_board_approval_for_new_agents` integer DEFAULT true NOT NULL,
	`brand_color` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_issue_prefix_idx` ON `companies` (`issue_prefix`);--> statement-breakpoint
CREATE TABLE `company_logos` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_logos_company_uq` ON `company_logos` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_logos_asset_uq` ON `company_logos` (`asset_id`);--> statement-breakpoint
CREATE TABLE `company_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`principal_type` text NOT NULL,
	`principal_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`membership_role` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_memberships_company_principal_unique_idx` ON `company_memberships` (`company_id`,`principal_type`,`principal_id`);--> statement-breakpoint
CREATE INDEX `company_memberships_principal_status_idx` ON `company_memberships` (`principal_type`,`principal_id`,`status`);--> statement-breakpoint
CREATE INDEX `company_memberships_company_status_idx` ON `company_memberships` (`company_id`,`status`);--> statement-breakpoint
CREATE TABLE `company_secret_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_id` text NOT NULL,
	`version` integer NOT NULL,
	`material` text NOT NULL,
	`value_sha256` text NOT NULL,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`secret_id`) REFERENCES `company_secrets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `company_secret_versions_secret_idx` ON `company_secret_versions` (`secret_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `company_secret_versions_value_sha256_idx` ON `company_secret_versions` (`value_sha256`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_secret_versions_secret_version_uq` ON `company_secret_versions` (`secret_id`,`version`);--> statement-breakpoint
CREATE TABLE `company_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT 'local_encrypted' NOT NULL,
	`external_ref` text,
	`latest_version` integer DEFAULT 1 NOT NULL,
	`description` text,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `company_secrets_company_idx` ON `company_secrets` (`company_id`);--> statement-breakpoint
CREATE INDEX `company_secrets_company_provider_idx` ON `company_secrets` (`company_id`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_secrets_company_name_uq` ON `company_secrets` (`company_id`,`name`);--> statement-breakpoint
CREATE TABLE `cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`issue_id` text,
	`project_id` text,
	`goal_id` text,
	`heartbeat_run_id` text,
	`billing_code` text,
	`provider` text NOT NULL,
	`biller` text DEFAULT 'unknown' NOT NULL,
	`billing_type` text DEFAULT 'unknown' NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`cached_input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`heartbeat_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cost_events_company_occurred_idx` ON `cost_events` (`company_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `cost_events_company_agent_occurred_idx` ON `cost_events` (`company_id`,`agent_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `cost_events_company_provider_occurred_idx` ON `cost_events` (`company_id`,`provider`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `cost_events_company_biller_occurred_idx` ON `cost_events` (`company_id`,`biller`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `cost_events_company_heartbeat_run_idx` ON `cost_events` (`company_id`,`heartbeat_run_id`);--> statement-breakpoint
CREATE TABLE `document_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`document_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`body` text NOT NULL,
	`change_summary` text,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_revisions_document_revision_uq` ON `document_revisions` (`document_id`,`revision_number`);--> statement-breakpoint
CREATE INDEX `document_revisions_company_document_created_idx` ON `document_revisions` (`company_id`,`document_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text,
	`format` text DEFAULT 'markdown' NOT NULL,
	`latest_body` text NOT NULL,
	`latest_revision_id` text,
	`latest_revision_number` integer DEFAULT 1 NOT NULL,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`updated_by_agent_id` text,
	`updated_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `documents_company_updated_idx` ON `documents` (`company_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `documents_company_created_idx` ON `documents` (`company_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `email_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`subject` text NOT NULL,
	`content_html` text,
	`content_text` text,
	`recipients` text,
	`template_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `email_drafts_company_status_idx` ON `email_drafts` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `email_drafts_company_deleted_idx` ON `email_drafts` (`company_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `execution_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text NOT NULL,
	`project_workspace_id` text,
	`source_issue_id` text,
	`mode` text NOT NULL,
	`strategy_type` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`cwd` text,
	`repo_url` text,
	`base_ref` text,
	`branch_name` text,
	`provider_type` text DEFAULT 'local_fs' NOT NULL,
	`provider_ref` text,
	`derived_from_execution_workspace_id` text,
	`last_used_at` text NOT NULL,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`cleanup_eligible_at` text,
	`cleanup_reason` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_workspace_id`) REFERENCES `project_workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`derived_from_execution_workspace_id`) REFERENCES `execution_workspaces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `execution_workspaces_company_project_status_idx` ON `execution_workspaces` (`company_id`,`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `execution_workspaces_company_project_workspace_status_idx` ON `execution_workspaces` (`company_id`,`project_workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `execution_workspaces_company_source_issue_idx` ON `execution_workspaces` (`company_id`,`source_issue_id`);--> statement-breakpoint
CREATE INDEX `execution_workspaces_company_last_used_idx` ON `execution_workspaces` (`company_id`,`last_used_at`);--> statement-breakpoint
CREATE INDEX `execution_workspaces_company_branch_idx` ON `execution_workspaces` (`company_id`,`branch_name`);--> statement-breakpoint
CREATE TABLE `finance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`agent_id` text,
	`issue_id` text,
	`project_id` text,
	`goal_id` text,
	`heartbeat_run_id` text,
	`cost_event_id` text,
	`billing_code` text,
	`description` text,
	`event_kind` text NOT NULL,
	`direction` text DEFAULT 'debit' NOT NULL,
	`biller` text NOT NULL,
	`provider` text,
	`execution_adapter_type` text,
	`pricing_tier` text,
	`region` text,
	`model` text,
	`quantity` integer,
	`unit` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`estimated` integer DEFAULT false NOT NULL,
	`external_invoice_id` text,
	`metadata_json` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`heartbeat_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cost_event_id`) REFERENCES `cost_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `finance_events_company_occurred_idx` ON `finance_events` (`company_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_events_company_biller_occurred_idx` ON `finance_events` (`company_id`,`biller`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_events_company_kind_occurred_idx` ON `finance_events` (`company_id`,`event_kind`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_events_company_direction_occurred_idx` ON `finance_events` (`company_id`,`direction`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_events_company_heartbeat_run_idx` ON `finance_events` (`company_id`,`heartbeat_run_id`);--> statement-breakpoint
CREATE INDEX `finance_events_company_cost_event_idx` ON `finance_events` (`company_id`,`cost_event_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`level` text DEFAULT 'task' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`parent_id` text,
	`owner_agent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `goals_company_idx` ON `goals` (`company_id`);--> statement-breakpoint
CREATE TABLE `heartbeat_run_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` text NOT NULL,
	`run_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`seq` integer NOT NULL,
	`event_type` text NOT NULL,
	`stream` text,
	`level` text,
	`color` text,
	`message` text,
	`payload` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `heartbeat_run_events_run_seq_idx` ON `heartbeat_run_events` (`run_id`,`seq`);--> statement-breakpoint
CREATE INDEX `heartbeat_run_events_company_run_idx` ON `heartbeat_run_events` (`company_id`,`run_id`);--> statement-breakpoint
CREATE INDEX `heartbeat_run_events_company_created_idx` ON `heartbeat_run_events` (`company_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `heartbeat_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`invocation_source` text DEFAULT 'on_demand' NOT NULL,
	`trigger_detail` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` text,
	`finished_at` text,
	`error` text,
	`wakeup_request_id` text,
	`exit_code` integer,
	`signal` text,
	`usage_json` text,
	`result_json` text,
	`session_id_before` text,
	`session_id_after` text,
	`log_store` text,
	`log_ref` text,
	`log_bytes` integer,
	`log_sha256` text,
	`log_compressed` integer DEFAULT false NOT NULL,
	`stdout_excerpt` text,
	`stderr_excerpt` text,
	`error_code` text,
	`external_run_id` text,
	`context_snapshot` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wakeup_request_id`) REFERENCES `agent_wakeup_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `heartbeat_runs_company_agent_started_idx` ON `heartbeat_runs` (`company_id`,`agent_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `instance_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`singleton_key` text DEFAULT 'default' NOT NULL,
	`experimental` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instance_settings_singleton_key_idx` ON `instance_settings` (`singleton_key`);--> statement-breakpoint
CREATE TABLE `instance_user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'instance_admin' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instance_user_roles_user_role_unique_idx` ON `instance_user_roles` (`user_id`,`role`);--> statement-breakpoint
CREATE INDEX `instance_user_roles_role_idx` ON `instance_user_roles` (`role`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`invite_type` text DEFAULT 'company_join' NOT NULL,
	`token_hash` text NOT NULL,
	`allowed_join_types` text DEFAULT 'both' NOT NULL,
	`defaults_payload` text,
	`expires_at` text NOT NULL,
	`invited_by_user_id` text,
	`revoked_at` text,
	`accepted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_token_hash_unique_idx` ON `invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `invites_company_invite_state_idx` ON `invites` (`company_id`,`invite_type`,`revoked_at`,`expires_at`);--> statement-breakpoint
CREATE TABLE `issue_approvals` (
	`company_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`approval_id` text NOT NULL,
	`linked_by_agent_id` text,
	`linked_by_user_id` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`issue_id`, `approval_id`),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `issue_approvals_issue_idx` ON `issue_approvals` (`issue_id`);--> statement-breakpoint
CREATE INDEX `issue_approvals_approval_idx` ON `issue_approvals` (`approval_id`);--> statement-breakpoint
CREATE INDEX `issue_approvals_company_idx` ON `issue_approvals` (`company_id`);--> statement-breakpoint
CREATE TABLE `issue_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`issue_comment_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issue_comment_id`) REFERENCES `issue_comments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `issue_attachments_company_issue_idx` ON `issue_attachments` (`company_id`,`issue_id`);--> statement-breakpoint
CREATE INDEX `issue_attachments_issue_comment_idx` ON `issue_attachments` (`issue_comment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `issue_attachments_asset_uq` ON `issue_attachments` (`asset_id`);--> statement-breakpoint
CREATE TABLE `issue_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`author_agent_id` text,
	`author_user_id` text,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issue_comments_issue_idx` ON `issue_comments` (`issue_id`);--> statement-breakpoint
CREATE INDEX `issue_comments_company_idx` ON `issue_comments` (`company_id`);--> statement-breakpoint
CREATE INDEX `issue_comments_company_issue_created_at_idx` ON `issue_comments` (`company_id`,`issue_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `issue_comments_company_author_issue_created_at_idx` ON `issue_comments` (`company_id`,`author_user_id`,`issue_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `issue_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`document_id` text NOT NULL,
	`key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issue_documents_company_issue_key_uq` ON `issue_documents` (`company_id`,`issue_id`,`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `issue_documents_document_uq` ON `issue_documents` (`document_id`);--> statement-breakpoint
CREATE INDEX `issue_documents_company_issue_updated_idx` ON `issue_documents` (`company_id`,`issue_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `issue_labels` (
	`issue_id` text NOT NULL,
	`label_id` text NOT NULL,
	`company_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`issue_id`, `label_id`),
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `issue_labels_issue_idx` ON `issue_labels` (`issue_id`);--> statement-breakpoint
CREATE INDEX `issue_labels_label_idx` ON `issue_labels` (`label_id`);--> statement-breakpoint
CREATE INDEX `issue_labels_company_idx` ON `issue_labels` (`company_id`);--> statement-breakpoint
CREATE TABLE `issue_read_states` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issue_read_states_company_issue_idx` ON `issue_read_states` (`company_id`,`issue_id`);--> statement-breakpoint
CREATE INDEX `issue_read_states_company_user_idx` ON `issue_read_states` (`company_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `issue_read_states_company_issue_user_idx` ON `issue_read_states` (`company_id`,`issue_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `issue_work_products` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text,
	`issue_id` text NOT NULL,
	`execution_workspace_id` text,
	`runtime_service_id` text,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text,
	`title` text NOT NULL,
	`url` text,
	`status` text NOT NULL,
	`review_state` text DEFAULT 'none' NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`health_status` text DEFAULT 'unknown' NOT NULL,
	`summary` text,
	`metadata` text,
	`created_by_run_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`execution_workspace_id`) REFERENCES `execution_workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`runtime_service_id`) REFERENCES `workspace_runtime_services`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `issue_work_products_company_issue_type_idx` ON `issue_work_products` (`company_id`,`issue_id`,`type`);--> statement-breakpoint
CREATE INDEX `issue_work_products_company_execution_workspace_type_idx` ON `issue_work_products` (`company_id`,`execution_workspace_id`,`type`);--> statement-breakpoint
CREATE INDEX `issue_work_products_company_provider_external_id_idx` ON `issue_work_products` (`company_id`,`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `issue_work_products_company_updated_idx` ON `issue_work_products` (`company_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text,
	`project_workspace_id` text,
	`goal_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'backlog' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`assignee_agent_id` text,
	`assignee_user_id` text,
	`checkout_run_id` text,
	`execution_run_id` text,
	`execution_agent_name_key` text,
	`execution_locked_at` text,
	`created_by_agent_id` text,
	`created_by_user_id` text,
	`issue_number` integer,
	`identifier` text,
	`request_depth` integer DEFAULT 0 NOT NULL,
	`billing_code` text,
	`assignee_adapter_overrides` text,
	`execution_workspace_id` text,
	`execution_workspace_preference` text,
	`execution_workspace_settings` text,
	`started_at` text,
	`completed_at` text,
	`cancelled_at` text,
	`hidden_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_workspace_id`) REFERENCES `project_workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checkout_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`execution_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`execution_workspace_id`) REFERENCES `execution_workspaces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `issues_company_status_idx` ON `issues` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_company_assignee_status_idx` ON `issues` (`company_id`,`assignee_agent_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_company_assignee_user_status_idx` ON `issues` (`company_id`,`assignee_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_company_parent_idx` ON `issues` (`company_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `issues_company_project_idx` ON `issues` (`company_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `issues_company_project_workspace_idx` ON `issues` (`company_id`,`project_workspace_id`);--> statement-breakpoint
CREATE INDEX `issues_company_execution_workspace_idx` ON `issues` (`company_id`,`execution_workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `issues_identifier_idx` ON `issues` (`identifier`);--> statement-breakpoint
CREATE TABLE `join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_id` text NOT NULL,
	`company_id` text NOT NULL,
	`request_type` text NOT NULL,
	`status` text DEFAULT 'pending_approval' NOT NULL,
	`request_ip` text NOT NULL,
	`requesting_user_id` text,
	`request_email_snapshot` text,
	`agent_name` text,
	`adapter_type` text,
	`capabilities` text,
	`agent_defaults_payload` text,
	`claim_secret_hash` text,
	`claim_secret_expires_at` text,
	`claim_secret_consumed_at` text,
	`created_agent_id` text,
	`approved_by_user_id` text,
	`approved_at` text,
	`rejected_by_user_id` text,
	`rejected_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`invite_id`) REFERENCES `invites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `join_requests_invite_unique_idx` ON `join_requests` (`invite_id`);--> statement-breakpoint
CREATE INDEX `join_requests_company_status_type_created_idx` ON `join_requests` (`company_id`,`status`,`request_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `labels_company_idx` ON `labels` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `labels_company_name_idx` ON `labels` (`company_id`,`name`);--> statement-breakpoint
CREATE TABLE `plugin_company_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_company_settings_company_idx` ON `plugin_company_settings` (`company_id`);--> statement-breakpoint
CREATE INDEX `plugin_company_settings_plugin_idx` ON `plugin_company_settings` (`plugin_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_company_settings_company_plugin_uq` ON `plugin_company_settings` (`company_id`,`plugin_id`);--> statement-breakpoint
CREATE TABLE `plugin_config` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_config_plugin_id_idx` ON `plugin_config` (`plugin_id`);--> statement-breakpoint
CREATE TABLE `plugin_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`scope_kind` text NOT NULL,
	`scope_id` text,
	`external_id` text,
	`title` text,
	`status` text,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_entities_plugin_idx` ON `plugin_entities` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `plugin_entities_type_idx` ON `plugin_entities` (`entity_type`);--> statement-breakpoint
CREATE INDEX `plugin_entities_scope_idx` ON `plugin_entities` (`scope_kind`,`scope_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_entities_external_idx` ON `plugin_entities` (`plugin_id`,`entity_type`,`external_id`);--> statement-breakpoint
CREATE TABLE `plugin_job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`duration_ms` integer,
	`error` text,
	`logs` text DEFAULT '[]' NOT NULL,
	`started_at` text,
	`finished_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `plugin_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_job_runs_job_idx` ON `plugin_job_runs` (`job_id`);--> statement-breakpoint
CREATE INDEX `plugin_job_runs_plugin_idx` ON `plugin_job_runs` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `plugin_job_runs_status_idx` ON `plugin_job_runs` (`status`);--> statement-breakpoint
CREATE TABLE `plugin_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`job_key` text NOT NULL,
	`schedule` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_run_at` text,
	`next_run_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_jobs_plugin_idx` ON `plugin_jobs` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `plugin_jobs_next_run_idx` ON `plugin_jobs` (`next_run_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_jobs_unique_idx` ON `plugin_jobs` (`plugin_id`,`job_key`);--> statement-breakpoint
CREATE TABLE `plugin_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`meta` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_logs_plugin_time_idx` ON `plugin_logs` (`plugin_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `plugin_logs_level_idx` ON `plugin_logs` (`level`);--> statement-breakpoint
CREATE TABLE `plugin_state` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`scope_kind` text NOT NULL,
	`scope_id` text,
	`namespace` text DEFAULT 'default' NOT NULL,
	`state_key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_state_plugin_scope_idx` ON `plugin_state` (`plugin_id`,`scope_kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_state_unique_entry_idx` ON `plugin_state` (`plugin_id`,`scope_kind`,`scope_id`,`namespace`,`state_key`);--> statement-breakpoint
CREATE TABLE `plugin_webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`webhook_key` text NOT NULL,
	`external_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`duration_ms` integer,
	`error` text,
	`payload` text NOT NULL,
	`headers` text DEFAULT '{}' NOT NULL,
	`started_at` text,
	`finished_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_webhook_deliveries_plugin_idx` ON `plugin_webhook_deliveries` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `plugin_webhook_deliveries_status_idx` ON `plugin_webhook_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `plugin_webhook_deliveries_key_idx` ON `plugin_webhook_deliveries` (`webhook_key`);--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_key` text NOT NULL,
	`package_name` text NOT NULL,
	`version` text NOT NULL,
	`api_version` integer DEFAULT 1 NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`manifest_json` text NOT NULL,
	`status` text DEFAULT 'installed' NOT NULL,
	`install_order` integer,
	`package_path` text,
	`last_error` text,
	`installed_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugins_plugin_key_idx` ON `plugins` (`plugin_key`);--> statement-breakpoint
CREATE INDEX `plugins_status_idx` ON `plugins` (`status`);--> statement-breakpoint
CREATE TABLE `principal_permission_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`principal_type` text NOT NULL,
	`principal_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`scope` text,
	`granted_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `principal_permission_grants_unique_idx` ON `principal_permission_grants` (`company_id`,`principal_type`,`principal_id`,`permission_key`);--> statement-breakpoint
CREATE INDEX `principal_permission_grants_company_permission_idx` ON `principal_permission_grants` (`company_id`,`permission_key`);--> statement-breakpoint
CREATE TABLE `project_goals` (
	`project_id` text NOT NULL,
	`goal_id` text NOT NULL,
	`company_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `goal_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_goals_project_idx` ON `project_goals` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_goals_goal_idx` ON `project_goals` (`goal_id`);--> statement-breakpoint
CREATE INDEX `project_goals_company_idx` ON `project_goals` (`company_id`);--> statement-breakpoint
CREATE TABLE `project_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text DEFAULT 'local_path' NOT NULL,
	`cwd` text,
	`repo_url` text,
	`repo_ref` text,
	`default_ref` text,
	`visibility` text DEFAULT 'default' NOT NULL,
	`setup_command` text,
	`cleanup_command` text,
	`remote_provider` text,
	`remote_workspace_ref` text,
	`shared_workspace_key` text,
	`metadata` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_workspaces_company_project_idx` ON `project_workspaces` (`company_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `project_workspaces_project_primary_idx` ON `project_workspaces` (`project_id`,`is_primary`);--> statement-breakpoint
CREATE INDEX `project_workspaces_project_source_type_idx` ON `project_workspaces` (`project_id`,`source_type`);--> statement-breakpoint
CREATE INDEX `project_workspaces_company_shared_key_idx` ON `project_workspaces` (`company_id`,`shared_workspace_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_workspaces_project_remote_ref_idx` ON `project_workspaces` (`project_id`,`remote_provider`,`remote_workspace_ref`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`goal_id` text,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'backlog' NOT NULL,
	`lead_agent_id` text,
	`target_date` text,
	`color` text,
	`pause_reason` text,
	`paused_at` text,
	`execution_workspace_policy` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_company_idx` ON `projects` (`company_id`);--> statement-breakpoint
CREATE TABLE `workspace_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`execution_workspace_id` text,
	`heartbeat_run_id` text,
	`phase` text NOT NULL,
	`command` text,
	`cwd` text,
	`status` text DEFAULT 'running' NOT NULL,
	`exit_code` integer,
	`log_store` text,
	`log_ref` text,
	`log_bytes` integer,
	`log_sha256` text,
	`log_compressed` integer DEFAULT false NOT NULL,
	`stdout_excerpt` text,
	`stderr_excerpt` text,
	`metadata` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`execution_workspace_id`) REFERENCES `execution_workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`heartbeat_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_operations_company_run_started_idx` ON `workspace_operations` (`company_id`,`heartbeat_run_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `workspace_operations_company_workspace_started_idx` ON `workspace_operations` (`company_id`,`execution_workspace_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `workspace_runtime_services` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text,
	`project_workspace_id` text,
	`execution_workspace_id` text,
	`issue_id` text,
	`scope_type` text NOT NULL,
	`scope_id` text,
	`service_name` text NOT NULL,
	`status` text NOT NULL,
	`lifecycle` text NOT NULL,
	`reuse_key` text,
	`command` text,
	`cwd` text,
	`port` integer,
	`url` text,
	`provider` text NOT NULL,
	`provider_ref` text,
	`owner_agent_id` text,
	`started_by_run_id` text,
	`last_used_at` text NOT NULL,
	`started_at` text NOT NULL,
	`stopped_at` text,
	`stop_policy` text,
	`health_status` text DEFAULT 'unknown' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_workspace_id`) REFERENCES `project_workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`execution_workspace_id`) REFERENCES `execution_workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`started_by_run_id`) REFERENCES `heartbeat_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_runtime_services_company_workspace_status_idx` ON `workspace_runtime_services` (`company_id`,`project_workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_runtime_services_company_execution_workspace_status_idx` ON `workspace_runtime_services` (`company_id`,`execution_workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_runtime_services_company_project_status_idx` ON `workspace_runtime_services` (`company_id`,`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_runtime_services_run_idx` ON `workspace_runtime_services` (`started_by_run_id`);--> statement-breakpoint
CREATE INDEX `workspace_runtime_services_company_updated_idx` ON `workspace_runtime_services` (`company_id`,`updated_at`);