/**
 * Preview port - repository interface for URL preview caching
 */

import { BasePort } from './base.port.js';

export interface PreviewMetadata {
  url: string;
  title?: string;
  description?: string;
  imagePath?: string;
  siteName?: string;
  fetchedAt: Date;
}

export interface PreviewPort {
  /** Get a preview for a URL (fetches if not cached or stale) */
  getForURL(url: string): Promise<PreviewMetadata>;
  
  /** Get cached preview without fetching */
  getCached(url: string): Promise<PreviewMetadata | null>;
  
  /** Store a preview in the cache */
  store(preview: PreviewMetadata): Promise<void>;
  
  /** Delete old previews (cache invalidation) */
  deleteOlderThan(maxAgeMs: number): Promise<void>;
}

export abstract class PreviewAdaptor extends BasePort implements PreviewPort {
  getForURL(_url: string): Promise<PreviewMetadata> {
    this.throwNotImplemented('PreviewAdaptor.getForURL');
  }
  
  getCached(_url: string): Promise<PreviewMetadata | null> {
    this.throwNotImplemented('PreviewAdaptor.getCached');
  }
  
  store(_preview: PreviewMetadata): Promise<void> {
    this.throwNotImplemented('PreviewAdaptor.store');
  }
  
  deleteOlderThan(_maxAgeMs: number): Promise<void> {
    this.throwNotImplemented('PreviewAdaptor.deleteOlderThan');
  }
}
