/**
 * Xanadu-inspired addressing system for fine-grained linking
 * Everything is addressable; everything is a reference.
 * 
 * TheStream™ Architecture:
 * - TheStream is a temporal log of experience, not creation
 * - StreamChunks are polymorphic references to content
 * - Views are lenses that filter and sort the stream
 */

// ============================================
// Universal Addressing (Xanadu-style)
// ============================================

/** Format: "type://id#fragment" */
export type UAddress = string;

export type ContentType = 
  | 'post'      // A complete post
  | 'text'      // Text snippet/span
  | 'media'     // Image or video file
  | 'person'    // Referenced person
  | 'link'      // External URL with metadata
  | 'bookmark'  // Web capture with provenance
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
  t?: number;      // Time in seconds (for video/audio)
  x?: number;      // X coordinate (0-1 normalized)
  y?: number;      // Y coordinate (0-1 normalized)
  w?: number;      // Width of region (optional)
  h?: number;      // Height of region (optional)
}

/** A link to any addressable content */
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

/** A bit of content that can be accumulated */
export type AccumulableBit =
  | { type: 'text'; content: string; spans?: TextSpan[] }
  | { type: 'media'; uri: string; mimeType: string; thumbnailUri?: string }
  | { type: 'link'; url: string; preview?: LinkPreview }
  | { type: 'person'; did: string; displayName: string; avatarUri?: string }
  | { type: 'spatiotemporal'; mediaUri: string; region: SpatiotemporalPoint };

/** Active input type in creation tools */
export type InputType = 'text' | 'link' | 'person' | null;

/** The accumulating post (staging area / CCCB contents) */
export interface AccumulatingPost {
  bits: AccumulableBit[];
  draftLinks: Omit<XanaduLink, 'id' | 'createdAt'>[];
}

/** Helper to create an empty accumulating post */
export function createEmptyAccumulation(): AccumulatingPost {
  return {
    bits: [],
    draftLinks: []
  };
}

// ============================================
// Core Entities (for TheStream™)
// ============================================

/** Person entity - someone encountered in the stream */
export interface Person {
  id: number;            // Local database ID
  did?: string;          // Decentralized identifier (future: PKI)
  displayName: string;
  handle?: string;       // @username
  avatarMediaId?: number; // Reference to media
  metadata?: Record<string, unknown>; // extensible: KERI AID, etc
  createdAt: Date;
  updatedAt?: Date;
}

/** Media entity - unified media storage */
export interface Media {
  id: number;
  contentHash?: string;  // TODO: implement deduplication
  mimeType: string;
  uri: string;           // local path or remote URL
  width?: number;
  height?: number;
  durationMs?: number;   // for audio/video
  metadata?: Record<string, unknown>; // camera info, location, etc
  createdAt: Date;
}

/** Post entity - accumulated becoming, committed */
export interface Post {
  id: number;
  bits: AccumulableBit[];
  links: XanaduLink[];
  
  // Future PKI fields (for Y2+ content addressing)
  contentHash?: string;  // TODO: content hash / CID
  authorDid?: string;    // TODO: link to person when PKI implemented
  signature?: string;    // TODO: KERI signature
  
  createdAt: Date;
  modifiedAt?: Date;
}

/** Helper to commit an accumulation to a real post */
export function commitAccumulation(
  accumulation: AccumulatingPost,
  id: number
): Post {
  return {
    id,
    bits: [...accumulation.bits],
    links: [],
    createdAt: new Date(),
  };
}

/** Bookmark entity - web capture with provenance */
export interface Bookmark {
  id: number;
  url: string;
  title?: string;
  notes?: string;        // user's annotations
  creationContext: {
    browsingHistory: string[]; // URLs visited before this bookmark
    referrer?: string;
    timestamp: number;
  };
  createdAt: Date;
}

/** Conversation participant role */
export type ConversationRole = 'author' | 'recipient' | 'cc' | 'mention';

/** Conversation entity - external thread capture */
export interface Conversation {
  id: number;
  title?: string;
  content: unknown[];    // opaque for now: [{ author, text, timestamp, ... }]
  captureTime: Date;     // when we captured it
  firstEntryTime?: Date; // when thread started (external time)
  lastEntryTime?: Date;  // when thread ended (external time)
  sourceUrl?: string;    // where this came from
  participants?: { personId: number; role?: ConversationRole }[];
  media?: { mediaId: number; context?: Record<string, unknown> }[];
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================
// TheStream™ - Temporal Experience Log
// ============================================

/** The type of content in a stream chunk */
export type StreamChunkType = 'person' | 'post' | 'media' | 'bookmark' | 'conversation';

/** A polymorphic chunk in TheStream™ */
export type StreamChunk =
  | { type: 'person'; id: number; person: Person }
  | { type: 'post'; id: number; post: Post }
  | { type: 'media'; id: number; media: Media }
  | { type: 'bookmark'; id: number; bookmark: Bookmark }
  | { type: 'conversation'; id: number; conversation: Conversation };

/** An entry in TheStream™ - when you experienced something */
export interface TheStreamEntry {
  id: number;
  seenAt: Date;          // when YOU experienced it (not when created!)
  chunk: StreamChunk;    // the polymorphic content
  createdAt: Date;
  updatedAt?: Date;
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
  index: number;         // position in reel
  label?: string;        // user-defined label
  badge: ViewBadge;      // displayed badge (FEED, SEARCH, etc)
  filters: ViewFilters;
  sortBy: SortBy;
  isPinned: boolean;     // cannot be closed
  isThestream: boolean;  // TheStream™ - View 0, unfiltered
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
