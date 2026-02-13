/**
 * Bookmark service
 * Domain service for managing bookmarks
 */

import { BookmarkAdaptor, type BookmarkPort } from '../ports/bookmark.port.js';
import type { Bookmark, CreateBookmark, UpdateBookmark, BookmarkFilters } from '../domain/entities/bookmark.js';

export class BookmarkService extends BookmarkAdaptor implements BookmarkPort {
  constructor(private adaptor: BookmarkPort) {
    super();
  }

  create(data: CreateBookmark): Promise<Bookmark> {
    return this.adaptor.create(data);
  }

  getById(id: number): Promise<Bookmark | null> {
    return this.adaptor.getById(id);
  }

  update(id: number, data: UpdateBookmark): Promise<void> {
    return this.adaptor.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.adaptor.delete(id);
  }

  getByUrl(url: string): Promise<Bookmark | null> {
    return this.adaptor.getByUrl(url);
  }

  searchByKeyword(keyword: string): Promise<Bookmark[]> {
    return this.adaptor.searchByKeyword(keyword);
  }

  query(filters?: BookmarkFilters): Promise<Bookmark[]> {
    return this.adaptor.query(filters);
  }
}
