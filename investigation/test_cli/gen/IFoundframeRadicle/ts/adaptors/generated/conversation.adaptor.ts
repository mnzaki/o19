/**
 * Auto-generated Conversation Adaptor from IFoundframeRadicle.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleConversationAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Conversation, CreateConversation } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriConversationAdaptor extends DrizzleConversationAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreateConversation): Promise<Conversation> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_conversation', {
      conversationId: data.conversationId,
      title: data.title
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Conversation;
  }

    async addConversation(conversationId?: string, title?: string): Promise<Conversation> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_conversation', { conversationId, title });
    return this.reconstructConversation(result, data);
  }
}
