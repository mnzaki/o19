/**
 * Ports - repository interfaces (the "what", not the "how")
 *
 * These define the contract that database implementations must fulfill.
 * Each Port interface defines operations for one entity type.
 * Each Adaptor abstract class provides default "not implemented" implementations.
 */

// Import types for the aggregate interface
import type {
  MediaPort,
  BookmarkPort,
  PostPort,
  PersonPort,
  ConversationPort,
  TheStreamPort,
  ViewPort
} from '../../spire/src/ports/index.js';
import type { PreviewPort } from './preview.port.js';
import type { DevicePort } from './device.port.js';

export type * from './preview.port.js';

export type * from './device.port.js';
export type * from '../../spire/src/ports/index.js';

/**
 * Aggregate port - all database operations
 * Implementations provide this to the application layer
 */
export interface DatabasePorts {
  theStream: TheStreamPort;
  media: MediaPort;
  bookmark: BookmarkPort;
  post: PostPort;
  person: PersonPort;
  conversation: ConversationPort;
  preview: PreviewPort;
  view: ViewPort;
  device: DevicePort;
}
