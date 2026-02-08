/**
 * Link Preview Service
 * 
 * Fetches and caches webpage metadata for link previews.
 * Deduplicates concurrent requests for the same URL.
 */

import { eq, lt } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { CachedLinkPreview, ILinkPreviewService } from '@repo/persistence';
import { linkPreviews } from '../schema.js';

// Function type for fetching preview from external source (Tauri)
export type FetchLinkPreviewFn = (url: string) => Promise<{
  title?: string;
  description?: string;
  image_url?: string;
  images?: string[];
  site_name?: string;
}>;

export class LinkPreviewService implements ILinkPreviewService {
  // In-flight requests - shared promises for concurrent deduplication
  private inFlight = new Map<string, Promise<CachedLinkPreview>>();
  
  constructor(
    private db: BaseSQLiteDatabase<any, any>,
    private fetcher?: FetchLinkPreviewFn
  ) {}

  async getForURL(url: string): Promise<CachedLinkPreview> {
    // Normalize URL
    const normalizedUrl = this.normalizeURL(url);
    
    // Check for existing in-flight request (deduplication)
    const existing = this.inFlight.get(normalizedUrl);
    if (existing) {
      return existing;
    }
    
    // Create the request promise
    const promise = this.fetchPreview(normalizedUrl);
    
    // Store in-flight
    this.inFlight.set(normalizedUrl, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up in-flight
      this.inFlight.delete(normalizedUrl);
    }
  }

  private async fetchPreview(url: string): Promise<CachedLinkPreview> {
    // First check cache
    const cached = await this.getCached(url);
    if (cached) {
      // Check if cache is still fresh (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      const age = Date.now() - cached.fetchedAt.getTime();
      if (age < maxAge && !cached.error) {
        return cached;
      }
    }
    
    // Fetch fresh preview via provided fetcher
    if (!this.fetcher) {
      throw new Error('No fetcher provided for link preview');
    }
    
    try {
      const preview = await this.fetcher(url);
      
      const cachedPreview: CachedLinkPreview = {
        url,
        title: preview.title,
        description: preview.description,
        imageUrl: preview.image_url,
        images: preview.images,
        siteName: preview.site_name,
        fetchedAt: new Date()
      };
      
      // Store in cache
      await this.store(cachedPreview);
      
      return cachedPreview;
    } catch (error) {
      // Store error in cache to avoid retrying failed URLs too often
      const errorPreview: CachedLinkPreview = {
        url,
        fetchedAt: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
      
      await this.store(errorPreview);
      return errorPreview;
    }
  }

  async getCached(url: string): Promise<CachedLinkPreview | null> {
    const normalizedUrl = this.normalizeURL(url);
    
    const result = await this.db
      .select()
      .from(linkPreviews)
      .where(eq(linkPreviews.url, normalizedUrl))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const row = result[0];
    return {
      url: row.url,
      title: row.title ?? undefined,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      images: row.images as string[] | undefined,
      siteName: row.siteName ?? undefined,
      fetchedAt: row.fetchedAt,
      error: row.error ?? undefined
    };
  }

  async store(preview: CachedLinkPreview): Promise<void> {
    await this.db.insert(linkPreviews)
      .values({
        url: preview.url,
        title: preview.title,
        description: preview.description,
        imageUrl: preview.imageUrl,
        images: preview.images,
        siteName: preview.siteName,
        fetchedAt: preview.fetchedAt,
        error: preview.error
      })
      .onConflictDoUpdate({
        target: linkPreviews.url,
        set: {
          title: preview.title,
          description: preview.description,
          imageUrl: preview.imageUrl,
          images: preview.images,
          siteName: preview.siteName,
          fetchedAt: preview.fetchedAt,
          error: preview.error
        }
      });
  }

  async deleteOlderThan(maxAgeMs: number): Promise<void> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    await this.db.delete(linkPreviews).where(lt(linkPreviews.fetchedAt, cutoff));
  }

  private normalizeURL(url: string): string {
    // Simple normalization - trim and lowercase
    return url.trim().toLowerCase();
  }
}
