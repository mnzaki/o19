/**
 * Bookmark port - repository interface for Bookmark entity
 */

import { BasePort, type BaseCrudPort } from './base.port.js';
import type { Bookmark, CreateBookmark, UpdateBookmark, BookmarkFilters } from '../domain/entities/bookmark.js';

export interface BookmarkPort extends BaseCrudPort<Bookmark, CreateBookmark, UpdateBookmark> {
  /** Find by URL */
  getByUrl(url: string): Promise<Bookmark | null>;
  
  /** Search by keyword */
  searchByKeyword(keyword: string): Promise<Bookmark[]>;
  
  /** Query with filters */
  query(filters?: BookmarkFilters): Promise<Bookmark[]>;
}

export abstract class BookmarkAdaptor extends BasePort implements BookmarkPort {
  create(_data: CreateBookmark): Promise<Bookmark> {
    this.throwNotImplemented('BookmarkAdaptor.create');
  }
  
  getById(_id: number): Promise<Bookmark | null> {
    this.throwNotImplemented('BookmarkAdaptor.getById');
  }
  
  update(_id: number, _data: UpdateBookmark): Promise<void> {
    this.throwNotImplemented('BookmarkAdaptor.update');
  }
  
  delete(_id: number): Promise<void> {
    this.throwNotImplemented('BookmarkAdaptor.delete');
  }
  
  getByUrl(_url: string): Promise<Bookmark | null> {
    this.throwNotImplemented('BookmarkAdaptor.getByUrl');
  }
  
  searchByKeyword(_keyword: string): Promise<Bookmark[]> {
    this.throwNotImplemented('BookmarkAdaptor.searchByKeyword');
  }
  
  query(_filters?: BookmarkFilters): Promise<Bookmark[]> {
    this.throwNotImplemented('BookmarkAdaptor.query');
  }
}
