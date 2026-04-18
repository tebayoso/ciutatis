CREATE TABLE `public_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `issue_id` text NOT NULL REFERENCES `issues`(`id`) ON DELETE cascade,
  `company_id` text NOT NULL REFERENCES `companies`(`id`) ON DELETE cascade,
  `public_id` text NOT NULL,
  `institution_slug` text NOT NULL,
  `submission_mode` text NOT NULL,
  `owner_user_id` text,
  `contact_name` text,
  `contact_email` text,
  `recovery_token_hash` text,
  `category` text NOT NULL,
  `location_label` text,
  `public_title` text NOT NULL,
  `public_summary` text NOT NULL,
  `public_description` text NOT NULL,
  `public_status` text NOT NULL DEFAULT 'received',
  `pii_detected` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_requests_issue_id_idx` ON `public_requests` (`issue_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_requests_public_id_idx` ON `public_requests` (`public_id`);
--> statement-breakpoint
CREATE INDEX `public_requests_company_status_idx` ON `public_requests` (`company_id`, `public_status`);
--> statement-breakpoint
CREATE INDEX `public_requests_institution_slug_idx` ON `public_requests` (`institution_slug`);
--> statement-breakpoint
CREATE INDEX `public_requests_owner_user_idx` ON `public_requests` (`owner_user_id`);
--> statement-breakpoint

CREATE TABLE `public_request_updates` (
  `id` text PRIMARY KEY NOT NULL,
  `public_request_id` text NOT NULL REFERENCES `public_requests`(`id`) ON DELETE cascade,
  `issue_id` text NOT NULL REFERENCES `issues`(`id`) ON DELETE cascade,
  `company_id` text NOT NULL REFERENCES `companies`(`id`) ON DELETE cascade,
  `kind` text NOT NULL DEFAULT 'system',
  `actor_label` text NOT NULL,
  `body` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `public_request_updates_public_request_idx` ON `public_request_updates` (`public_request_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `public_request_updates_issue_idx` ON `public_request_updates` (`issue_id`);
