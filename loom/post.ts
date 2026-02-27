/**
 * Post Management - Surface Imprint
 *
 * Posts (short-form content) saved to TheStream™.
 * Represents the "expression of self"—capturing thoughts and moments.
 *
 * Database Schema (prisma):
 *   Post {
 *     id          Int     @id @default(autoincrement())
 *     bits        String  // JSON: AccumulableBit[]
 *     // links removed - now using bits with LinkPreview type
 *     contentHash String? // BLAKE3 hash
 *     authorDid   String? // Future PKI
 *     signature   String? // Future PKI
 *     createdAt   Int     // timestamp_ms
 *     updatedAt   Int     // timestamp_ms
 *   }
 *
 * Reach: Global (extends from Core to Front)
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';
// TODO much later we actually move these interfaces directly to here
import { type AccumulableBit } from '@o19/foundframe-front/domain';

// ============================================================================
// FILTER TYPE
// ============================================================================

/**
 * Filter criteria for Post list queries.
 * All fields are optional - only specified filters are applied.
 */
export interface PostFilter {
  /** Filter by content hash (exact match) */
  contentHash?: string;
  /** Filter by author DID (exact match) */
  authorDid?: string;
  /** Only return entries with createdAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with createdAt <= this timestamp (inclusive) */
  before?: number;
}

// ============================================================================
// MANAGEMENT (defined FIRST to avoid TDZ errors)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class PostMgmt extends loom.Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================

  MAX_CONTENT_LENGTH = 50000; // ~10k words
  MAX_TITLE_LENGTH = 200;
  DEFAULT_DIRECTORY = 'posts';
  GIT_BRANCH = 'main';

  // ========================================================================
  // CRUD METHODS
  // ========================================================================

  /**
   * Add a post to the stream
   */
  @loom.crud.create
  addPost(bits: AccumulableBit[]): number {
    throw new Error('Imprint only');
  }

  /**
   * Get a post by ID
   */
  @loom.crud.read
  getPost(id: number): Post {
    throw new Error('Imprint only');
  }

  /**
   * List posts with optional filtering.
   *
   * @example
   * // Basic pagination
   * listPosts(50, 0)
   *
   * // By author (when PKI is enabled)
   * listPosts(50, 0, { authorDid: 'did:keri:...' })
   *
   * // Recent posts
   * listPosts(50, 0, { after: Date.now() - 86400000 })
   */
  @loom.crud.list({ collection: true })
  listPosts(limit?: number, offset?: number, filter?: PostFilter): Post[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a post
   */
  @loom.crud.update
  updatePost(id: number, bits?: AccumulableBit[]): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Delete a post (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deletePost(id: number): boolean {
    throw new Error('Imprint only');
  }
}

@PostMgmt.Entity()
export class Post {
  id = crud.field.id();
  bits = crud.field.json<AccumulableBit[]>();
  contentHash = crud.field.string({ nullable: true });
  authorDid = crud.field.string({ nullable: true });
  signature = crud.field.string({ nullable: true });
  createdAt = crud.field.createdAt();
  updatedAt = crud.field.updatedAt();
}
