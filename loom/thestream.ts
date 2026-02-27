/**
 * TheStream™ Management - Surface Imprint
 *
 * The temporal experience log - a unified timeline of all encounters.
 * Represents the "flow of becoming"—capturing what we experience in time.
 *
 * Database Schema (prisma):
 *   TheStream {
 *     id             Int     @id @default(autoincrement())
 *     seenAt         Int     // When user saw this (timestamp_ms)
 *     // Polymorphic FKs: exactly ONE is non-null per row
 *     personId       Int?
 *     postId         Int?
 *     mediaId        Int?
 *     bookmarkId     Int?
 *     conversationId Int?
 *     // PKB Integration
 *     directory      String? // Full directory path
 *     kind           String? // 'media' | 'post' | 'bookmark' | 'person' | 'conversation'
 *     contentHash    String? // BLAKE3 hash
 *     createdAt      Int     // timestamp_ms
 *   }
 *
 * Reach: Global (extends from Core to Front)
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';
import type { TheStreamEntry } from '@o19/foundframe-front/domain';
// ============================================================================
// FILTER TYPE
// ============================================================================

/**
 * Filter criteria for TheStreamEntry list queries.
 * All fields are optional - only specified filters are applied.
 */
export interface TheStreamEntryFilter {
  /** Filter by entry kind ('media', 'post', 'bookmark', 'person', 'conversation') */
  kind?: string;
  /** Filter by directory path */
  directory?: string;
  /** Filter by content hash */
  contentHash?: string;
  /** Filter by person reference */
  personId?: number;
  /** Filter by post reference */
  postId?: number;
  /** Filter by media reference */
  mediaId?: number;
  /** Filter by bookmark reference */
  bookmarkId?: number;
  /** Filter by conversation reference */
  conversationId?: number;
  /** Only return entries with seenAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with seenAt <= this timestamp (inclusive) */
  before?: number;
}

// ============================================================================
// MANAGEMENT (must be defined before Entity to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class TheStreamMgmt extends loom.Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================

  DEFAULT_PAGE_SIZE = 50;
  MAX_PAGE_SIZE = 500;

  // ========================================================================
  // STREAM OPERATIONS
  // ========================================================================

  /**
   * Get entries from the stream (newest first)
   *
   * @param limit - Maximum number of entries to return
   * @param offset - Number of entries to skip (for pagination)
   * @param filter - Optional filter criteria for advanced querying
   *
   * @example
   * // Basic pagination
   * getEntries(50, 0)
   *
   * // Only posts
   * getEntries(50, 0, { kind: 'post' })
   *
   * // Media from a specific time range
   * getEntries(50, 0, {
   *   kind: 'media',
   *   after: Date.now() - 86400000,
   *   before: Date.now()
   * })
   *
   * // By specific entity reference
   * getEntries(50, 0, { personId: 42 })
   */
  @loom.crud.list({ collection: true })
  getEntries(limit?: number, offset?: number, filter?: TheStreamEntryFilter): TheStreamEntry[] {
    throw new Error('Imprint only');
  }

  /**
   * Get entries filtered by kind (convenience method)
   */
  getEntriesByKind(
    kind: 'media' | 'post' | 'bookmark' | 'person' | 'conversation',
    limit?: number,
    before?: number
  ): TheStreamEntry[] {
    throw new Error('Imprint only');
  }

  /**
   * Get a single entry by ID
   */
  @loom.crud.read
  getEntry(id: number): TheStreamEntry {
    throw new Error('Imprint only');
  }

  /**
   * Delete an entry (removes from stream, not the entity)
   */
  @loom.crud.delete_
  deleteEntry(id: number): boolean {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // AGGREGATION OPERATIONS
  // ========================================================================

  /**
   * Get stream statistics
   */
  getStats(
    from?: number, // timestamp
    to?: number // timestamp
  ): {
    total: number;
    byKind: Record<string, number>;
  } {
    throw new Error('Imprint only');
  }

  /**
   * Search the stream
   */
  search(query: string, kinds?: string[], limit?: number): TheStreamEntry[] {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // ADD OPERATIONS (add entities to the stream)
  // ========================================================================

  /**
   * Add a bookmark to the stream
   */
  addBookmark(bookmarkId: number, seenAt?: number): TheStreamEntry {
    throw new Error('Imprint only');
  }

  /**
   * Add a post to the stream
   */
  addPost(postId: number, seenAt?: number): TheStreamEntry {
    throw new Error('Imprint only');
  }

  /**
   * Add media to the stream
   */
  addMedia(mediaId: number, seenAt?: number): TheStreamEntry {
    throw new Error('Imprint only');
  }

  /**
   * Add a person to the stream
   */
  addPerson(personId: number, seenAt?: number): TheStreamEntry {
    throw new Error('Imprint only');
  }

  /**
   * Add a conversation to the stream
   */
  addConversation(conversationId: number, seenAt?: number): TheStreamEntry {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

/**
 * TheStream entry - Temporal experience log
 *
 * Each entry represents something the user encountered at a specific time.
 * Uses polymorphic FKs to reference different entity types.
 */
@TheStreamMgmt.Entity()
export class StreamEntry {
  id = crud.field.id();
  seenAt = crud.field.int();
  personId = crud.field.int({ nullable: true });
  postId = crud.field.int({ nullable: true });
  mediaId = crud.field.int({ nullable: true });
  bookmarkId = crud.field.int({ nullable: true });
  conversationId = crud.field.int({ nullable: true });
  directory = crud.field.string({ nullable: true });
  kind = crud.field.string({ nullable: true });
  contentHash = crud.field.string({ nullable: true });
  createdAt = crud.field.createdAt();
}

export { TheStreamMgmt };
export type ListFilter = TheStreamEntryFilter;
