/**
 * Drizzle ORM implementations of foundframe ports
 * 
 * These adaptors implement the repository interfaces defined in @o19/foundframe
 * using Drizzle ORM for SQLite.
 */

export { DrizzlePersonAdaptor } from './person.adaptor.js';
export { DrizzleMediaAdaptor } from './media.adaptor.js';
export { DrizzlePostAdaptor } from './post.adaptor.js';
export { DrizzleBookmarkAdaptor } from './bookmark.adaptor.js';
export { DrizzleConversationAdaptor } from './conversation.adaptor.js';
export { DrizzleStreamAdaptor } from './stream.adaptor.js';
export { DrizzleViewAdaptor } from './view.adaptor.js';

import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { DrizzlePersonAdaptor } from './person.adaptor.js';
import { DrizzleMediaAdaptor } from './media.adaptor.js';
import { DrizzlePostAdaptor } from './post.adaptor.js';
import { DrizzleBookmarkAdaptor } from './bookmark.adaptor.js';
import { DrizzleConversationAdaptor } from './conversation.adaptor.js';
import { DrizzleStreamAdaptor } from './stream.adaptor.js';
import { DrizzleViewAdaptor } from './view.adaptor.js';
import type { DatabasePorts } from '@o19/foundframe/ports';

/**
 * Create all Drizzle adaptors
 */
export function createDrizzleAdaptors(db: BaseSQLiteDatabase<any, any> | any): DatabasePorts {
  const stream = new DrizzleStreamAdaptor(db);
  const view = new DrizzleViewAdaptor(db, stream);
  
  return {
    person: new DrizzlePersonAdaptor(db),
    media: new DrizzleMediaAdaptor(db),
    post: new DrizzlePostAdaptor(db),
    bookmark: new DrizzleBookmarkAdaptor(db),
    conversation: new DrizzleConversationAdaptor(db),
    stream,
    view,
  };
}
