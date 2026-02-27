/**
 * Stream entities
 * TheStream™ - temporal experience log
 */

import type { Person } from './person.js';
import type { Post } from './post.js';
import type { Media } from './media.js';
import type { Bookmark } from './bookmark.js';
import type { Conversation } from './conversation.js';

/** Types of content that can appear in the stream */
export type StreamChunkType = 'person' | 'post' | 'media' | 'bookmark' | 'conversation';

/** A polymorphic chunk in TheStream™ */
export type StreamChunk =
  | { type: 'person'; id: number; entity: Person }
  | { type: 'post'; id: number; entity: Post }
  | { type: 'media'; id: number; entity: Media }
  | { type: 'bookmark'; id: number; entity: Bookmark }
  | { type: 'conversation'; id: number; entity: Conversation };

/** An entry in TheStream™ - records when content was experienced */
export interface StreamEntry {
  id: number;
  seenAt: Date; // when YOU experienced it (not created!)
  chunk: StreamChunk; // the polymorphic content
  createdAt: Date;
  updatedAt?: Date;
}

/** Properties required to add to stream */
export interface CreateStreamEntry {
  type: StreamChunkType;
  entityId: number;
  seenAt?: Date; // defaults to now
}

/** Properties required to add to stream */
export interface UpdateStreamEntry {
  id: number;
  data: {
    type: StreamChunkType;
    entityId: number;
    seenAt?: Date; // defaults to now
  };
}

/** Filter criteria for stream queries */
export interface StreamFilter {
  dateRange?: { from?: Date; to?: Date }; // filter by seenAt
  chunkTypes?: StreamChunkType[]; // filter by type
  sortBy?: 'recent' | 'oldest';
  pagination?: { limit?: number; offset?: number };
}

/** Aliases for TheStream stuff to matche loom default naming */
export type TheStreamEntryFilter = StreamFilter;
export type TheStreamEntry = StreamEntry;
export type UpdateTheStreamEntry = UpdateStreamEntry;
export type CreateTheStreamEntry = CreateStreamEntry;
