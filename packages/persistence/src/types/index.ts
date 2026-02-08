/**
 * Xanadu-inspired addressing system for fine-grained linking
 * Everything is addressable; everything is a reference.
 */

// Universal address for any content within the system
export type UAddress = string; // Format: "type://id#fragment"

// Content types that can be addressed
export type ContentType = 
  | 'post'      // A complete post
  | 'text'      // Text snippet/span
  | 'media'     // Image or video file
  | 'person'    // Referenced person
  | 'link'      // External URL with metadata
  | 'spatiotemporal'; // Time-space coordinates in media

// A span of text with character-level addressing
export interface TextSpan {
  id: string;
  text: string;
  // For linking to sub-spans: "text://id#start,end"
  // e.g., "text://abc123#10,25" = characters 10-25
}

// Spatiotemporal coordinates (for video/images)
export interface SpatiotemporalPoint {
  t?: number;      // Time in seconds (for video/audio)
  x?: number;      // X coordinate (0-1 normalized)
  y?: number;      // Y coordinate (0-1 normalized)
  w?: number;      // Width of region (optional)
  h?: number;      // Height of region (optional)
}

// A link to any addressable content
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

// Link preview metadata
export interface LinkPreview {
  title: string;
  description?: string;
  imageUri?: string;
  siteName?: string;
}

// A bit of content that can be accumulated
export type AccumulableBit =
  | { type: 'text'; content: string; spans?: TextSpan[] }
  | { type: 'media'; uri: string; mimeType: string; thumbnailUri?: string }
  | { type: 'link'; url: string; preview?: LinkPreview }
  | { type: 'person'; did: string; displayName: string; avatarUri?: string }
  | { type: 'spatiotemporal'; mediaUri: string; region: SpatiotemporalPoint };

// Active input type in creation tools
export type InputType = 'text' | 'link' | 'person' | null;

/**
 * A Post is a signed, content-addressed composition of bits.
 */
export interface Post {
  // Identity
  id: string;              // Local UUID (future: content hash / CID)
  
  // Content: a sequenced composition of bits
  bits: AccumulableBit[];
  
  // Xanadu-style links emanating from this post
  links: XanaduLink[];
  
  // Metadata
  createdAt: Date;
  modifiedAt?: Date;
}

/**
 * The accumulating post (staging area / CCCB contents)
 */
export interface AccumulatingPost {
  bits: AccumulableBit[];
  draftLinks: Omit<XanaduLink, 'id' | 'createdAt'>[];
}

// View types
export type ViewFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
  mentionedPeople?: string[];
  hasMedia?: boolean;
  hasLinks?: boolean;
  hasPeople?: boolean;
};

export type SortBy = 'recent' | 'oldest';

export interface View {
  id: string;
  index: number;
  filters: ViewFilters;
  sortBy: SortBy;
  label?: string;
  createdAt: Date;
}

// Helper to create an empty accumulating post
export function createEmptyAccumulation(): AccumulatingPost {
  return {
    bits: [],
    draftLinks: []
  };
}

// Helper to commit an accumulation to a real post
export function commitAccumulation(
  accumulation: AccumulatingPost,
  id: string
): Post {
  return {
    id,
    bits: [...accumulation.bits],
    links: accumulation.draftLinks.map((dl, i) => ({
      ...dl,
      id: `link-${id}-${i}`,
      createdAt: new Date()
    })),
    createdAt: new Date()
  };
}
