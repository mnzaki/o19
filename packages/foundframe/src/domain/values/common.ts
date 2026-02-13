/**
 * Common value types
 */

/** Sort order for queries */
export type SortBy = 'recent' | 'oldest';

/** View badge types */
export type ViewBadge = 'FEED' | 'SEARCH' | 'PEOPLE' | 'MEDIA' | 'BOOKMARKS' | string;

/** Conversation participant roles */
export type ConversationRole = 'author' | 'recipient' | 'cc' | 'mention';

/** Pagination parameters */
export interface Pagination {
  limit?: number;
  offset?: number;
}

/** Date range filter */
export interface DateRange {
  from?: Date;
  to?: Date;
}

/** Query result with metadata */
export interface QueryResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
