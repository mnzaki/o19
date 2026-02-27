/**
 * Tauri TheStream Adaptor
 *
 * Implements DevicePort by invoking Tauri commands.
 * Delegates to the Platform implementation (local on desktop, service on Android).
 */

import type { TheStreamEntry, TheStreamEntryFilter } from '@o19/foundframe-front/domain';
import { TauriTheStreamAdaptor as TheStreamAdaptor } from '../../spire/ts/adaptors/theStream.adaptor.js';
import { invoke } from '@tauri-apps/api/core';

export class TauriTheStreamAdaptor extends TheStreamAdaptor {
  list(data: {
    limit?: number;
    offset?: number;
    filter?: TheStreamEntryFilter;
  }): Promise<TheStreamEntry[]> {
    throw new Error('not yet');
  }

  getById(id: number): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }

  delete(id: number): Promise<boolean> {
    return invoke('plugin:o19-foundframe-tauri|delete_entry', { id });
  }

  /**
   * TheStreamMgmt.getEntriesByKind
   */
  getEntriesByKind(data: {
    kind: 'media' | 'post' | 'bookmark' | 'person' | 'conversation';
    limit?: number;
    before?: number;
  }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }
  /**
   * TheStreamMgmt.search
   */
  search(data: { query: string; kinds?: string[]; limit?: number }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }
  /**
   * TheStreamMgmt.addBookmark
   */
  addBookmark(data: { bookmarkId: number; seenAt?: number }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }

  /**
   * TheStreamMgmt.addPost
   */
  addPost(data: { postId: number; seenAt?: number }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }

  /**
   * TheStreamMgmt.addMedia
   */
  addMedia(data: { mediaId: number; seenAt?: number }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }

  /**
   * TheStreamMgmt.addPerson
   */
  addPerson(data: { personId: number; seenAt?: number }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }

  /**
   * TheStreamMgmt.addConversation
   */
  addConversation(data: { conversationId: number; seenAt?: number }): Promise<TheStreamEntry> {
    throw new Error('not yet');
  }
}
