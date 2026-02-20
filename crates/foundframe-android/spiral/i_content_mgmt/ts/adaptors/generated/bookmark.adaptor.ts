/**
 * Auto-generated Bookmark Adaptor from IContentMgmt.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleBookmarkAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Bookmark, CreateBookmark } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreateBookmark): Promise<Bookmark> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_bookmark', {
      url: data.url,
      title: data.title,
      notes: data.notes
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Bookmark;
  }

    async addBookmark(url?: string, title?: string, notes?: string): Promise<Bookmark> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_bookmark', { url, title, notes });
    return this.reconstructBookmark(result, data);
  }
}
