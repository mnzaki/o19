/**
 * Media Management - Surface Imprint
 *
 * Media (images, videos, audio) saved to TheStream™.
 * Represents the "encounter with the visual/auditory"—capturing what we see and hear.
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './WARP.js';

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class MediaMgmt extends loom.Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================

  VALID_MEDIA_URL_REGEX = /^https?:\/\/.+/;
  MAX_TITLE_LENGTH = 500;
  DEFAULT_DIRECTORY = 'media';
  GIT_BRANCH = 'main';

  // ========================================================================
  // CRUD METHODS
  // ========================================================================

  /**
   * Add a media link to the stream
   */
  @loom.crud.create
  addMediaLink(
    url: string,
    title?: string,
    mimeType?: string,
    directory?: string
  ): void {
    throw new Error('Imprint only');
  }

  /**
   * Add a media file to the stream
   */
  @loom.crud.create({ variant: 'file' })
  addMediaFile(
    filePath: string,
    title?: string
  ): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a media entry by its URL
   */
  @loom.crud.read
  getMediaByUrl(url: string): MediaEntry {
    throw new Error('Imprint only');
  }

  /**
   * List all media in a directory
   */
  @loom.crud.list({ collection: true })
  listMedia(directory?: string): string[] {
    throw new Error('Imprint only');
  }

  /**
   * Delete a media entry (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deleteMedia(pkbUrl: string): boolean {
    throw new Error('Imprint only');
  }
}

/**
 * Media entry data structure
 */
interface MediaEntry {
  url: string;
  title?: string;
  mimeType?: string;
  fileSize?: number;
  seenAt: number;
  pkbUrl: string;
  commitHash: string;
}

/**
 * Export the Management class for collector
 */
export { MediaMgmt };
