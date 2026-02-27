/**
 * TheStream service - Extension of generated service
 * Domain service for TheStream™ - temporal experience log
 *
 * This extends the generated TheStreamService from spire/ to add:
 * - addChunk(): Generic add using typed methods
 * - reExperience(): Custom business logic for re-experiencing content
 * - count(): Entry count with filtering
 * - Date→number conversion for generated methods
 */

import { TheStreamService as GeneratedTheStreamService } from '../../spire/src/services/index.js';
import type { TheStreamPort } from '../../spire/src/ports/index.js';
import type { StreamEntry, StreamChunkType, StreamFilter } from '../domain/index.js';

export class TheStreamService extends GeneratedTheStreamService {
  constructor(adaptor: TheStreamPort) {
    super(adaptor, adaptor);
  }

  /**
   * Add a chunk to the stream using generic type dispatch
   * Routes to typed addXxx methods based on chunk type
   */
  async addChunk(type: StreamChunkType, entityId: number, timestamp?: Date): Promise<StreamEntry> {
    const seenAt = timestamp?.getTime();
    switch (type) {
      case 'bookmark':
        return this.addBookmark({ bookmarkId: entityId, seenAt });
      case 'post':
        return this.addPost({ postId: entityId, seenAt });
      case 'media':
        return this.addMedia({ mediaId: entityId, seenAt });
      case 'person':
        return this.addPerson({ personId: entityId, seenAt });
      case 'conversation':
        return this.addConversation({ conversationId: entityId, seenAt });
      default:
        throw new Error(`Unknown chunk type: ${type}`);
    }
  }

  /**
   * Re-experience content by creating a new entry
   * Core business logic: creates fresh entry with new seenAt timestamp
   */
  async reExperience(id: number, newSeenAt?: Date): Promise<StreamEntry> {
    // Get the original entry
    const entry = await this.getById(id);
    // Create new entry with same chunk but new timestamp
    return this.addChunk(entry.chunk.type, entry.chunk.id, newSeenAt);
  }

  /**
   * Alias: remove → delete (generated method name)
   */
  async remove(id: number): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Query with client-side filtering
   * Generated list() has basic pagination; we add type filtering
   */
  async query(filters?: StreamFilter): Promise<StreamEntry[]> {
    // Convert Date filters to timestamps for generated list()
    const before = filters?.dateRange?.to?.getTime();
    const entries = await this.list({ limit: filters?.pagination?.limit /*, before TODO */ });

    // Apply client-side filters
    return entries.filter((entry) => {
      if (filters?.chunkTypes && !filters.chunkTypes.includes(entry.chunk.type)) {
        return false;
      }
      if (filters?.dateRange?.from && entry.seenAt < filters.dateRange.from) {
        return false;
      }
      return true;
    });
  }

  /**
   * Count entries matching filters
   */
  async count(filters?: Pick<StreamFilter, 'dateRange' | 'chunkTypes'>): Promise<number> {
    const entries = await this.query(filters as StreamFilter);
    return entries.length;
  }
}
