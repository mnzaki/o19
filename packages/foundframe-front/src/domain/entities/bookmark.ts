/**
 * Bookmark entity
 * Web capture with provenance - browsing history included
 */

export interface Bookmark {
  id: number;
  url: string;
  title?: string;
  notes?: string;                  // user's annotations
  creationContext: {
    browsingHistory: string[];     // URLs visited before this bookmark
    referrer?: string;
    timestamp: number;
  };
  createdAt: Date;
}

/** Properties required to create a bookmark */
export type CreateBookmark = Omit<Bookmark, 'id' | 'createdAt'>;

/** Properties that can be updated */
export type UpdateBookmark = Partial<Omit<Bookmark, 'id' | 'createdAt'>>;

/** Filter criteria for bookmark queries (matches loom BookmarkFilter) */
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

/** @deprecated Use BookmarkFilter instead */
export type BookmarkFilters = BookmarkFilter;
