CREATE TABLE "tenant_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"municipality_name" text NOT NULL,
	"country_code" text NOT NULL,
	"city_slug" text NOT NULL,
	"short_code" text NOT NULL,
	"routing_mode" text DEFAULT 'path' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"path_prefix" text NOT NULL,
	"hostname" text,
	"worker_name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_instances_path_prefix_idx" ON "tenant_instances" USING btree ("path_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_instances_hostname_idx" ON "tenant_instances" USING btree ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_instances_worker_name_idx" ON "tenant_instances" USING btree ("worker_name");
