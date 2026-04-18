CREATE TABLE "public_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL REFERENCES "issues"("id") ON DELETE cascade,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "public_id" text NOT NULL,
  "institution_slug" text NOT NULL,
  "submission_mode" text NOT NULL,
  "owner_user_id" text,
  "contact_name" text,
  "contact_email" text,
  "recovery_token_hash" text,
  "category" text NOT NULL,
  "location_label" text,
  "public_title" text NOT NULL,
  "public_summary" text NOT NULL,
  "public_description" text NOT NULL,
  "public_status" text DEFAULT 'received' NOT NULL,
  "pii_detected" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "public_requests_issue_id_idx" ON "public_requests" USING btree ("issue_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "public_requests_public_id_idx" ON "public_requests" USING btree ("public_id");
--> statement-breakpoint
CREATE INDEX "public_requests_company_status_idx" ON "public_requests" USING btree ("company_id", "public_status");
--> statement-breakpoint
CREATE INDEX "public_requests_institution_slug_idx" ON "public_requests" USING btree ("institution_slug");
--> statement-breakpoint
CREATE INDEX "public_requests_owner_user_idx" ON "public_requests" USING btree ("owner_user_id");
--> statement-breakpoint

CREATE TABLE "public_request_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_request_id" uuid NOT NULL REFERENCES "public_requests"("id") ON DELETE cascade,
  "issue_id" uuid NOT NULL REFERENCES "issues"("id") ON DELETE cascade,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "kind" text DEFAULT 'system' NOT NULL,
  "actor_label" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "public_request_updates_public_request_idx" ON "public_request_updates" USING btree ("public_request_id", "created_at");
--> statement-breakpoint
CREATE INDEX "public_request_updates_issue_idx" ON "public_request_updates" USING btree ("issue_id");

