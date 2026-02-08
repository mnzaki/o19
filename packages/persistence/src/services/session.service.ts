/**
 * Session Service
 * 
 * Manages session state: foreground position, active input, scroll positions, and drafts.
 */

import type { DatabaseAdapter } from '../adapter.js';
import type { InputType } from '../types/index.js';
import type { ISessionService } from './interfaces.js';

export class SessionService implements ISessionService {
  constructor(private adapter: DatabaseAdapter) {}

  // Foreground position
  async getForegroundPosition(): Promise<number> {
    const result = await this.adapter.query<{ value: string }>(
      `SELECT value FROM session_state WHERE key = 'foreground_position' LIMIT 1`
    );
    return result.length > 0 ? parseInt(result[0].value, 10) || 0 : 0;
  }

  async setForegroundPosition(position: number): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO session_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['foreground_position', position.toString(), Date.now()]
    );
  }

  // Active input tab
  async getActiveInput(): Promise<InputType> {
    const result = await this.adapter.query<{ value: string }>(
      `SELECT value FROM session_state WHERE key = 'active_input' LIMIT 1`
    );
    if (result.length === 0) return null;
    const value = result[0].value;
    if (value === 'text' || value === 'link' || value === 'person') {
      return value;
    }
    return null;
  }

  async setActiveInput(input: InputType): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO session_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['active_input', input ?? '', Date.now()]
    );
  }

  // Feed scroll position
  async getFeedScrollPosition(): Promise<number> {
    const result = await this.adapter.query<{ value: string }>(
      `SELECT value FROM session_state WHERE key = 'feed_scroll_position' LIMIT 1`
    );
    return result.length > 0 ? parseInt(result[0].value, 10) || 0 : 0;
  }

  async setFeedScrollPosition(position: number): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO session_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['feed_scroll_position', position.toString(), Date.now()]
    );
  }

  // Last read post ID
  async getLastReadPostId(): Promise<string | null> {
    const result = await this.adapter.query<{ value: string }>(
      `SELECT value FROM session_state WHERE key = 'last_read_post_id' LIMIT 1`
    );
    return result.length > 0 ? result[0].value : null;
  }

  async setLastReadPostId(postId: string | null): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO session_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['last_read_post_id', postId ?? '', Date.now()]
    );
  }

  // Text draft
  async getTextDraft(): Promise<string> {
    const result = await this.adapter.query<{ content: string }>(
      `SELECT content FROM input_drafts WHERE type = 'text' LIMIT 1`
    );
    return result.length > 0 ? result[0].content : '';
  }

  async setTextDraft(draft: string): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO input_drafts (type, content, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(type) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
      ['text', draft, Date.now()]
    );
  }

  // Link draft
  async getLinkDraft(): Promise<string> {
    const result = await this.adapter.query<{ content: string }>(
      `SELECT content FROM input_drafts WHERE type = 'link' LIMIT 1`
    );
    return result.length > 0 ? result[0].content : '';
  }

  async setLinkDraft(draft: string): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO input_drafts (type, content, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(type) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
      ['link', draft, Date.now()]
    );
  }

  // Person draft
  async getPersonDraft(): Promise<{ did: string; displayName: string; avatarUri?: string } | null> {
    const result = await this.adapter.query<{ content: string }>(
      `SELECT content FROM input_drafts WHERE type = 'person' LIMIT 1`
    );
    if (result.length === 0 || !result[0].content) return null;
    try {
      return JSON.parse(result[0].content);
    } catch {
      return null;
    }
  }

  async setPersonDraft(draft: { did: string; displayName: string; avatarUri?: string } | null): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO input_drafts (type, content, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(type) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
      ['person', draft ? JSON.stringify(draft) : '', Date.now()]
    );
  }

  // Clear all drafts
  async clearAllDrafts(): Promise<void> {
    await this.adapter.execute(`DELETE FROM input_drafts`);
  }
}
