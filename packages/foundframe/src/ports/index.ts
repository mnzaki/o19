/**
 * Ports - repository interfaces (the "what", not the "how")
 * 
 * These define the contract that database implementations must fulfill.
 * Each Port interface defines operations for one entity type.
 * Each Adaptor abstract class provides default "not implemented" implementations.
 */

// Import types for the aggregate interface
import type { PersonPort } from './person.port.js';
import type { MediaPort } from './media.port.js';
import type { PostPort } from './post.port.js';
import type { BookmarkPort } from './bookmark.port.js';
import type { ConversationPort } from './conversation.port.js';
import type { StreamPort } from './stream.port.js';
import type { ViewPort } from './view.port.js';
import type { PreviewPort } from './preview.port.js';

export { BasePort } from './base.port.js';
export type { BaseCrudPort } from './base.port.js';

export { PersonAdaptor } from './person.port.js';
export type { PersonPort } from './person.port.js';

export { MediaAdaptor } from './media.port.js';
export type { MediaPort } from './media.port.js';

export { PostAdaptor } from './post.port.js';
export type { PostPort } from './post.port.js';

export { BookmarkAdaptor } from './bookmark.port.js';
export type { BookmarkPort } from './bookmark.port.js';

export { ConversationAdaptor } from './conversation.port.js';
export type { ConversationPort } from './conversation.port.js';

export { StreamAdaptor } from './stream.port.js';
export type { StreamPort } from './stream.port.js';

export { ViewAdaptor } from './view.port.js';
export type { ViewPort } from './view.port.js';

export { PreviewAdaptor } from './preview.port.js';
export type { PreviewPort, PreviewMetadata } from './preview.port.js';

/**
 * Aggregate port - all database operations
 * Implementations provide this to the application layer
 */
export interface DatabasePorts {
  person: PersonPort;
  media: MediaPort;
  post: PostPort;
  bookmark: BookmarkPort;
  conversation: ConversationPort;
  stream: StreamPort;
  view: ViewPort;
  preview: PreviewPort;
}
