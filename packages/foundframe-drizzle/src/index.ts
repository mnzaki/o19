/**
 * @o19/foundframe-drizzle
 *
 * Drizzle ORM implementation of foundframe ports.
 *
 * This package provides concrete database implementations using Drizzle ORM
 * for SQLite. It implements all the ports defined in @o19/foundframe.
 *
 * Usage:
 * ```typescript
 * import { createDrizzleAdaptors } from '@o19/foundframe-drizzle';
 * import { createServices } from '@o19/foundframe';
 *
 * const adaptors = createDrizzleAdaptors(db);
 * const services = createServices(adaptors);
 * ```
 */

// Re-export from foundframe for convenience
export type {
  // Domain entities
  Person,
  Media,
  Post,
  Bookmark,
  Conversation,
  StreamEntry,
  View,
  // Value objects
  UAddress,
  AccumulableBit,
  StreamChunkType,
  ViewBadge,
  // Ports
  DatabasePorts,
  PersonPort,
  MediaPort,
  PostPort,
  BookmarkPort,
  ConversationPort,
  StreamPort,
  ViewPort,
  // Services
  DomainServices
} from '@o19/foundframe';

export {
  // Service classes
  PersonService,
  MediaService,
  PostService,
  BookmarkService,
  ConversationService,
  StreamService,
  ViewService,
  createServices,
  createDomainServicesAsync
} from '@o19/foundframe';

// Drizzle-specific exports
export {
  DrizzlePersonAdaptor,
  DrizzleMediaAdaptor,
  DrizzlePostAdaptor,
  DrizzleBookmarkAdaptor,
  DrizzleConversationAdaptor,
  DrizzleStreamAdaptor,
  DrizzleViewAdaptor,
  createDrizzleAdaptors
} from './adaptors/index.js';
