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

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// MANAGEMENT (defined first to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class MediaMgmt extends loom.Management {
  VALID_MEDIA_URL_REGEX = /^https?:\/.+/;
  MAX_TITLE_LENGTH = 500;
  DEFAULT_DIRECTORY = 'media';
  GIT_BRANCH = 'main';

  @loom.crud.create
  addMediaLink(url: string, mimeType: string, title?: string, directory?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud.create({ variant: 'file' })
  addMediaFile(filePath: string, title?: string): void {
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

  @loom.crud.list({ collection: true })
  listMedia(limit?: number, offset?: number): Media[] {
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
export class Media {
  id!: number;

  contentHash?: string;

  mimeType!: string;

  uri!: string;

  width?: number;

  height?: number;

  durationMs?: number;

  metadata?: Record<string, unknown>;

  createdAt!: number;
}
