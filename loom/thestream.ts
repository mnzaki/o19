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
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// MANAGEMENT (must be defined before Entity to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class TheStreamMgmt extends loom.Management {
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
   */
  @loom.crud.list({ collection: true })
  getEntries(
    limit?: number,
    before?: number // seenAt timestamp for pagination
  ): TheStreamEntry[] {
    throw new Error('Imprint only');
  }

  /**
   * Get entries filtered by kind
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
}

/**
 * TheStream entry - Temporal experience log
 *
 * Each entry represents something the user encountered at a specific time.
 * Uses polymorphic FKs to reference different entity types.
 */
@TheStreamMgmt.Entity()
export class TheStreamEntry {
  /** Primary key */
  id!: number;

  /** When the user saw/experienced this (user-controlled timestamp) */
  seenAt!: number;

  /** Polymorphic: Person reference (null if not a person entry) */
  personId?: number;

  /** Polymorphic: Post reference (null if not a post entry) */
  postId?: number;

  /** Polymorphic: Media reference (null if not a media entry) */
  mediaId?: number;

  /** Polymorphic: Bookmark reference (null if not a bookmark entry) */
  bookmarkId?: number;

  /** Polymorphic: Conversation reference (null if not a conversation entry) */
  conversationId?: number;

  /** PKB directory path (e.g., "notes/diary/2024") */
  directory?: string;

  /** Entity kind tag */
  kind?: 'media' | 'post' | 'bookmark' | 'person' | 'conversation';

  /** BLAKE3 content hash for verification */
  contentHash?: string;

  /** When this entry was created (system timestamp) */
  createdAt!: number;
}
