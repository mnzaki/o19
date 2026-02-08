/**
 * Session Service
 * 
 * Manages session state: foreground position, active input, scroll positions, and drafts.
 */

import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { InputType } from '@repo/persistence';
import type { ISessionService } from '@repo/persistence/services';
import { sessionState, inputDrafts } from '../schema.js';

export class SessionService implements ISessionService {
  constructor(private db: BaseSQLiteDatabase<any, any>) {}

  // Foreground position
  async getForegroundPosition(): Promise<number> {
    const result = await this.db.select().from(sessionState).where(eq(sessionState.key, 'foreground_position')).limit(1);
    return result.length > 0 ? parseInt(result[0].value, 10) || 0 : 0;
  }

  async setForegroundPosition(position: number): Promise<void> {
    await this.db.insert(sessionState)
      .values({ key: 'foreground_position', value: position.toString(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sessionState.key,
        set: { value: position.toString(), updatedAt: new Date() }
      });
  }

  // Active input tab
  async getActiveInput(): Promise<InputType> {
    const result = await this.db.select().from(sessionState).where(eq(sessionState.key, 'active_input')).limit(1);
    if (result.length === 0) return null;
    const value = result[0].value;
    if (value === 'text' || value === 'link' || value === 'person') {
      return value;
    }
    return null;
  }

  async setActiveInput(input: InputType): Promise<void> {
    await this.db.insert(sessionState)
      .values({ key: 'active_input', value: input ?? '', updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sessionState.key,
        set: { value: input ?? '', updatedAt: new Date() }
      });
  }

  // Feed scroll position
  async getFeedScrollPosition(): Promise<number> {
    const result = await this.db.select().from(sessionState).where(eq(sessionState.key, 'feed_scroll_position')).limit(1);
    return result.length > 0 ? parseInt(result[0].value, 10) || 0 : 0;
  }

  async setFeedScrollPosition(position: number): Promise<void> {
    await this.db.insert(sessionState)
      .values({ key: 'feed_scroll_position', value: position.toString(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sessionState.key,
        set: { value: position.toString(), updatedAt: new Date() }
      });
  }

  // Last read post ID
  async getLastReadPostId(): Promise<string | null> {
    const result = await this.db.select().from(sessionState).where(eq(sessionState.key, 'last_read_post_id')).limit(1);
    return result.length > 0 ? result[0].value : null;
  }

  async setLastReadPostId(postId: string | null): Promise<void> {
    await this.db.insert(sessionState)
      .values({ key: 'last_read_post_id', value: postId ?? '', updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sessionState.key,
        set: { value: postId ?? '', updatedAt: new Date() }
      });
  }

  // Text draft
  async getTextDraft(): Promise<string> {
    const result = await this.db.select().from(inputDrafts).where(eq(inputDrafts.type, 'text')).limit(1);
    return result.length > 0 ? result[0].content : '';
  }

  async setTextDraft(draft: string): Promise<void> {
    await this.db.insert(inputDrafts)
      .values({ type: 'text', content: draft, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: inputDrafts.type,
        set: { content: draft, updatedAt: new Date() }
      });
  }

  // Link draft
  async getLinkDraft(): Promise<string> {
    const result = await this.db.select().from(inputDrafts).where(eq(inputDrafts.type, 'link')).limit(1);
    return result.length > 0 ? result[0].content : '';
  }

  async setLinkDraft(draft: string): Promise<void> {
    await this.db.insert(inputDrafts)
      .values({ type: 'link', content: draft, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: inputDrafts.type,
        set: { content: draft, updatedAt: new Date() }
      });
  }

  // Person draft
  async getPersonDraft(): Promise<{ did: string; displayName: string; avatarUri?: string } | null> {
    const result = await this.db.select().from(inputDrafts).where(eq(inputDrafts.type, 'person')).limit(1);
    if (result.length === 0 || !result[0].content) return null;
    try {
      return JSON.parse(result[0].content);
    } catch {
      return null;
    }
  }

  async setPersonDraft(draft: { did: string; displayName: string; avatarUri?: string } | null): Promise<void> {
    await this.db.insert(inputDrafts)
      .values({ type: 'person', content: draft ? JSON.stringify(draft) : '', updatedAt: new Date() })
      .onConflictDoUpdate({
        target: inputDrafts.type,
        set: { content: draft ? JSON.stringify(draft) : '', updatedAt: new Date() }
      });
  }

  // Clear all drafts
  async clearAllDrafts(): Promise<void> {
    await this.db.delete(inputDrafts);
  }
}
