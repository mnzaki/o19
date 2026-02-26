/**
 * Conversation Management - Surface Imprint
 *
 * Conversations (multi-party communication) saved to TheStream™.
 * Represents the "encounter with the collective"—capturing shared moments.
 *
 * Database Schema (prisma):
 *   Conversation {
 *     id             Int     @id @default(autoincrement())
 *     title          String?
 *     content        String  // JSON: [{ author, text, timestamp, ... }]
 *     captureTime    Int     // When conversation was captured
 *     firstEntryTime Int?    // Timestamp of first message
 *     lastEntryTime  Int?    // Timestamp of last message
 *     sourceUrl      String? // Where this came from (if imported)
 *     createdAt      Int     // timestamp_ms
 *     updatedAt      Int     // timestamp_ms
 *   }
 *
 * Junction Tables:
 *   ConversationParticipant { conversationId, personId, role? }
 *   ConversationMedia { conversationId, mediaId, context? }
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// TYPES (for JSON fields)
// ============================================================================

/**
 * A single entry in a conversation
 */
interface ConversationEntry {
  author: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MANAGEMENT (defined first to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class ConversationMgmt extends loom.Management {
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
  addConversation(content: ConversationEntry[], title?: string, sourceUrl?: string): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a conversation by ID
   */
  @loom.crud.read
  getConversation(id: number): Conversation {
    throw new Error('Imprint only');
  }

  /**
   * List all conversations with pagination
   */
  @loom.crud.list({ collection: true })
  listConversations(limit?: number, offset?: number): Conversation[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a conversation
   */
  @loom.crud.update
  updateConversation(id: number, title?: string, content?: ConversationEntry[]): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Delete a conversation (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deleteConversation(id: number): boolean {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // PARTICIPANT METHODS
  // ========================================================================

  /**
   * Add a participant to a conversation
   */
  addParticipant(conversationId: number, personId: number, role?: string): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Remove a participant from a conversation
   */
  removeParticipant(conversationId: number, personId: number): boolean {
    throw new Error('Imprint only');
  }

  /**
   * List participants in a conversation
   */
  listParticipants(conversationId: number): number[] {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // MEDIA METHODS
  // ========================================================================

  /**
   * Add media reference to a conversation
   */
  addConversationMedia(
    conversationId: number,
    mediaId: number,
    context?: Record<string, unknown>
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Remove media reference from a conversation
   */
  removeConversationMedia(conversationId: number, mediaId: number): boolean {
    throw new Error('Imprint only');
  }

  /**
   * List media in a conversation
   */
  listConversationMedia(conversationId: number): number[] {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

/**
 * Conversation entity - Multi-party communication capture
 */
@ConversationMgmt.Entity()
export class Conversation {
  /** Primary key */
  id!: number;

  /** Optional title */
  title?: string;

  /** Content entries (ConversationEntry[]) */
  content!: ConversationEntry[];

  /** When this conversation was captured */
  captureTime!: number;

  /** Timestamp of first message */
  firstEntryTime?: number;

  /** Timestamp of last message */
  lastEntryTime?: number;

  /** Source URL if imported (e.g., chat export) */
  sourceUrl?: string;

  /** When this conversation was added */
  createdAt!: number;

  /** When this conversation was last updated */
  updatedAt!: number;
}

/**
 * ConversationParticipant junction entity
 */
@ConversationMgmt.Entity()
export class ConversationParticipant {
  conversationId!: number;

  personId!: number;

  role?: string;
}

/**
 * ConversationMedia junction entity
 */
@ConversationMgmt.Entity()
export class ConversationMedia {
  conversationId!: number;

  mediaId!: number;

  context?: Record<string, unknown>;
}
