ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "attachment_max_bytes" integer DEFAULT 10485760 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"related_issue_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_related_issue_id_issues_id_fk" FOREIGN KEY ("related_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "issue_relations" ADD CONSTRAINT "issue_relations_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_relations_company_issue_idx" ON "issue_relations" USING btree ("company_id","issue_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_relations_company_related_issue_idx" ON "issue_relations" USING btree ("company_id","related_issue_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_relations_company_type_idx" ON "issue_relations" USING btree ("company_id","type");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "issue_relations_company_edge_uq" ON "issue_relations" USING btree ("company_id","issue_id","related_issue_id","type");
