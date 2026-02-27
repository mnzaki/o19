/**
 * Media Management - Surface Imprint
 *
 * Media (images, videos, audio) saved to TheStream™.
 *
 * Database Schema (prisma):
 *   Media {
 *     id          Int     @id @default(autoincrement())
 *     contentHash String?
 *     mimeType    String
 *     uri         String
 *     width       Int?
 *     height      Int?
 *     durationMs  Int?
 *     metadata    String? // JSON
 *     createdAt   Int
 *   }
 *
 * Reach: Global (extends from Core to Front)
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';

// ============================================================================
// FILTER TYPE
// ============================================================================

/**
 * Filter criteria for Media list queries.
 * All fields are optional - only specified filters are applied.
 */
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

// ============================================================================
// MANAGEMENT (defined first to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class MediaMgmt extends loom.Management {
  VALID_MEDIA_URL_REGEX = /^https?:\/.+/;
  MAX_TITLE_LENGTH = 500;
  DEFAULT_DIRECTORY = 'media';
  GIT_BRANCH = 'main';

  // Note: Not marked as @loom.crud.create to avoid naming collision
  // Both methods would be named "create" causing duplicate function error
  addMediaLink(uri: string, mimeType: string, title?: string, directory?: string): void {
    throw new Error('Imprint only');
  }

  addMediaFile(uri: string, title?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud.read
  getMedia(id: number): Media {
    throw new Error('Imprint only');
  }

  @loom.crud.read({ by: 'contentHash' })
  getMediaByHash(contentHash: string): Media {
    throw new Error('Imprint only');
  }

  /**
   * List media with optional filtering.
   *
   * @example
   * // Basic pagination
   * listMedia(50, 0)
   *
   * // By content hash
   * listMedia(50, 0, { contentHash: 'abc123...' })
   *
   * // Images only, large resolution
   * listMedia(50, 0, {
   *   mimeType: 'image/jpeg',
   *   minWidth: 1920,
   *   minHeight: 1080
   * })
   *
   * // Recent media
   * listMedia(50, 0, { after: Date.now() - 86400000 })
   */
  @loom.crud.list({ collection: true })
  listMedia(limit?: number, offset?: number, filter?: MediaFilter): Media[] {
    throw new Error('Imprint only');
  }

  @loom.crud.update
  updateMedia(id: number, title?: string): boolean {
    throw new Error('Imprint only');
  }

  @loom.crud.delete_({ soft: true })
  deleteMedia(id: number): boolean {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

@MediaMgmt.Entity()
class Media {
  id = crud.field.id();

  contentHash = crud.field.string({ nullable: true });

  mimeType = crud.field.string();

  uri = crud.field.string();

  width = crud.field.int({ nullable: true });

  height = crud.field.int({ nullable: true });

  durationMs = crud.field.int({ nullable: true });

  metadata = crud.field.json<Record<string, unknown>>({ nullable: true });

  createdAt = crud.field.createdAt();
}

export { MediaMgmt, Media };
