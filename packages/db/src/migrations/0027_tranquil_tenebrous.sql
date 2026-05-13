ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "execution_workspace_settings" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "execution_workspace_policy" jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "env" jsonb;
