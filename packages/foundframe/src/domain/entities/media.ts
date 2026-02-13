/**
 * Media entity
 * Unified media storage - images, videos, audio files
 */

export interface Media {
  id: number;
  contentHash?: string;            // TODO: implement deduplication
  mimeType: string;
  uri: string;                     // local path or remote URL
  width?: number;
  height?: number;
  durationMs?: number;             // for audio/video
  metadata?: Record<string, unknown>; // camera info, location, etc
  createdAt: Date;
}

/** Properties required to create media */
export type CreateMedia = Omit<Media, 'id' | 'createdAt'>;

/** Properties that can be updated */
export type UpdateMedia = Partial<Omit<Media, 'id' | 'createdAt'>>;
