/**
 * foundframe - Foundational Framework for o19 apps
 * 
 * Domain-driven architecture with clear separation:
 * - Domain: Entities, value objects, domain services
 * - Ports: Repository interfaces (what the domain needs)
 * - Services: Business logic (uses ports)
 * 
 * Infrastructure implementations (adapters) are in separate packages:
 * - @o19/foundframe-drizzle: Drizzle ORM implementation
 * - @o19/schema: Database schema definitions
 */

// ============================================
// Domain Values
// ============================================

export type {
  UAddress,
  ContentType,
  TextSpan,
  SpatiotemporalPoint,
  XanaduLink,
} from './domain/values/address.js';

export {
  parseUAddress,
  buildUAddress,
} from './domain/values/address.js';

export type {
  LinkPreview,
  AccumulableBit,
  InputType,
  AccumulatingPost,
} from './domain/values/content.js';

export {
  createEmptyAccumulation,
} from './domain/values/content.js';

export type {
  SortBy,
  ViewBadge,
  ConversationRole,
  Pagination,
  DateRange,
  QueryResult,
} from './domain/values/common.js';

// ============================================
// Domain Entities
// ============================================

export type {
  Person,
  CreatePerson,
  UpdatePerson,
} from './domain/entities/person.js';

export type {
  Media,
  CreateMedia,
  UpdateMedia,
} from './domain/entities/media.js';

export type {
  Post,
  CreatePost,
  UpdatePost,
  PostFilters,
} from './domain/entities/post.js';

export type {
  Bookmark,
  CreateBookmark,
  UpdateBookmark,
  BookmarkFilters,
} from './domain/entities/bookmark.js';

export type {
  Conversation,
  ConversationParticipant,
  ConversationMedia,
  CreateConversation,
  UpdateConversation,
} from './domain/entities/conversation.js';

export type {
  StreamChunkType,
  StreamChunk,
  StreamEntry,
  AddToStream,
  StreamFilters,
} from './domain/entities/stream.js';

export type {
  View,
  ViewFilters,
  CreateView,
  UpdateView,
} from './domain/entities/view.js';

// Entity namespace for cleaner imports
export type * as Entities from './domain/entities/index.js';

// ============================================
// Ports (Repository Interfaces)
// ============================================

export {
  BasePort,
} from './ports/base.port.js';
export type {
  BaseCrudPort,
} from './ports/base.port.js';

export {
  PersonAdaptor,
} from './ports/person.port.js';
export type {
  PersonPort,
} from './ports/person.port.js';

export {
  MediaAdaptor,
} from './ports/media.port.js';
export type {
  MediaPort,
} from './ports/media.port.js';

export {
  PostAdaptor,
} from './ports/post.port.js';
export type {
  PostPort,
} from './ports/post.port.js';

export {
  BookmarkAdaptor,
} from './ports/bookmark.port.js';
export type {
  BookmarkPort,
} from './ports/bookmark.port.js';

export {
  ConversationAdaptor,
} from './ports/conversation.port.js';
export type {
  ConversationPort,
} from './ports/conversation.port.js';

export {
  StreamAdaptor,
} from './ports/stream.port.js';
export type {
  StreamPort,
} from './ports/stream.port.js';

export {
  ViewAdaptor,
} from './ports/view.port.js';
export type {
  ViewPort,
} from './ports/view.port.js';

export {
  PreviewAdaptor,
} from './ports/preview.port.js';
export type {
  PreviewPort,
  PreviewMetadata,
} from './ports/preview.port.js';

export type {
  DatabasePorts,
} from './ports/index.js';

// ============================================
// Domain Services
// ============================================

export {
  PersonService,
  MediaService,
  PostService,
  BookmarkService,
  ConversationService,
  StreamService,
  ViewService,
  PreviewService,
  createServices,
  createDomainServicesAsync,
} from './services/index.js';

export type {
  DomainServices,
} from './services/index.js';

// ============================================
// Foundframe Info
// ============================================

export const FOUNDFRAME_VERSION = '0.1.0';
export const FOUNDFRAME_NAME = '@o19/foundframe';
