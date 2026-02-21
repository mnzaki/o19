/**
 * Bookmark Management - Surface Imprint
 * 
 * A bookmark is a URL + context (title, notes) saved to TheStream™.
 * Represents the "accumulation of becoming"—capturing what matters.
 * 
 * Reach: Global (extends from Core to Front)
 * 
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import { reach, Management, crud } from '@o19/spire-loom';

@reach('Global')
class BookmarkMgmt extends Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================
  
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
  MAX_NOTES_LENGTH = 2000
  DEFAULT_DIRECTORY = 'bookmarks'
  GIT_BRANCH = 'main'
  
  // ========================================================================
  // CRUD METHODS
  // ========================================================================
  
  /**
   * Add a bookmark to the stream
   */
  @crud('create')
  addBookmark(url: string, title?: string, notes?: string): string {
    throw new Error('Imprint only');
  }

  /**
   * Get a bookmark by its PKB URL
   */
  @crud('read')
  getBookmark(pkbUrl: string): Bookmark {
    throw new Error('Imprint only');
  }

  /**
   * List all bookmarks in a directory
   */
  @crud('list', { collection: true })
  listBookmarks(directory?: string): string[] {
    throw new Error('Imprint only');
  }

  /**
   * Delete a bookmark (soft delete)
   */
  @crud('delete', { soft: true })
  deleteBookmark(pkbUrl: string): boolean {
    throw new Error('Imprint only');
  }
}

/**
 * Bookmark data structure
 */
interface Bookmark {
  url: string
  title?: string
  notes?: string
  seenAt: number
  pkbUrl: string
  commitHash: string
}

/**
 * Export the Management class for collector
 */
export { BookmarkMgmt };
