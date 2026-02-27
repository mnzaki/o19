/**
 * Media service - Extension of generated service
 * Domain service for managing media files
 *
 * This extends the generated MediaService from spire/ to add:
 * - Data object adapter for create() (routes to createLink or createFile)
 * - Content hash lookup alias
 */

import { MediaService as GeneratedMediaService } from '../../spire/src/services/index.js';
import type { MediaPort } from '../../spire/src/ports/index.js';
import type { Media, CreateMedia } from '../domain/entities/media.js';

export class MediaService extends GeneratedMediaService {
  constructor(adaptor: MediaPort) {
    super(adaptor, adaptor);
  }

  /**
   * Create media from data object
   * Routes to addMediaLink (for URLs) or addMediaFile (for paths)
   * TODO: Add content hash calculation for deduplication
   */
  async create(data: CreateMedia): Promise<void> {
    if (data.uri.startsWith('http://') || data.uri.startsWith('https://')) {
      // Link media
      return this.addMediaLink(data);
    } else {
      // File media
      return this.addMediaFile(data);
    }
  }

  /**
   * Alias: findByContentHash → getMedia (generated method name)
   */
  async findByContentHash(contentHash: string): Promise<Media> {
    return this.getMedia(contentHash);
  }
}
