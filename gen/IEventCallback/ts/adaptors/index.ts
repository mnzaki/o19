/**
 * Auto-generated Tauri adaptors from IEventCallback.aidl
 * 
 * This module exports generated adaptors that bridge TypeScript domain
 * to Tauri commands that delegate to the AIDL service.
 */

import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { DatabasePorts } from '@o19/foundframe-front';
import { DrizzleViewAdaptor } from '@o19/foundframe-drizzle/adaptors';

import { TauriPostAdaptor } from './generated/post.adaptor.js';
import { TauriBookmarkAdaptor } from './generated/bookmark.adaptor.js';
import { TauriMediaAdaptor } from './generated/media.adaptor.js';
import { TauriPersonAdaptor } from './generated/person.adaptor.js';
import { TauriConversationAdaptor } from './generated/conversation.adaptor.js';
import { TauriStreamAdaptor } from './generated/stream.adaptor.js';
import { TauriDeviceAdaptor } from './generated/device.adaptor.js';

/**
 * Result from stream entry creation commands
 */
export interface StreamEntryResult {
  id?: number;
  seenAt: number;
  reference: string;
}

/**
 * Create all Tauri adaptors
 */
export function createTauriAdaptors(db: BaseSQLiteDatabase<any, any>): DatabasePorts {
  const stream = new TauriStreamAdaptor(db);
  const view = new DrizzleViewAdaptor(db, stream);

  return {
  post: new TauriPostAdaptor(db),
  bookmark: new TauriBookmarkAdaptor(db),
  media: new TauriMediaAdaptor(db),
  person: new TauriPersonAdaptor(db),
  conversation: new TauriConversationAdaptor(db),
  stream: new TauriStreamAdaptor(db),
  device: new TauriDeviceAdaptor(db),
    view,
  };
}

export * from './generated/';
