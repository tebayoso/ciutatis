ALTER TABLE "instance_settings"
  ADD COLUMN "tenant_provisioning" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "instance_settings"
  ADD COLUMN "cloudflare_provisioning" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint

ALTER TABLE "tenant_instances"
  ADD COLUMN "dispatcher_key" text;
--> statement-breakpoint
UPDATE "tenant_instances"
SET "dispatcher_key" = trim(leading '/' from "path_prefix")
WHERE "dispatcher_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ALTER COLUMN "dispatcher_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "dispatch_script_name" text;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "tenant_d1_database_id" text;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "tenant_d1_database_name" text;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "tenant_kv_namespace_id" text;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "tenant_kv_namespace_title" text;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "tenant_r2_bucket_name" text;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "bootstrap_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "last_deployment_started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "last_deployment_finished_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tenant_instances"
  ADD COLUMN "last_deployment_error" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_instances_dispatcher_key_idx" ON "tenant_instances" USING btree ("dispatcher_key");
--> statement-breakpoint
CREATE INDEX "tenant_instances_status_idx" ON "tenant_instances" USING btree ("status");
--> statement-breakpoint

CREATE TABLE "tenant_provisioning_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant_instances"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "trigger" text NOT NULL,
  "step" text DEFAULT 'queued' NOT NULL,
  "attempt" integer DEFAULT 1 NOT NULL,
  "error_code" text,
  "error_message" text,
  "details" jsonb DEFAULT null,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tenant_provisioning_jobs_tenant_idx" ON "tenant_provisioning_jobs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "tenant_provisioning_jobs_status_idx" ON "tenant_provisioning_jobs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "tenant_provisioning_jobs_created_at_idx" ON "tenant_provisioning_jobs" USING btree ("created_at");
