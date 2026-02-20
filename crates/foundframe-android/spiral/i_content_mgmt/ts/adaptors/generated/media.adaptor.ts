/**
 * Auto-generated Media Adaptor from IContentMgmt.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleMediaAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Media, CreateMedia } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriMediaAdaptor extends DrizzleMediaAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreateMedia): Promise<Media> {
    // Delegate to addMediaLink method
    return this.addMediaLink({
      directory: 'media',
      url: data.uri,
      mimeType: data.mimeType
    });
  }

  async addMediaLink(params: { 
    directory: string; 
    url: string; 
    title?: string; 
    mimeType?: string;
    subpath?: string;
  }): Promise<Media> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_media_link', { directory, url, title, mimeType, subpath });
    return this.reconstructMedia(result, data);
  }
}
