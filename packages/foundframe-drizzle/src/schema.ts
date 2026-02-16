/**
 * Drizzle Schema for Migration Generation
 *
 * TheStream™ Architecture:
 * - thestream: temporal experience log with polymorphic FKs
 * - media, bookmark, post, person, conversation: streamable entities
 * - view: lens configurations for filtering the stream
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

  // PKB Integration: track entries from Personal Knowledge Base
  // Full directory path (e.g., "notes/diary/2024", "screenshots/vacation")
  directory: text('directory'),
  // Entry type discriminator for PKB entries
  kind: text('kind'), // 'media' | 'post' | 'bookmark' | 'person' | 'conversation'
  // BLAKE3 content hash for verification (32 bytes as hex string)
  contentHash: text('content_hash'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

// ============================================
// Streamable Entities
// ============================================

export const person = sqliteTable('person', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  handle: text('handle'), // @username or similar
  avatarMediaId: integer('avatar_media_id'),
  metadata: text('metadata', { mode: 'json' }), // extensible: DID, KERI AID, etc

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

export const post = sqliteTable('post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bits: text('bits', { mode: 'json' }).notNull(), // AccumulableBit[]
  links: text('links', { mode: 'json' }).notNull().default('[]'), // XanaduLink[]

  // Future PKI fields (for Y2+ content addressing)
  contentHash: text('content_hash'), // TODO: implement content hashing
  authorDid: text('author_did'), // TODO: link to person when PKI implemented
  signature: text('signature'), // TODO: KERI signature

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentHash: text('content_hash'), // TODO: implement deduplication
  mimeType: text('mime_type').notNull(),
  uri: text('uri').notNull(), // local path or remote URL
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'), // for audio/video
  metadata: text('metadata', { mode: 'json' }), // camera info, location, etc

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

export const bookmark = sqliteTable('bookmark', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  title: text('title'),
  notes: text('notes'), // user's annotations
  creationContext: text('creation_context', { mode: 'json' }).notNull(), // browsing history

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

export const conversation = sqliteTable('conversation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title'),
  content: text('content', { mode: 'json' }).notNull(), // [{ author, text, timestamp, ... }]
  captureTime: integer('capture_time', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  firstEntryTime: integer('first_entry_time', { mode: 'timestamp_ms' }), // external time
  lastEntryTime: integer('last_entry_time', { mode: 'timestamp_ms' }), // external time
  sourceUrl: text('source_url'), // where this came from

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

// ============================================
// Junction Tables
// ============================================

export const conversationParticipant = sqliteTable(
  'conversation_participant',
  {
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    personId: integer('person_id')
      .notNull()
      .references(() => person.id, { onDelete: 'cascade' }),
    role: text('role') // "author", "recipient", "cc", etc
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.personId] })
  })
);

export const conversationMedia = sqliteTable(
  'conversation_media',
  {
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    mediaId: integer('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    context: text('context', { mode: 'json' }) // { "attached_to_entry": 3, "caption": "..." }
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.mediaId] })
  })
);

// ============================================
// Views: lens configurations for TheStream™
// ============================================

export const view = sqliteTable('view', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  viewIndex: integer('view_index').notNull().unique(), // position in reel
  label: text('label'),
  badge: text('badge').notNull().default('FEED'), // 'FEED' | 'SEARCH' | 'PEOPLE' | etc
  filters: text('filters', { mode: 'json' }).notNull(), // ViewFilters
  sortBy: text('sort_by').notNull().default('recent'), // 'recent' | 'oldest'
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isThestream: integer('is_thestream', { mode: 'boolean' }).notNull().default(false), // TheStream™

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

// ============================================
// PKB Sync Log
// ============================================

export const syncLog = sqliteTable('sync_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Directory that was synced (full path)
  directory: text('directory').notNull(),
  // When the sync started
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  // When the sync completed (null if failed)
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  // Number of entries pulled
  entriesPulled: integer('entries_pulled').default(0),
  // Number of entries pushed
  entriesPushed: integer('entries_pushed').default(0),
  // Error message (if failed)
  error: text('error'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

// ============================================
// Session and Metadata
// ============================================

export const sessionState = sqliteTable('session_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

export const inputDraft = sqliteTable('input_draft', {
  type: text('type').primaryKey(), // 'text' | 'link' | 'person'
  content: text('content').notNull(), // JSON stringified
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});

export const schemaMeta = sqliteTable('schema_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  version: integer('version').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow()
});
