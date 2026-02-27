/**
 * Conversation service - Extension of generated service
 * Domain service for managing conversations
 *
 * This extends the generated ConversationService from spire/ to add:
 * - Data object adapters for create/update (generated takes positional params)
 * - Aliases for renamed methods (addMedia → addConversationMedia, etc.)
 */

import { ConversationService as GeneratedConversationService } from '../../spire/src/services/index.js';
import type { ConversationPort } from '../../spire/src/ports/index.js';
import type { CreateConversation, UpdateConversation } from '../domain/entities/conversation.js';
import type { ConversationRole } from '../domain/values/common.js';

export class ConversationService extends GeneratedConversationService {
  constructor(adaptor: ConversationPort) {
    super(adaptor, adaptor);
  }

  /**
   * Update conversation by ID
   * Adapts from object-based API to generated positional params
   */
  async update(data: UpdateConversation): Promise<boolean> {
    return super.update(data);
  }

  /**
   * Alias: addMedia → addConversationMedia (generated method name)
   */
  async addMedia(data: {
    conversationId: number;
    mediaId: number;
    context?: Record<string, unknown>;
  }): Promise<boolean> {
    return this.addConversationMedia(data);
  }

  /**
   * Alias: removeMedia → removeConversationMedia (generated method name)
   */
  async removeMedia(data: { conversationId: number; mediaId: number }): Promise<boolean> {
    return this.removeConversationMedia(data);
  }

  /**
   * Add participant with proper role typing
   * Override to add ConversationRole type constraint
   */
  async addParticipant(data: {
    conversationId: number;
    personId: number;
    role?: ConversationRole;
  }): Promise<boolean> {
    return super.addParticipant(data);
  }
}
