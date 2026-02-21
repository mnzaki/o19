/**
 * Bookmark Management - Surface Imprint
 * 
 * A bookmark is a URL + context (title, notes) saved to TheStream™.
 * Represents the "accumulation of becoming"—capturing what matters.
 * 
 * Reach: Global (extends from Core to Front)
 * 
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 * - No `export` keywords (implied)
 * - No `static readonly` (constants are implied)
 * - No async/Promise (sync interface, generators add async per-ring)
 * - No implementations (pure shape, rings provide the substance)
 */

import { reach, Management, crud } from '@o19/spire-loom';

@reach Global
abstract BookmarkMgmt extends Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================
  
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
  MAX_NOTES_LENGTH = 2000
  DEFAULT_DIRECTORY = 'bookmarks'
  GIT_BRANCH = 'main'
  
  // ========================================================================
  // METHODS (sync interface - asyncness added by generators per-ring)
  // ========================================================================
  
  /**
   * Add a bookmark to the stream
   * 
   * @param url - The URL to bookmark (required, must match VALID_URL_REGEX)
   * @param title - Optional title (fetched from page if empty)
   * @param notes - Optional notes about the bookmark
   * @returns The PKB URL reference to the created bookmark
   */
  @crud('create')
  addBookmark(url: string, title?: string, notes?: string): string

  /**
   * Get a bookmark by its PKB URL
   * 
   * @param pkbUrl - The content-addressed reference
   * @returns The bookmark data
   */
  @crud('read')
  getBookmark(pkbUrl: string): Bookmark

  /**
   * List all bookmarks in a directory
   * 
   * @param directory - Optional directory filter (default: DEFAULT_DIRECTORY)
   * @returns Array of bookmark PKB URLs
   */
  @crud('list', { collection: true })
  listBookmarks(directory?: string): string[]

  /**
   * Delete a bookmark
   * 
   * Note: In PKB, this is a soft delete (content remains, reference removed)
   * 
   * @param pkbUrl - The bookmark to remove from the stream
   * @returns True if successfully removed
   */
  @crud('delete', { soft: true })
  deleteBookmark(pkbUrl: string): boolean
}

/**
 * Bookmark data structure
 * 
 * The shape of a bookmark across all rings.
 */
interface Bookmark {
  /** The bookmarked URL */
  url: string
  
  /** Human-readable title (optional) */
  title?: string
  
  /** User's notes about the bookmark (optional) */
  notes?: string
  
  /** When the bookmark was created (seen, not authored) */
  seenAt: number  // milliseconds since epoch
  
  /** PKB URL - content-addressed reference */
  pkbUrl: string
  
  /** Git commit hash when stored */
  commitHash: string
}

/**
 * Bookmark configuration
 * 
 * Advanced options for addBookmark
 */
interface BookmarkConfig {
  /** Target directory (default: DEFAULT_DIRECTORY) */
  directory?: string
  
  /** Custom subpath within directory */
  subpath?: string
  
  /** Whether to fetch and store page content */
  archive?: boolean
  
  /** Tags for categorization */
  tags?: string[]
}
