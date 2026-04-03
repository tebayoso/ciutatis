-- Add indexes to Better Auth session table for fast lookups
-- The session table was created in 0000_warm_human_robot.sql
-- This migration adds missing indexes for:
--   1. user_id: fast session lookup by user
--   2. token: unique constraint for session token lookups

CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_idx` ON `session` (`token`);
