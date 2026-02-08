/**
 * Drizzle Schema for Migration Generation
 * 
 * This file is used ONLY by drizzle-kit to generate SQL migrations.
 * The runtime code uses raw SQL via Tauri SQL plugin.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Posts table - the accumulated becoming
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  bits: text('bits', { mode: 'json' }).notNull(),
  links: text('links', { mode: 'json' }).notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  modifiedAt: integer('modified_at', { mode: 'timestamp_ms' }),
  // Future PKI fields
  contentHash: text('content_hash'),
  authorDid: text('author_did'),
  signature: text('signature')
});

// Views table - the reel of perspectives
export const views = sqliteTable('views', {
  id: text('id').primaryKey(),
  viewIndex: integer('view_index').notNull(),
  filters: text('filters', { mode: 'json' }).notNull(),
  sortBy: text('sort_by').notNull(),
  label: text('label'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  isFeed: integer('is_feed', { mode: 'boolean' }).notNull().default(false)
});

// Session state - continuity across restarts
export const sessionState = sqliteTable('session_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

// Input drafts - unfinished thoughts
export const inputDrafts = sqliteTable('input_drafts', {
  type: text('type').primaryKey(),
  content: text('content').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

// Schema metadata - version tracking
export const schemaMeta = sqliteTable('schema_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  version: integer('version').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

// People table - for mentions and tagging
export const people = sqliteTable('people', {
  did: text('did').primaryKey(),
  displayName: text('display_name').notNull(),
  avatarUri: text('avatar_uri'),
  bio: text('bio'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
});

// Link previews - cached webpage metadata
export const linkPreviews = sqliteTable('link_previews', {
  url: text('url').primaryKey(),
  title: text('title'),
  description: text('description'),
  imageUrl: text('image_url'),  // Primary/main image
  images: text('images', { mode: 'json' }),  // Array of all images (up to 10)
  siteName: text('site_name'),
  // When this preview was fetched (for cache invalidation)
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
  // Error message if fetch failed
  error: text('error')
});
