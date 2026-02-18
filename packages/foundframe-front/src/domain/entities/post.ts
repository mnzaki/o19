/**
 * Post entity
 * Accumulated becoming, committed to the stream
 */

import type { AccumulableBit } from '../values/content.js';
import type { XanaduLink } from '../values/address.js';

export interface Post {
  id: number;
  bits: AccumulableBit[];
  links: XanaduLink[];
  
  // Future PKI fields (for Y2+ content addressing)
  contentHash?: string;            // TODO: content hash / CID
  authorDid?: string;              // TODO: link to person when PKI
  signature?: string;              // TODO: KERI signature
  
  createdAt: Date;
  modifiedAt?: Date;
}

/** Properties required to create a post */
export type CreatePost = {
  bits: AccumulableBit[];
  links?: XanaduLink[];
};

/** Properties that can be updated */
export type UpdatePost = {
  bits?: AccumulableBit[];
  links?: XanaduLink[];
};

/** Filters for querying posts */
export interface PostFilters {
  dateFrom?: Date;
  dateTo?: Date;
  keywords?: string[];
}
