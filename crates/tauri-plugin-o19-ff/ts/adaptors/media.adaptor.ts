/**
 * Tauri Media Adaptor
 * 
 * Extends the DrizzleMediaAdaptor and overrides write methods
 * to invoke Tauri commands instead of direct DB operations.
 */

import { DrizzleMediaAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Media, CreateMedia, UpdateMedia } from '@o19/foundframe-front/domain';
import { invoke } from '@tauri-apps/api/core';

export class TauriMediaAdaptor extends DrizzleMediaAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  /**
   * Create a media link via Tauri command
   * This delegates to the Platform implementation which may be local (desktop)
   * or remote (Android service).
   */
  async create(data: CreateMedia): Promise<Media> {
    // Determine directory based on mime type
    let directory = 'media';
    if (data.mimeType?.startsWith('image/')) {
      directory = 'images';
    } else if (data.mimeType?.startsWith('video/')) {
      directory = 'videos';
    } else if (data.mimeType?.startsWith('audio/')) {
      directory = 'audio';
    }

    // Call the Tauri command which delegates to Platform
    const result = await invoke<{
      id: number | null;
      seenAt: number;
      reference: string;
    }>('add_media_link', {
      directory,
      url: data.uri,
      title: data.metadata?.title as string | undefined,
      mimeType: data.mimeType,
      subpath: undefined,
    });

    // Query the created media from DB
    const media = await this.findByContentHash(data.contentHash || data.uri);
    if (!media) {
      throw new Error('Media was created but not found in database');
    }
    return media;
  }

  /**
   * Update is not supported via stream
   * For now, delegate to parent
   */
  async update(id: number, data: UpdateMedia): Promise<void> {
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
