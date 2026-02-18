/**
 * Tauri Post Adaptor
 * 
 * Extends the DrizzlePostAdaptor and overrides write methods
 * to invoke Tauri commands instead of direct DB operations.
 */

import { DrizzlePostAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Post, CreatePost, UpdatePost } from '@o19/foundframe-front/domain';
import { invoke } from '@tauri-apps/api/core';

export class TauriPostAdaptor extends DrizzlePostAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  /**
   * Create a post via Tauri command
   * This delegates to the Platform implementation which may be local (desktop)
   * or remote (Android service).
   */
  async create(data: CreatePost): Promise<Post> {
    // Extract text content from bits
    const textContent = data.bits
      .filter((bit: any) => bit.type === 'text')
      .map((bit: any) => bit.content)
      .join('\n\n');

    // Get title from first heading bit or use empty
    const headingBit = data.bits.find((bit: any) => bit.type === 'heading');
    const title = headingBit?.content;

    // Call the Tauri command which delegates to Platform
    const result = await invoke<{
      id: number | null;
      seenAt: number;
      reference: string;
    }>('add_post', {
      content: textContent,
      title: title,
    });

    // Query the created post from DB
    // The SQL adapter will have inserted it
    const posts = await this.query({ pagination: { limit: 1 } });
    if (posts.length === 0) {
      throw new Error('Post was created but not found in database');
    }
    return posts[0];
  }

  /**
   * Update is not supported via stream
   * For now, delegate to parent
   */
  async update(id: number, data: UpdatePost): Promise<void> {
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
