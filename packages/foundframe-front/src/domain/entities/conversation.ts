/**
 * Conversation entity
 * External thread capture - chats, DMs, forum threads
 */

import type { ConversationRole } from '../values/common.js';

export interface ConversationEntry {
  author: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: number;
  title?: string;
  content: ConversationEntry[]; // [{ author, text, timestamp, ... }]
  captureTime: Date; // when we captured it
  firstEntryTime?: Date; // when thread started (external)
  lastEntryTime?: Date; // when thread ended (external)
  sourceUrl?: string; // where this came from
  participants?: ConversationParticipant[];
  media?: ConversationMedia[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface ConversationParticipant {
  personId: number;
  role?: ConversationRole;
}

export interface ConversationMedia {
  mediaId: number;
  context?: Record<string, unknown>;
}

/** Properties required to create a conversation */
export type CreateConversation = Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>;

/** Properties that can be updated */
export type UpdateConversation = Partial<Omit<Conversation, 'createdAt'>> & {
  id: Conversation['id'];
};

/** Filter criteria for conversation queries (matches loom ConversationFilter) */
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
