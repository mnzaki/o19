/**
 * Stream service
 * Domain service for TheStream™ - temporal experience log
 */

import { StreamAdaptor, type StreamPort } from '../ports/stream.port.js';
import type { StreamEntry, StreamFilters, StreamChunkType } from '../domain/entities/stream.js';

export class StreamService extends StreamAdaptor implements StreamPort {
  constructor(private adaptor: StreamPort) {
    super();
  }

  addPerson(personId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.addPerson(personId, seenAt);
  }

  addPost(postId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.addPost(postId, seenAt);
  }

  addMedia(mediaId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.addMedia(mediaId, seenAt);
  }

  addBookmark(bookmarkId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.addBookmark(bookmarkId, seenAt);
  }

  addConversation(conversationId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.addConversation(conversationId, seenAt);
  }

  addChunk(type: StreamChunkType, entityId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.addChunk(type, entityId, seenAt);
  }

  getById(id: number): Promise<StreamEntry | null> {
    return this.adaptor.getById(id);
  }

  query(filters?: StreamFilters): Promise<StreamEntry[]> {
    return this.adaptor.query(filters);
  }

  reExperience(id: number, newSeenAt?: Date): Promise<StreamEntry> {
    return this.adaptor.reExperience(id, newSeenAt);
  }

  remove(id: number): Promise<void> {
    return this.adaptor.remove(id);
  }

  count(filters?: Pick<StreamFilters, 'dateRange' | 'chunkTypes'>): Promise<number> {
    return this.adaptor.count(filters);
  }
}
