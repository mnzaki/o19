/**
 * Tauri Bookmark Adaptor
 * 
 * Extends the DrizzleBookmarkAdaptor and overrides write methods
 * to invoke Tauri commands instead of direct DB operations.
 */

import { DrizzleBookmarkAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Bookmark, CreateBookmark, UpdateBookmark } from '@o19/foundframe-front/domain';
import { invoke } from '@tauri-apps/api/core';

export class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  /**
   * Create a bookmark via Tauri command
   * This delegates to the Platform implementation which may be local (desktop)
   * or remote (Android service).
   */
  async create(data: CreateBookmark): Promise<Bookmark> {
    // Call the Tauri command which delegates to Platform
    const result = await invoke<{
      id: number | null;
      seenAt: number;
      reference: string;
    }>('add_bookmark', {
      url: data.url,
      title: data.title,
      notes: data.notes,
    });

    // After the backend creates the bookmark, we still need to get it from DB
    // The SQL adapter in the backend will have inserted it
    // Query by the returned reference or URL
    const bookmark = await this.getByUrl(data.url);
    if (!bookmark) {
      throw new Error('Bookmark was created but not found in database');
    }
    return bookmark;
  }

  /**
   * Update is not supported via stream - would need a different approach
   * For now, delegate to parent (direct DB update)
   */
  async update(id: number, data: UpdateBookmark): Promise<void> {
    // TODO: Could add a Tauri command for updates
    // For now, use the direct DB update
    return super.update(id, data);
  }

  /**
   * Delete is not supported via stream
   * For now, delegate to parent (direct DB delete)
   */
  async delete(id: number): Promise<void> {
    // TODO: Could add a Tauri command for deletes
    // For now, use the direct DB delete
    return super.delete(id);
  }
}
