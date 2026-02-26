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
 *     links       String  // JSON: XanaduLink[]
 *     contentHash String? // BLAKE3 hash
 *     authorDid   String? // Future PKI
 *     signature   String? // Future PKI
 *     createdAt   Int     // timestamp_ms
 *     updatedAt   Int     // timestamp_ms
 *   }
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// TYPES (for JSON fields)
// ============================================================================

/**
 * A bit of content - text, media reference, etc
 */
interface AccumulableBit {
  type: 'text' | 'media' | 'link';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Xanadu-style link between posts
 */
interface XanaduLink {
  sourcePostId: number;
  targetPostId: number;
  linkType: 'reply' | 'quote' | 'reference';
  anchorText?: string;
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
  addPost(bits: AccumulableBit[], links?: XanaduLink[]): void {
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
   * List all posts with pagination
   */
  @loom.crud.list({ collection: true })
  listPosts(limit?: number, offset?: number): Post[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a post
   */
  @loom.crud.update
  updatePost(id: number, bits?: AccumulableBit[], links?: XanaduLink[]): boolean {
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

// ============================================================================
// ENTITY (defined AFTER Management to avoid TDZ)
// ============================================================================

/**
 * Post entity - Short-form authored content
 */
@PostMgmt.Entity()
export class Post {
  /** Primary key */
  id!: number;

  /** Content bits (AccumulableBit[]) */
  bits!: AccumulableBit[];

  /** Xanadu links to other posts */
  links!: XanaduLink[];

  /** BLAKE3 content hash for verification */
  contentHash?: string;

  /** Author DID (for future PKI) */
  authorDid?: string;

  /** Signature (for future PKI) */
  signature?: string;

  /** When this post was created */
  createdAt!: number;

  /** When this post was last updated */
  updatedAt!: number;
}
