/**
 * Post Management - Surface Imprint
 *
 * Posts (short-form content) saved to TheStream™.
 * Represents the "expression of self"—capturing thoughts and moments.
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './WARP.js';

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class PostMgmt extends loom.Management {
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
  addPost(
    content: string,
    title?: string,
    tags?: string[]
  ): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a post by its PKB URL
   */
  @loom.crud.read
  getPostByUrl(pkbUrl: string): Post {
    throw new Error('Imprint only');
  }

  /**
   * List all posts in a directory
   */
  @loom.crud.list({ collection: true })
  listPosts(directory?: string): string[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a post
   */
  @loom.crud.update
  updatePost(
    pkbUrl: string,
    content: string,
    title?: string
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Delete a post (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deletePost(pkbUrl: string): boolean {
    throw new Error('Imprint only');
  }
}

/**
 * Post data structure
 */
interface Post {
  content: string;
  title?: string;
  tags?: string[];
  seenAt: number;
  updatedAt?: number;
  pkbUrl: string;
  commitHash: string;
}

/**
 * Export the Management class for collector
 */
export { PostMgmt };
