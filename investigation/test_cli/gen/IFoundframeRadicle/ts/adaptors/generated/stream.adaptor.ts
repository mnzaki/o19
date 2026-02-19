/**
 * Auto-generated Stream Adaptor from IFoundframeRadicle.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleStreamAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Stream, CreateStream } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriStreamAdaptor extends DrizzleStreamAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreateStream): Promise<Stream> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_text_note', {
      directory: data.directory,
      content: data.content,
      title: data.title,
      subpath: data.subpath
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Stream;
  }

    async addTextNote(directory?: string, content?: string, title?: string, subpath?: string): Promise<Stream> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_text_note', { directory, content, title, subpath });
    return this.reconstructStream(result, data);
  }
}
