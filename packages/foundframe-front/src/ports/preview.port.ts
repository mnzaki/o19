/**
 * Preview port - repository interface for URL preview caching
 */

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
