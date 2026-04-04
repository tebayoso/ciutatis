ALTER TABLE `instance_settings` ADD COLUMN `tenant_provisioning` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `instance_settings` ADD COLUMN `cloudflare_provisioning` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint

ALTER TABLE `tenant_instances` ADD COLUMN `dispatcher_key` text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE `tenant_instances`
SET `dispatcher_key` = ltrim(`path_prefix`, '/')
WHERE `dispatcher_key` = '';
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `dispatch_script_name` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `tenant_d1_database_id` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `tenant_d1_database_name` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `tenant_kv_namespace_id` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `tenant_kv_namespace_title` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `tenant_r2_bucket_name` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `bootstrap_status` text NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `last_deployment_started_at` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `last_deployment_finished_at` text;
--> statement-breakpoint
ALTER TABLE `tenant_instances` ADD COLUMN `last_deployment_error` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_instances_dispatcher_key_idx` ON `tenant_instances` (`dispatcher_key`);
--> statement-breakpoint
CREATE INDEX `tenant_instances_status_idx` ON `tenant_instances` (`status`);
--> statement-breakpoint

CREATE TABLE `tenant_provisioning_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL REFERENCES `tenant_instances`(`id`) ON DELETE cascade,
  `kind` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `trigger` text NOT NULL,
  `step` text DEFAULT 'queued' NOT NULL,
  `attempt` integer DEFAULT 1 NOT NULL,
  `error_code` text,
  `error_message` text,
  `details` text DEFAULT null,
  `started_at` text,
  `finished_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tenant_provisioning_jobs_tenant_idx` ON `tenant_provisioning_jobs` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `tenant_provisioning_jobs_status_idx` ON `tenant_provisioning_jobs` (`status`);
--> statement-breakpoint
CREATE INDEX `tenant_provisioning_jobs_created_at_idx` ON `tenant_provisioning_jobs` (`created_at`);
