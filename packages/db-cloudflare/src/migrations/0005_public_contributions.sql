CREATE TABLE `public_contributions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `content_hash` text NOT NULL,
  `filename` text NOT NULL,
  `content_type` text,
  `status` text NOT NULL,
  `document_id` text,
  `classification_label` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `public_contributions_user_created_idx` ON `public_contributions` (`user_id`,`created_at`);
