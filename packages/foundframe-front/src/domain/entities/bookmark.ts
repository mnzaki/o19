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

/** Filters for querying bookmarks */
export interface BookmarkFilters {
  dateRange?: { from?: Date; to?: Date };
  keywords?: string[];
  url?: string;
  sortBy?: 'recent' | 'oldest';
  pagination?: { limit?: number; offset?: number };
}
