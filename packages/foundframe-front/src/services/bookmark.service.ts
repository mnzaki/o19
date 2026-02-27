/**
 * Bookmark service - Extension of generated service
 * Domain service for managing bookmarks with custom search logic
 *
 * This extends the generated BookmarkService from spire/ to add:
 * - Data object adapter for create() (generated takes positional params)
 * - Partial match search (generated filter does exact match)
 * - URL alias for getByUri (generated uses 'uri' param name)
 */

import { BookmarkService as GeneratedBookmarkService } from '../../spire/src/services/bookmark.service.js';
import type { BookmarkPort } from '../../spire/src/ports/bookmark.port.js';
import type { Bookmark } from '../domain/entities/bookmark.js';

export class BookmarkService extends GeneratedBookmarkService {
  constructor(adaptor: BookmarkPort) {
    // Generated service expects separate read/write adaptors
    // We use same adaptor for both (common pattern)
    super(adaptor, adaptor);
  }

  /**
   * Search bookmarks by keyword (partial match in title/notes)
   * Generated list() with filter does exact match only
   */
  async searchByKeyword(keyword: string): Promise<Bookmark[]> {
    const all = await this.list({ limit: 1000, offset: 0 });
    const lowerKeyword = keyword.toLowerCase();
    return all.filter(
      (b) =>
        b.title?.toLowerCase().includes(lowerKeyword) ||
        b.notes?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Alias: getByUrl → getBookmark (generated method name)
   */
  async getByUrl(uri: string): Promise<Bookmark> {
    return this.getBookmark(uri);
  }

  /**
   * Legacy query method - delegates to generated list()
   * @deprecated Use list() with filter instead
   */
  async query(): Promise<Bookmark[]> {
    return this.list({ limit: 100, offset: 0 });
  }
}
