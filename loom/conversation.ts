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
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';

// ============================================================================
// FILTER TYPE
// ============================================================================

/**
 * Filter criteria for Conversation list queries.
 * All fields are optional - only specified filters are applied.
 */
export interface ConversationFilter {
  /** Filter by title (exact match) */
  title?: string;
  /** Filter by source URL (exact match) */
  sourceUrl?: string;
  /** Filter by capture time >= this timestamp */
  captureTimeAfter?: number;
  /** Filter by capture time <= this timestamp */
  captureTimeBefore?: number;
  /** Only return entries with createdAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with createdAt <= this timestamp (inclusive) */
  before?: number;
}

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
  addConversation(
    content: ConversationEntry[],
    captureTime: Date,
    title?: string,
    sourceUrl?: string
  ): void {
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
   * List conversations with optional filtering.
   *
   * @example
   * // Basic pagination
   * listConversations(50, 0)
   *
   * // By source URL
   * listConversations(50, 0, { sourceUrl: 'https://chat.example.com/room/123' })
   *
   * // Recent conversations
   * listConversations(50, 0, { after: Date.now() - 86400000 })
   */
  @loom.crud.list({ collection: true })
  listConversations(limit?: number, offset?: number, filter?: ConversationFilter): Conversation[] {
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
class Conversation {
  id = crud.field.id();
  title = crud.field.string({ nullable: true });
  content = crud.field.json<ConversationEntry[]>();
  attributedTo = crud.field.string({ nullable: true }); // matches StructuredData.conversation()
  captureTime = crud.field.int();
  firstEntryTime = crud.field.int({ nullable: true });
  lastEntryTime = crud.field.int({ nullable: true });
  sourceUrl = crud.field.string({ nullable: true });
  createdAt = crud.field.createdAt();
  updatedAt = crud.field.updatedAt();
}

/**
 * ConversationParticipant junction entity
 *
@ConversationMgmt.Entity()
export class ConversationParticipant {
  conversationId = crud.field.int();
  personId = crud.field.int();
  role = crud.field.string({ nullable: true });
}
*/

/**
 * ConversationMedia junction entity
 *
@ConversationMgmt.Entity()
export class ConversationMedia {
  conversationId = crud.field.int();
  mediaId = crud.field.int();
  context = crud.field.json<Record<string, unknown>>({ nullable: true });
}
*/
