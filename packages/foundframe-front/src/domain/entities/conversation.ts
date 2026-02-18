/**
 * Conversation entity
 * External thread capture - chats, DMs, forum threads
 */

import type { ConversationRole } from '../values/common.js';

export interface Conversation {
  id: number;
  title?: string;
  content: unknown[];              // [{ author, text, timestamp, ... }]
  captureTime: Date;               // when we captured it
  firstEntryTime?: Date;           // when thread started (external)
  lastEntryTime?: Date;            // when thread ended (external)
  sourceUrl?: string;              // where this came from
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
export type UpdateConversation = Partial<Omit<Conversation, 'id' | 'createdAt'>>;
