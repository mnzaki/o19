CREATE TABLE `input_drafts` (
	`type` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`bits` text NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`modified_at` integer,
	`content_hash` text,
	`author_did` text,
	`signature` text
);
--> statement-breakpoint
CREATE TABLE `schema_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `views` (
	`id` text PRIMARY KEY NOT NULL,
	`view_index` integer NOT NULL,
	`filters` text NOT NULL,
	`sort_by` text NOT NULL,
	`label` text,
	`created_at` integer NOT NULL,
	`is_feed` integer DEFAULT false NOT NULL
);
