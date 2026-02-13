/**
 * Media port - repository interface for Media entity
 */

import { BasePort, type BaseCrudPort } from './base.port.js';
import type { Media, CreateMedia, UpdateMedia } from '../domain/entities/media.js';

export interface MediaPort extends BaseCrudPort<Media, CreateMedia, UpdateMedia> {
  /** Find by content hash (for deduplication) */
  findByContentHash(contentHash: string): Promise<Media | null>;
}

export abstract class MediaAdaptor extends BasePort implements MediaPort {
  create(_data: CreateMedia): Promise<Media> {
    this.throwNotImplemented('MediaAdaptor.create');
  }
  
  getById(_id: number): Promise<Media | null> {
    this.throwNotImplemented('MediaAdaptor.getById');
  }
  
  update(_id: number, _data: UpdateMedia): Promise<void> {
    this.throwNotImplemented('MediaAdaptor.update');
  }
  
  delete(_id: number): Promise<void> {
    this.throwNotImplemented('MediaAdaptor.delete');
  }
  
  findByContentHash(_contentHash: string): Promise<Media | null> {
    this.throwNotImplemented('MediaAdaptor.findByContentHash');
  }
}
