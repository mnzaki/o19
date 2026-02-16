CREATE TABLE `bookmark` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`notes` text,
	`creation_context` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`capture_time` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`first_entry_time` integer,
	`last_entry_time` integer,
	`source_url` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversation_media` (
	`conversation_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`context` text,
	PRIMARY KEY(`conversation_id`, `media_id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversation_participant` (
	`conversation_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`role` text,
	PRIMARY KEY(`conversation_id`, `person_id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `input_draft` (
	`type` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_hash` text,
	`mime_type` text NOT NULL,
	`uri` text NOT NULL,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `person` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`handle` text,
	`avatar_media_id` integer,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bits` text NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`content_hash` text,
	`author_did` text,
	`signature` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schema_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` integer NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`directory` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`entries_pulled` integer DEFAULT 0,
	`entries_pushed` integer DEFAULT 0,
	`error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `thestream` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seen_at` integer NOT NULL,
	`person_id` integer,
	`post_id` integer,
	`media_id` integer,
	`bookmark_id` integer,
	`conversation_id` integer,
	`directory` text,
	`kind` text,
	`content_hash` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `view` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`view_index` integer NOT NULL,
	`label` text,
	`badge` text DEFAULT 'FEED' NOT NULL,
	`filters` text NOT NULL,
	`sort_by` text DEFAULT 'recent' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`is_thestream` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `view_view_index_unique` ON `view` (`view_index`);