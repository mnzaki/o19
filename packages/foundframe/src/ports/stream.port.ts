/**
 * Stream port - repository interface for TheStream™
 */

import { BasePort } from './base.port.js';
import type { 
  StreamEntry, 
  AddToStream, 
  StreamFilters,
  StreamChunkType 
} from '../domain/entities/stream.js';

export interface StreamPort {
  /** Add a person to the stream */
  addPerson(personId: number, seenAt?: Date): Promise<StreamEntry>;
  
  /** Add a post to the stream */
  addPost(postId: number, seenAt?: Date): Promise<StreamEntry>;
  
  /** Add media to the stream */
  addMedia(mediaId: number, seenAt?: Date): Promise<StreamEntry>;
  
  /** Add a bookmark to the stream */
  addBookmark(bookmarkId: number, seenAt?: Date): Promise<StreamEntry>;
  
  /** Add a conversation to the stream */
  addConversation(conversationId: number, seenAt?: Date): Promise<StreamEntry>;
  
  /** Generic add - for polymorphic use */
  addChunk(type: StreamChunkType, entityId: number, seenAt?: Date): Promise<StreamEntry>;
  
  /** Get entry by ID */
  getById(id: number): Promise<StreamEntry | null>;
  
  /** Query the stream */
  query(filters?: StreamFilters): Promise<StreamEntry[]>;
  
  /** Re-experience: create new entry at current/new time */
  reExperience(id: number, newSeenAt?: Date): Promise<StreamEntry>;
  
  /** Remove from stream (doesn't delete entity) */
  remove(id: number): Promise<void>;
  
  /** Get count */
  count(filters?: Pick<StreamFilters, 'dateRange' | 'chunkTypes'>): Promise<number>;
}

export abstract class StreamAdaptor extends BasePort implements StreamPort {
  addPerson(_personId: number, _seenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.addPerson');
  }
  
  addPost(_postId: number, _seenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.addPost');
  }
  
  addMedia(_mediaId: number, _seenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.addMedia');
  }
  
  addBookmark(_bookmarkId: number, _seenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.addBookmark');
  }
  
  addConversation(_conversationId: number, _seenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.addConversation');
  }
  
  addChunk(_type: StreamChunkType, _entityId: number, _seenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.addChunk');
  }
  
  getById(_id: number): Promise<StreamEntry | null> {
    this.throwNotImplemented('StreamAdaptor.getById');
  }
  
  query(_filters?: StreamFilters): Promise<StreamEntry[]> {
    this.throwNotImplemented('StreamAdaptor.query');
  }
  
  reExperience(_id: number, _newSeenAt?: Date): Promise<StreamEntry> {
    this.throwNotImplemented('StreamAdaptor.reExperience');
  }
  
  remove(_id: number): Promise<void> {
    this.throwNotImplemented('StreamAdaptor.remove');
  }
  
  count(_filters?: Pick<StreamFilters, 'dateRange' | 'chunkTypes'>): Promise<number> {
    this.throwNotImplemented('StreamAdaptor.count');
  }
}
