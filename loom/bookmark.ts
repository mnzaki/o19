/**
 * Bookmark Management - Surface Imprint
 *
 * A bookmark is a URL + context saved to TheStream™.
 *
 * Database Schema (prisma):
 *   Bookmark {
 *     id              Int     @id @default(autoincrement())
 *     url             String
 *     title           String?
 *     notes           String?
 *     creationContext String  // JSON: browsing context
 *     createdAt       Int     // timestamp_ms
 *   }
 *
 * Reach: Global (extends from Core to Front)
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';

// ============================================================================
// FILTER TYPE
// ============================================================================

/**
 * Filter criteria for Bookmark list queries.
 * All fields are optional - only specified filters are applied.
 */
export interface BookmarkFilter {
  /** Filter by URI (exact match) */
  uri?: string;
  /** Filter by title (exact match) */
  title?: string;
  /** Filter by notes content (exact match) */
  notes?: string;
  /** Only return entries with createdAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with createdAt <= this timestamp (inclusive) */
  before?: number;
}

// ============================================================================
// MANAGEMENT (defined first to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class BookmarkMgmt extends loom.Management {
  VALID_URL_REGEX = /^https?:\/.+/;
  MAX_TITLE_LENGTH = 200;
  MAX_NOTES_LENGTH = 2000;
  DEFAULT_DIRECTORY = 'bookmarks';
  GIT_BRANCH = 'main';

  @loom.crud.create
  addBookmark(url: string, title?: string, notes?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud.read
  getBookmark(id: number): Bookmark {
    throw new Error('Imprint only');
  }

  @loom.crud.read({ by: 'uri' })
  getBookmarkByUri(uri: string): Bookmark {
    throw new Error('Imprint only');
  }

  /**
   * List bookmarks with optional filtering.
   * 
   * @example
   * // Basic pagination
   * listBookmarks(50, 0)
   * 
   * // By URI
   * listBookmarks(50, 0, { uri: 'https://example.com' })
   * 
   * // Recent bookmarks
   * listBookmarks(50, 0, { after: Date.now() - 86400000 })
   */
  @loom.crud.list({ collection: true })
  listBookmarks(
    limit?: number,
    offset?: number,
    filter?: BookmarkFilter
  ): Bookmark[] {
    throw new Error('Imprint only');
  }

  @loom.crud.update
  updateBookmark(id: number, title?: string, notes?: string): boolean {
    throw new Error('Imprint only');
  }

  @loom.crud.delete_({ soft: true })
  deleteBookmark(id: number): boolean {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

@BookmarkMgmt.Entity()
export class Bookmark {
  id = crud.field.id();
  uri = crud.field.string(); // matches StructuredData.bookmark()
  title = crud.field.string({ nullable: true });
  notes = crud.field.text({ nullable: true });
  creationContext = crud.field.json<Record<string, unknown>>();
  createdAt = crud.field.createdAt();
}
