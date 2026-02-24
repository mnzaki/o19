/**
 * Conversation Management - Surface Imprint
 *
 * Conversations (multi-party communication) saved to TheStream™.
 * Represents the "encounter with the collective"—capturing shared moments.
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './WARP.js';

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class ConversationMgmt extends loom.Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================

  MAX_TITLE_LENGTH = 200;
  DEFAULT_DIRECTORY = 'conversations';
  GIT_BRANCH = 'main';

  // ========================================================================
  // CRUD METHODS
  // ========================================================================

  /**
   * Add a conversation to the stream
   */
  @loom.crud.create
  addConversation(
    conversationId: string,
    title?: string,
    participants?: string[]
  ): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a conversation by its ID
   */
  @loom.crud.read
  getConversation(conversationId: string): Conversation {
    throw new Error('Imprint only');
  }

  /**
   * List all conversations
   */
  @loom.crud.list({ collection: true })
  listConversations(): string[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a conversation
   */
  @loom.crud.update
  updateConversation(
    conversationId: string,
    title?: string,
    participants?: string[]
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Delete a conversation (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deleteConversation(conversationId: string): boolean {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // PARTICIPANT METHODS
  // ========================================================================

  /**
   * Add a participant to a conversation
   */
  addParticipant(
    conversationId: string,
    personHandle: string,
    role?: string
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Remove a participant from a conversation
   */
  removeParticipant(
    conversationId: string,
    personHandle: string
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * List participants in a conversation
   */
  listParticipants(conversationId: string): string[] {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // MEDIA METHODS
  // ========================================================================

  /**
   * Add media reference to a conversation
   */
  addConversationMedia(
    conversationId: string,
    mediaUrl: string,
    context?: Record<string, unknown>
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Remove media reference from a conversation
   */
  removeConversationMedia(
    conversationId: string,
    mediaUrl: string
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * List media in a conversation
   */
  listConversationMedia(conversationId: string): string[] {
    throw new Error('Imprint only');
  }
}

/**
 * Conversation data structure
 */
interface Conversation {
  conversationId: string;
  title?: string;
  participants?: string[];
  media?: string[];
  seenAt: number;
  updatedAt?: number;
  pkbUrl: string;
  commitHash: string;
}

/**
 * Export the Management class for collector
 */
export { ConversationMgmt };
