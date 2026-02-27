/**
 * Xanadu-inspired addressing system for fine-grained linking
 * Everything is addressable; everything is a reference.
 *
 * TheStream™ Architecture:
 * - TheStream is a temporal log of experience, not creation
 * - StreamChunks are polymorphic references to content
 * - Views are lenses that filter and sort the stream
 */

import type { AccumulableBit, Post, StreamChunkType } from './domain/index.js';

// ============================================
// Universal Addressing (Xanadu-style)
// ============================================

/** Format: "type://id#fragment" */
export type UAddress = string;

export type ContentType =
  | 'post' // A complete post
  | 'text' // Text snippet/span
  | 'media' // Image or video file
  | 'person' // Referenced person
  | 'link' // External URL with metadata
  | 'bookmark' // Web capture with provenance
  | 'conversation' // External thread capture
  | 'spatiotemporal'; // Time-space coordinates in media

/** A span of text with character-level addressing */
export interface TextSpan {
  id: string;
  text: string;
  // For linking to sub-spans: "text://id#start,end"
  // e.g., "text://abc123#10,25" = characters 10-25
}

/** Spatiotemporal coordinates (for video/images) */
export interface SpatiotemporalPoint {
  t?: number; // Time in seconds (for video/audio)
  x?: number; // X coordinate (0-1 normalized)
  y?: number; // Y coordinate (0-1 normalized)
  w?: number; // Width of region (optional)
  h?: number; // Height of region (optional)
}

/** A link to any addressable content *
export interface XanaduLink {
  id: string;
  source: UAddress;      // What we're linking from
  target: UAddress;      // What we're linking to
  type: 'reference' | 'transclusion' | 'annotation' | 'response';
  createdAt: Date;
  // Transclusion: embeds the target content inline
  // Annotation: overlays commentary
  // Response: threaded reply
}
/**/

// ============================================
// Content Bits (Accumulation)
// ============================================

/** Link preview metadata - now filesystem-based */
export interface LinkPreview {
  title: string;
  description?: string;
  imageUri?: string;
  siteName?: string;
}

export type InputType = 'text' | 'link' | 'person' | null;

/** The accumulating post (staging area / CCCB contents) */
export interface AccumulatingPost {
  bits: AccumulableBit[];
}

/** Helper to create an empty accumulating post */
export function createEmptyAccumulation(): AccumulatingPost {
  return {
    bits: []
  };
}

/** Helper to commit an accumulation to a real post */
export function commitAccumulation(accumulation: AccumulatingPost, id: number): Post {
  return {
    id,
    bits: [...accumulation.bits],
    links: [],
    createdAt: new Date()
  };
}

// ============================================
// Views - Lenses on TheStream™
// ============================================

/** View badge types - displayed in UI */
export type ViewBadge = 'FEED' | 'SEARCH' | 'PEOPLE' | 'MEDIA' | 'BOOKMARKS' | string;

/** Filters for view queries */
export interface ViewFilters {
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
  mentionedPeople?: number[]; // person IDs
  hasMedia?: boolean;
  hasLinks?: boolean;
  hasPeople?: boolean;
  chunkTypes?: StreamChunkType[]; // filter by type
  // TODO: more sophisticated filters as needed
}

export type SortBy = 'recent' | 'oldest';

/** View configuration - a lens on TheStream™ */
export interface View {
  id: number;
  index: number; // position in reel
  label?: string; // user-defined label
  badge: ViewBadge; // displayed badge (FEED, SEARCH, etc)
  filters: ViewFilters;
  sortBy: SortBy;
  isPinned: boolean; // cannot be closed
  isThestream: boolean; // TheStream™ - View 0, unfiltered
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================
// Legacy Types (for migration compatibility)
// ============================================

/** Filters for querying posts */
export interface PostFilters {
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
}

/** @deprecated Use ViewFilters instead */
export interface PostServiceFilters extends ViewFilters {
  sortBy?: 'recent' | 'oldest';
  limit?: number;
  offset?: number;
}
