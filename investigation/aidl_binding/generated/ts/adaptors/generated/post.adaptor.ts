/**
 * Auto-generated Post Adaptor from IFoundframeRadicle.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzlePostAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Post, CreatePost } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriPostAdaptor extends DrizzlePostAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreatePost): Promise<Post> {
    // Extract text content from bits
    const content = data.bits
      .filter(bit => bit.type === 'text')
      .map(bit => bit.content)
      .join('');
    
    const headingBit = data.bits.find(bit => bit.type === 'heading');
    const title = headingBit?.content;

    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|add_post', { content, title });
    return this.reconstructPost(result, data);
  }
}
