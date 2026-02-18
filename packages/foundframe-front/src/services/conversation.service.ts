/**
 * Conversation service
 * Domain service for managing conversations
 */

import { ConversationAdaptor, type ConversationPort } from '../ports/conversation.port.js';
import type { 
  Conversation, 
  CreateConversation, 
  UpdateConversation 
} from '../domain/entities/conversation.js';
import type { ConversationRole } from '../domain/values/common.js';

export class ConversationService extends ConversationAdaptor implements ConversationPort {
  constructor(private adaptor: ConversationPort) {
    super();
  }

  create(data: CreateConversation): Promise<Conversation> {
    return this.adaptor.create(data);
  }

  getById(id: number): Promise<Conversation | null> {
    return this.adaptor.getById(id);
  }

  update(id: number, data: UpdateConversation): Promise<void> {
    return this.adaptor.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.adaptor.delete(id);
  }

  addParticipant(conversationId: number, personId: number, role?: ConversationRole): Promise<void> {
    return this.adaptor.addParticipant(conversationId, personId, role);
  }

  removeParticipant(conversationId: number, personId: number): Promise<void> {
    return this.adaptor.removeParticipant(conversationId, personId);
  }

  addMedia(conversationId: number, mediaId: number, context?: Record<string, unknown>): Promise<void> {
    return this.adaptor.addMedia(conversationId, mediaId, context);
  }

  removeMedia(conversationId: number, mediaId: number): Promise<void> {
    return this.adaptor.removeMedia(conversationId, mediaId);
  }
}
