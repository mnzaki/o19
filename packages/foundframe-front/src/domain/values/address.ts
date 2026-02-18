/**
 * Xanadu-inspired addressing system
 * Everything is addressable; everything is a reference.
 */

/** Universal address format: "type://id#fragment" */
export type UAddress = string;

/** Content types that can be addressed */
export type ContentType = 
  | 'post'      // A complete post
  | 'text'      // Text snippet/span
  | 'media'     // Image or video file
  | 'person'    // Referenced person
  | 'link'      // External URL with metadata
  | 'bookmark'  // Web capture
  | 'conversation' // External thread
  | 'spatiotemporal'; // Time-space coordinates in media

/** Character-level text span addressing */
export interface TextSpan {
  id: string;
  text: string;
  // For linking: "text://id#start,end"
  // e.g., "text://abc123#10,25" = characters 10-25
}

/** Spatiotemporal coordinates for media */
export interface SpatiotemporalPoint {
  t?: number;      // Time in seconds (for video/audio)
  x?: number;      // X coordinate (0-1 normalized)
  y?: number;      // Y coordinate (0-1 normalized)
  w?: number;      // Width of region
  h?: number;      // Height of region
}

/** A link between addressable content */
export interface XanaduLink {
  id: string;
  source: UAddress;
  target: UAddress;
  type: 'reference' | 'transclusion' | 'annotation' | 'response';
  createdAt: Date;
}

/** Parse a UAddress into components */
export function parseUAddress(address: UAddress): {
  type: string;
  id: string;
  fragment?: string;
} {
  const match = address.match(/^(\w+):\/\/([^#]+)(?:#(.+))?$/);
  if (!match) {
    throw new Error(`Invalid UAddress: ${address}`);
  }
  return {
    type: match[1],
    id: match[2],
    fragment: match[3],
  };
}

/** Build a UAddress from components */
export function buildUAddress(
  type: string,
  id: string,
  fragment?: string
): UAddress {
  return fragment 
    ? `${type}://${id}#${fragment}`
    : `${type}://${id}`;
}
