/**
 * Service Interfaces
 * 
 * Business logic contracts for persistence services.
 * TheStream™ architecture: stream-first, views as lenses.
 */

import type { 
  Post, 
  AccumulatingPost, 
  View, 
  ViewFilters, 
  InputType, 
  Person,
  Media,
  Bookmark,
  Conversation,
  TheStreamEntry,
  StreamChunk,
  StreamChunkType,
  PostServiceFilters,
  SortBy
} from './types.js';

// ============================================
// TheStream™ Service - Core of the experience
// ============================================

export interface IStreamService {
  /** Add a person to the stream */
  addPerson(personId: number, seenAt?: Date): Promise<TheStreamEntry>;
  
  /** Add a post to the stream */
  addPost(postId: number, seenAt?: Date): Promise<TheStreamEntry>;
  
  /** Add media to the stream */
  addMedia(mediaId: number, seenAt?: Date): Promise<TheStreamEntry>;
  
  /** Add a bookmark to the stream */
  addBookmark(bookmarkId: number, seenAt?: Date): Promise<TheStreamEntry>;
  
  /** Add a conversation to the stream */
  addConversation(conversationId: number, seenAt?: Date): Promise<TheStreamEntry>;
  
  /** Generic add - for polymorphic use */
  addChunk(type: StreamChunkType, entityId: number, seenAt?: Date): Promise<TheStreamEntry>;
  
  /** Get entries from the stream with filtering */
  query(filters?: StreamQueryFilters): Promise<TheStreamEntry[]>;
  
  /** Get a single entry by ID */
  getById(id: number): Promise<TheStreamEntry | null>;
  
  /** Re-experience: mark as unseen (will reappear at new seenAt) */
  reExperience(id: number, newSeenAt?: Date): Promise<void>;
  
  /** Remove from stream (doesn't delete the underlying entity) */
  remove(id: number): Promise<void>;
  
  /** Get count of entries */
  count(filters?: Pick<StreamQueryFilters, 'chunkTypes' | 'dateFrom' | 'dateTo'>): Promise<number>;
}

export interface StreamQueryFilters {
  dateFrom?: Date;       // filter by seen_at
  dateTo?: Date;
  chunkTypes?: StreamChunkType[]; // filter by type
  limit?: number;
  offset?: number;
  sortBy?: SortBy;
}

// ============================================
// Entity Services
// ============================================

export interface IPostService {
  create(post: AccumulatingPost): Promise<Post>;
  getById(id: number): Promise<Post | null>;
  getAll(filters?: PostServiceFilters): Promise<Post[]>;
  update(id: number, updates: Partial<Post>): Promise<void>;
  delete(id: number): Promise<void>;
  searchByKeyword(keyword: string): Promise<Post[]>;
  getByDateRange(from: Date, to: Date): Promise<Post[]>;
  count(): Promise<number>;
}

export interface IPersonService {
  search(query: string, limit?: number): Promise<Person[]>;
  getById(id: number): Promise<Person | null>;
  getByDid(did: string): Promise<Person | null>;
  create(person: Omit<Person, 'id' | 'createdAt'>): Promise<Person>;
  update(id: number, updates: Partial<Person>): Promise<void>;
  delete(id: number): Promise<void>;
  getAll(limit?: number): Promise<Person[]>;
}

export interface IMediaService {
  getById(id: number): Promise<Media | null>;
  create(media: Omit<Media, 'id' | 'createdAt'>): Promise<Media>;
  update(id: number, updates: Partial<Media>): Promise<void>;
  delete(id: number): Promise<void>;
  /** TODO: implement deduplication by content hash */
  findByContentHash(contentHash: string): Promise<Media | null>;
}

