/**
 * Drizzle Schema
 * 
 * Database schema definitions for TheStream™ architecture.
 * Used by drizzle-kit to generate migrations.
 */

import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// ============================================
// TheStream™ Core
// ============================================

export const thestream = sqliteTable('thestream', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seenAt: integer('seen_at', { mode: 'timestamp_ms' }).notNull(),
  
  // Polymorphic FKs: exactly ONE is non-null per row
  personId: integer('person_id'),
  postId: integer('post_id'),
  mediaId: integer('media_id'),
  bookmarkId: integer('bookmark_id'),
  conversationId: integer('conversation_id'),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

// ============================================
// Streamable Entities
// ============================================

export const person = sqliteTable('person', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  handle: text('handle'),
  avatarMediaId: integer('avatar_media_id'),
  metadata: text('metadata', { mode: 'json' }),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const post = sqliteTable('post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bits: text('bits', { mode: 'json' }).notNull(), // AccumulableBit[]
  links: text('links', { mode: 'json' }).notNull().default('[]'), // XanaduLink[]
  
  // Future PKI fields
  contentHash: text('content_hash'),
  authorDid: text('author_did'),
  signature: text('signature'),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentHash: text('content_hash'),
  mimeType: text('mime_type').notNull(),
  uri: text('uri').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  metadata: text('metadata', { mode: 'json' }),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const bookmark = sqliteTable('bookmark', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  title: text('title'),
  notes: text('notes'),
  creationContext: text('creation_context', { mode: 'json' }).notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const conversation = sqliteTable('conversation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title'),
  content: text('content', { mode: 'json' }).notNull(),
  captureTime: integer('capture_time', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  firstEntryTime: integer('first_entry_time', { mode: 'timestamp_ms' }),
  lastEntryTime: integer('last_entry_time', { mode: 'timestamp_ms' }),
  sourceUrl: text('source_url'),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

// ============================================
// Junction Tables
// ============================================

export const conversationParticipant = sqliteTable('conversation_participant', {
  conversationId: integer('conversation_id').notNull().references(() => conversation.id, { onDelete: 'cascade' }),
  personId: integer('person_id').notNull().references(() => person.id, { onDelete: 'cascade' }),
  role: text('role'),
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.personId] }),
}));

export const conversationMedia = sqliteTable('conversation_media', {
  conversationId: integer('conversation_id').notNull().references(() => conversation.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  context: text('context', { mode: 'json' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.mediaId] }),
}));

// ============================================
// Views
// ============================================

export const view = sqliteTable('view', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  viewIndex: integer('view_index').notNull().unique(),
  label: text('label'),
  badge: text('badge').notNull().default('FEED'),
  filters: text('filters', { mode: 'json' }).notNull(),
  sortBy: text('sort_by').notNull().default('recent'),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isThestream: integer('is_thestream', { mode: 'boolean' }).notNull().default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

// ============================================
// Session and Metadata
// ============================================

export const sessionState = sqliteTable('session_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const inputDraft = sqliteTable('input_draft', {
  type: text('type').primaryKey(),
  content: text('content').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const schemaMeta = sqliteTable('schema_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  version: integer('version').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});
