/**
 * View entity
 * A lens on TheStream™ - filtered, sorted perspective
 */

import type { ViewBadge, SortBy } from '../values/common.js';
import type { StreamChunkType } from './stream.js';

export interface View {
  id: number;
  index: number;                   // position in reel
  label?: string;                  // user-defined label
  badge: ViewBadge;                // displayed badge (FEED, SEARCH, etc)
  filters: ViewFilters;            // what's included
  sortBy: SortBy;
  isPinned: boolean;               // cannot be closed
  isTheStream: boolean;            // TheStream™ (View 0)
  createdAt: Date;
  updatedAt?: Date;
}

export interface ViewFilters {
  dateRange?: { from?: Date; to?: Date };
  keywords?: string[];
  mentionedPeople?: number[];       // person IDs
  hasMedia?: boolean;
  hasLinks?: boolean;
  hasPeople?: boolean;
  chunkTypes?: StreamChunkType[];   // filter by type
}

/** Properties required to create a view */
export type CreateView = Omit<View, 'id' | 'createdAt' | 'updatedAt'>;

/** Properties that can be updated */
export type UpdateView = Partial<Omit<View, 'id' | 'createdAt'>>;
