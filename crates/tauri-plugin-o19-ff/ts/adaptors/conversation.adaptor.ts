/**
 * Tauri Conversation Adaptor
 * 
 * Extends the DrizzleConversationAdaptor and overrides write methods
 * to invoke Tauri commands instead of direct DB operations.
 */

import { DrizzleConversationAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Conversation, CreateConversation, UpdateConversation } from '@o19/foundframe-front/domain';
import { invoke } from '@tauri-apps/api/core';

export class TauriConversationAdaptor extends DrizzleConversationAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  /**
   * Create a conversation via Tauri command
   * This delegates to the Platform implementation which may be local (desktop)
   * or remote (Android service).
   */
  async create(data: CreateConversation): Promise<Conversation> {
    // Generate a conversation ID if not provided
    const conversationId = data.metadata?.conversationId as string | undefined 
      || `conv-${Date.now()}`;

    // Call the Tauri command which delegates to Platform
    const result = await invoke<{
      id: number | null;
      seenAt: number;
      reference: string;
    }>('add_conversation', {
      conversationId,
      title: data.title,
    });

    // Query the created conversation from DB
    const conversations = await this.query();
    const conversation = conversations.find(c => 
      c.metadata?.conversationId === conversationId
    );
    if (!conversation) {
      throw new Error('Conversation was created but not found in database');
    }
    return conversation;
  }

  /**
   * Update is not supported via stream
   * For now, delegate to parent
   */
  async update(id: number, data: UpdateConversation): Promise<void> {
    return super.update(id, data);
  }

  /**
   * Delete is not supported via stream
   * For now, delegate to parent
   */
  async delete(id: number): Promise<void> {
    return super.delete(id);
  }
}
