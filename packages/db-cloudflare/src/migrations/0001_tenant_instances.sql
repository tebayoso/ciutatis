CREATE TABLE `tenant_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`municipality_name` text NOT NULL,
	`country_code` text NOT NULL,
	`city_slug` text NOT NULL,
	`short_code` text NOT NULL,
	`routing_mode` text DEFAULT 'path' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`path_prefix` text NOT NULL,
	`hostname` text,
	`worker_name` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_instances_path_prefix_idx` ON `tenant_instances` (`path_prefix`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_instances_hostname_idx` ON `tenant_instances` (`hostname`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_instances_worker_name_idx` ON `tenant_instances` (`worker_name`);
