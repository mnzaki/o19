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
  seenAt: Date;                    // when YOU experienced it (not created!)
  chunk: StreamChunk;              // the polymorphic content
  createdAt: Date;
  updatedAt?: Date;
}

/** Properties required to add to stream */
export interface AddToStream {
  type: StreamChunkType;
  entityId: number;
  seenAt?: Date;                   // defaults to now
}

/** Filters for querying the stream */
export interface StreamFilters {
  dateRange?: { from?: Date; to?: Date }; // filter by seenAt
  chunkTypes?: StreamChunkType[];   // filter by type
  sortBy?: 'recent' | 'oldest';
  pagination?: { limit?: number; offset?: number };
}