export interface IBookmarkService {
  getById(id: number): Promise<Bookmark | null>;
  getByUrl(url: string): Promise<Bookmark | null>;
  create(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark>;
  update(id: number, updates: Partial<Bookmark>): Promise<void>;
  delete(id: number): Promise<void>;
  searchByKeyword(keyword: string): Promise<Bookmark[]>;
  getAll(limit?: number): Promise<Bookmark[]>;
}

export interface IConversationService {
  getById(id: number): Promise<Conversation | null>;
  create(conversation: Omit<Conversation, 'id' | 'createdAt'>): Promise<Conversation>;
  update(id: number, updates: Partial<Conversation>): Promise<void>;
  delete(id: number): Promise<void>;
  addParticipant(conversationId: number, personId: number, role?: string): Promise<void>;
  removeParticipant(conversationId: number, personId: number): Promise<void>;
  addMedia(conversationId: number, mediaId: number, context?: Record<string, unknown>): Promise<void>;
  removeMedia(conversationId: number, mediaId: number): Promise<void>;
}

// ============================================
// View Service - Lenses on TheStream™
// ============================================

export interface IViewService {
  getAll(): Promise<View[]>;
  getById(id: number): Promise<View | null>;
  /** Create a new view */
  create(config: Omit<Partial<View>, 'id' | 'createdAt'>): Promise<View>;
  update(id: number, updates: Partial<View>): Promise<void>;
  delete(id: number): Promise<void>;
  reorder(indices: number[]): Promise<void>;
  /** Get TheStream™ view (View 0) */
  getThestream(): Promise<View>;
  /** Query TheStream™ through a view's lens */
  queryStream(viewId: number, pagination?: { limit?: number; offset?: number }): Promise<TheStreamEntry[]>;
}

// ============================================
// Session Service - Continuity
// ============================================

export interface ISessionService {
  // Foreground position
  getForegroundPosition(): Promise<number>;
  setForegroundPosition(position: number): Promise<void>;
  
  // Active input tab
  getActiveInput(): Promise<InputType>;
  setActiveInput(input: InputType): Promise<void>;
  
  // Scroll positions (now per-view)
  getViewScrollPosition(viewId: number): Promise<number>;
  setViewScrollPosition(viewId: number, position: number): Promise<void>;
  
  /** @deprecated Use getViewScrollPosition(0) */
  getFeedScrollPosition(): Promise<number>;
  /** @deprecated Use setViewScrollPosition(0, position) */
  setFeedScrollPosition(position: number): Promise<void>;
  
  getLastReadPostId(): Promise<number | null>;
  setLastReadPostId(postId: number | null): Promise<void>;
  
  // Input drafts
  getTextDraft(): Promise<string>;
  setTextDraft(draft: string): Promise<void>;
  
  getLinkDraft(): Promise<string>;
  setLinkDraft(draft: string): Promise<void>;
  
  getPersonDraft(): Promise<{ id: number; displayName: string; avatarUri?: string } | null>;
  setPersonDraft(draft: { id: number; displayName: string; avatarUri?: string } | null): Promise<void>;
  
  clearAllDrafts(): Promise<void>;
}

// ============================================
// Preview Service - Filesystem-based
// ============================================

export interface PreviewMetadata {
  url: string;
  title?: string;
  description?: string;
  imagePath?: string; // relative path to image file
  siteName?: string;
  fetchedAt: Date;
}

export interface IPreviewService {
  /**
   * Get a preview for a URL.
   * Returns cached preview if available and fresh, otherwise fetches new.
   * Multiple concurrent requests for the same URL share the same promise.
   */
  getForURL(url: string): Promise<PreviewMetadata>;
  
  /**
   * Get cached preview without fetching
   */
  getCached(url: string): Promise<PreviewMetadata | null>;
  
  /**
   * Store a preview in the cache
   */
  store(preview: PreviewMetadata): Promise<void>;
  
  /**
   * Delete old previews (cache invalidation)
   */
  deleteOlderThan(maxAgeMs: number): Promise<void>;
  
  /**
   * Get the filesystem path for a preview
   * (file names based on hash of URL)
   */
  getPreviewPath(url: string): { jsonPath: string; imagePath: string };
}

/** @deprecated Use IPreviewService */
export type ILinkPreviewService = IPreviewService;

// ============================================
// Legacy Support
// ============================================

/** @deprecated Use ViewFilters instead */
export type { PostServiceFilters } from './types.js';

/** @deprecated Use PreviewMetadata */
export type CachedPreview = {
  url: string;
  previewType: 'html' | 'media' | 'unknown';
  title?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  siteName?: string;
  mediaType?: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  thumbnailPath?: string;
  mediaUrl?: string;
  fetchedAt: Date;
  error?: string;
};

// ============================================
// Service Aggregate
// ============================================

export interface IPersistenceServices {
  stream: IStreamService;
  post: IPostService;
  view: IViewService;
  session: ISessionService;
  person: IPersonService;
  media: IMediaService;
  bookmark: IBookmarkService;
  conversation: IConversationService;
  preview: IPreviewService;
}
