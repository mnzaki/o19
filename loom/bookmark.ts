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

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// MANAGEMENT (defined first to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class BookmarkMgmt extends loom.Management {
  // Constants
  VALID_URL_REGEX = /^https?:\/.+/;
  MAX_TITLE_LENGTH = 200;
  MAX_NOTES_LENGTH = 2000;
  DEFAULT_DIRECTORY = 'bookmarks';
  GIT_BRANCH = 'main';

  // CRUD Methods
  @loom.crud.create
  addBookmark(url: string, title?: string, notes?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud.read
  getBookmark(id: number): Bookmark {
    throw new Error('Imprint only');
  }

  @loom.crud.read({ by: 'url' })
  getBookmarkByUrl(url: string): Bookmark {
    throw new Error('Imprint only');
  }

  @loom.crud.list({ collection: true })
  listBookmarks(limit?: number, offset?: number): Bookmark[] {
    throw new Error('Imprint only');
  }

  @loom.crud.delete_({ soft: true })
  deleteBookmark(id: number): boolean {
    throw new Error('Imprint only');
  }
}

@BookmarkMgmt.Entity()
export class Bookmark {
  id!: number;

  url!: string;

  title?: string;

  notes?: string;

  creationContext!: Record<string, unknown>;

  createdAt!: number;
}
