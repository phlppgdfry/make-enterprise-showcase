CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`outcome` text NOT NULL,
	`execution_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_expiry` ON `audit_events` (`expires_at`);--> statement-breakpoint
CREATE TABLE `budget` (
	`id` integer PRIMARY KEY NOT NULL,
	`used_centi` integer DEFAULT 0 NOT NULL,
	`reserved_centi` integer DEFAULT 0 NOT NULL,
	`limit_centi` integer DEFAULT 5000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integration_cache` (
	`name` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`observed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`workflow` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`status` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text,
	`error_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`reserved_centi` integer DEFAULT 0 NOT NULL,
	`charged_centi` integer,
	`upstream_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `execution_idempotency` ON `executions` (`owner`,`workflow`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `execution_owner_created` ON `executions` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `execution_expiry` ON `executions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`source_url` text NOT NULL,
	`data_json` text NOT NULL,
	`digest` text NOT NULL,
	`observed_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_domain` ON `leads` (`domain`);--> statement-breakpoint
CREATE INDEX `lead_expiry` ON `leads` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_expiry` ON `rate_limits` (`reset_at`);