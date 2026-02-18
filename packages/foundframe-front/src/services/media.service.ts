/**
 * Media service
 * Domain service for managing media files
 */

import { MediaAdaptor, type MediaPort } from '../ports/media.port.js';
import type { Media, CreateMedia, UpdateMedia } from '../domain/entities/media.js';

export class MediaService extends MediaAdaptor implements MediaPort {
  constructor(private adaptor: MediaPort) {
    super();
  }

  create(data: CreateMedia): Promise<Media> {
    // TODO: Add content hash calculation for deduplication
    return this.adaptor.create(data);
  }

  getById(id: number): Promise<Media | null> {
    return this.adaptor.getById(id);
  }

  update(id: number, data: UpdateMedia): Promise<void> {
    return this.adaptor.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.adaptor.delete(id);
  }

  findByContentHash(contentHash: string): Promise<Media | null> {
    return this.adaptor.findByContentHash(contentHash);
  }
}
