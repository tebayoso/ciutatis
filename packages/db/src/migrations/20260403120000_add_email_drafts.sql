CREATE TYPE "public"."email_draft_status" AS ENUM('draft', 'sent', 'scheduled');--> statement-breakpoint
CREATE TABLE "email_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"content_html" text,
	"content_text" text,
	"recipients" jsonb,
	"template_id" text,
	"status" "email_draft_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_drafts_company_status_idx" ON "email_drafts" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "email_drafts_company_deleted_idx" ON "email_drafts" USING btree ("company_id","deleted_at");
