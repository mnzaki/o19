/**
 * Content values - bits that can be accumulated
 */

import type { TextSpan, SpatiotemporalPoint } from './address.js';

/** Link preview metadata */
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
  draftLinks: Array<{
    source: string;
    target: string;
    type: 'reference' | 'transclusion' | 'annotation' | 'response';
  }>;
}

/** Create an empty accumulation */
export function createEmptyAccumulation(): AccumulatingPost {
  return {
    bits: [],
    draftLinks: []
  };
}
