/**
 * Conversation port - repository interface for Conversation entity
 */

import { BasePort, type BaseCrudPort } from './base.port.js';
import type { 
  Conversation, 
  CreateConversation, 
  UpdateConversation 
} from '../domain/entities/conversation.js';
import type { ConversationRole } from '../domain/values/common.js';

export interface ConversationPort extends BaseCrudPort<Conversation, CreateConversation, UpdateConversation> {
  /** Add a participant */
  addParticipant(conversationId: number, personId: number, role?: ConversationRole): Promise<void>;
  
  /** Remove a participant */
  removeParticipant(conversationId: number, personId: number): Promise<void>;
  
  /** Add media to conversation */
  addMedia(conversationId: number, mediaId: number, context?: Record<string, unknown>): Promise<void>;
  
  /** Remove media from conversation */
  removeMedia(conversationId: number, mediaId: number): Promise<void>;
}

export abstract class ConversationAdaptor extends BasePort implements ConversationPort {
  create(_data: CreateConversation): Promise<Conversation> {
    this.throwNotImplemented('ConversationAdaptor.create');
  }
  
  getById(_id: number): Promise<Conversation | null> {
    this.throwNotImplemented('ConversationAdaptor.getById');
  }
  
  update(_id: number, _data: UpdateConversation): Promise<void> {
    this.throwNotImplemented('ConversationAdaptor.update');
  }
  
  delete(_id: number): Promise<void> {
    this.throwNotImplemented('ConversationAdaptor.delete');
  }
  
  addParticipant(_conversationId: number, _personId: number, _role?: ConversationRole): Promise<void> {
    this.throwNotImplemented('ConversationAdaptor.addParticipant');
  }
  
  removeParticipant(_conversationId: number, _personId: number): Promise<void> {
    this.throwNotImplemented('ConversationAdaptor.removeParticipant');
  }
  
  addMedia(_conversationId: number, _mediaId: number, _context?: Record<string, unknown>): Promise<void> {
    this.throwNotImplemented('ConversationAdaptor.addMedia');
  }
  
  removeMedia(_conversationId: number, _mediaId: number): Promise<void> {
    this.throwNotImplemented('ConversationAdaptor.removeMedia');
  }
}
