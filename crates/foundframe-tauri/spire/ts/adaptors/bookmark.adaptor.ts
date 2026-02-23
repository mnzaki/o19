/**
 * Tauri Bookmark Adaptor
 *
 * Generated adaptor that invokes Tauri commands for Bookmark operations.
 * Delegates to the Platform implementation (local on desktop, service on Android).
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleBookmarkAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BookmarkPort } from '@o19/foundframe-front/ports';
import type { Bookmark } from '@o19/foundframe-front/domain';
import type { CreateBookmark, UpdateBookmark } from '@o19/foundframe-front/domain';

export class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor implements BookmarkPort {
  /**
   * BookmarkMgmt.create
   */
  async create(data: ): Promise<void> {
    await invoke<void>('create', {
      data,
    });
  }

  /**
   * BookmarkMgmt.list
   */
  async list(directory?: ): Promise<string[]> {
    return invoke<string[]>('list', {
      directory,
    });
  }

  /**
   * BookmarkMgmt.delete
   */
  async delete(id: ): Promise<boolean> {
    return invoke<boolean>('delete', {
      id,
    });
  }

}
