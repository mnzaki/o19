/**
 * Media entity
 * Unified media storage - images, videos, audio files
 */

export interface Media {
  id: number;
  title: string;
  contentHash?: string; // TODO: implement deduplication
  mimeType: string;
  uri: string; // local path or remote URL
  width?: number;
  height?: number;
  durationMs?: number; // for audio/video
  metadata?: Record<string, unknown>; // camera info, location, etc
  createdAt: Date;
}

/** Properties required to create media */
export type CreateMedia = Omit<Media, 'id' | 'createdAt'>;

/** Properties that can be updated */
export type UpdateMedia = Partial<Omit<Media, 'id' | 'createdAt'>>;

/** Filter criteria for media queries (matches loom MediaFilter) */
export interface MediaFilter {
  /** Filter by content hash (exact match) */
  contentHash?: string;
  /** Filter by MIME type (exact match) */
  mimeType?: string;
  /** Filter by URI (exact match) */
  uri?: string;
  /** Filter by minimum width */
  minWidth?: number;
  /** Filter by minimum height */
  minHeight?: number;
  /** Only return entries with createdAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with createdAt <= this timestamp (inclusive) */
  before?: number;
}
