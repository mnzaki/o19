/**
 * Tauri adaptors extending Drizzle adaptors
 *
 * These adaptors override write methods to use Tauri commands that delegate
 * to the platform-specific implementation (desktop: direct foundframe,
 * Android/iOS: remote service via Binder/IPC).
 *
 * Read operations continue to use Drizzle/LocalStorage as normal.
 */

import { invoke } from '@tauri-apps/api/core';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import {
  DrizzleBookmarkAdaptor,
  DrizzlePostAdaptor,
  DrizzleMediaAdaptor,
  DrizzlePersonAdaptor,
  DrizzleConversationAdaptor,
  DrizzleStreamAdaptor,
  DrizzleViewAdaptor,
} from '@o19/foundframe-drizzle/adaptors';
import type {
  Bookmark,
  CreateBookmark,
  Post,
  CreatePost,
  Media,
  CreateMedia,
  Person,
  CreatePerson,
  Conversation,
  CreateConversation,
  StreamEntry,
  StreamFilters,
  StreamChunkType,
  DatabasePorts
} from '@o19/foundframe-front';

/**
 * Result from stream entry creation commands
 */
export interface StreamEntryResult {
  /** Local database ID (may be null until synced) */
  id?: number;
  /** Timestamp when entry was seen/created */
  seenAt: number;
  /** Reference URL (PKB) for the created entry */
  reference: string;
}

// ============================================================================
// Bookmark Adaptor
// ============================================================================

export class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor {
  async create(data: CreateBookmark): Promise<Bookmark> {
    // Call Tauri command which delegates to platform
    const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_bookmark', {
      url: data.url,
      title: data.title,
      notes: data.notes
    });

    // Return a bookmark object - actual data will be populated via DB events
    // The reference is the PKB URL returned by the backend
    return {
      id: result.id ?? 0,
      url: data.url,
      title: data.title,
      notes: data.notes,
      creationContext: data.creationContext,
      createdAt: new Date(result.seenAt)
    };
  }
}

// ============================================================================
// Post Adaptor
// ============================================================================

export class TauriPostAdaptor extends DrizzlePostAdaptor {
  async create(data: CreatePost): Promise<Post> {
    // Extract text content from bits for the backend
    const content = data.bits
      .filter(bit => bit.type === 'text')
      .map(bit => bit.content)
      .join('');

    // Call Tauri command
    const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_post', {
      content,
      title: undefined // Posts don't have titles in current API
    });

    return {
      id: result.id ?? 0,
      bits: data.bits,
      links: data.links ?? [],
      createdAt: new Date(result.seenAt),
      modifiedAt: undefined
    };
  }
}

// ============================================================================
// Media Adaptor
// ============================================================================

export interface AddMediaLinkParams {
  directory: string;
  subpath?: string;
  url: string;
  title?: string;
  mimeType?: string;
}

export class TauriMediaAdaptor extends DrizzleMediaAdaptor {
  async create(data: CreateMedia): Promise<Media> {
    // For media, we need to determine if it's a link or local file
    if (data.uri.startsWith('http://') || data.uri.startsWith('https://')) {
      // This is a media link - use add_media_link command
      const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_media_link', {
        directory: 'media', // Default directory
        subpath: undefined,
        url: data.uri,
        title: undefined,
        mimeType: data.mimeType
      });

      return {
        id: result.id ?? 0,
        mimeType: data.mimeType,
        uri: data.uri,
        contentHash: data.contentHash,
        width: data.width,
        height: data.height,
        durationMs: data.durationMs,
        metadata: data.metadata,
        createdAt: new Date(result.seenAt)
      };
    }

    // For local media files, we'd need a different command
    // For now, fall back to Drizzle implementation
    return super.create(data);
  }

  /**
   * Add a media link specifically (external URL)
   */
  async addMediaLink(params: AddMediaLinkParams): Promise<Media> {
    const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_media_link', {
      directory: params.directory,
      subpath: params.subpath,
      url: params.url,
      title: params.title,
      mimeType: params.mimeType
    });

    return {
      id: result.id ?? 0,
      mimeType: params.mimeType ?? 'application/octet-stream',
      uri: params.url,
      createdAt: new Date(result.seenAt)
    };
  }
}

// ============================================================================
// Person Adaptor
// ============================================================================

export class TauriPersonAdaptor extends DrizzlePersonAdaptor {
  async create(data: CreatePerson): Promise<Person> {
    const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_person', {
      displayName: data.displayName,
      handle: data.handle
    });

    return {
      id: result.id ?? 0,
      displayName: data.displayName,
      handle: data.handle,
      avatarMediaId: data.avatarMediaId,
      metadata: data.metadata,
      createdAt: new Date(result.seenAt),
      updatedAt: undefined
    };
  }
}

// ============================================================================
// Conversation Adaptor
// ============================================================================

export class TauriConversationAdaptor extends DrizzleConversationAdaptor {
  async create(data: CreateConversation): Promise<Conversation> {
    // Generate a unique conversation ID if not provided
    // In practice, conversations are usually captured from external sources
    // and would have an ID from the source system
    const conversationId = `conv-${Date.now()}`;

    const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_conversation', {
      conversationId,
      title: data.title
    });

    return {
      id: result.id ?? 0,
      title: data.title,
      content: data.content,
      captureTime: data.captureTime,
      firstEntryTime: data.firstEntryTime,
      lastEntryTime: data.lastEntryTime,
      sourceUrl: data.sourceUrl,
      participants: data.participants,
      media: data.media,
      createdAt: new Date(result.seenAt),
      updatedAt: undefined
    };
  }
}

// ============================================================================
// Stream Adaptor
// ============================================================================

/**
 * Parameters for adding a text note
 */
export interface AddTextNoteParams {
  directory: string;
  subpath?: string;
  content: string;
  title?: string;
}

export class TauriStreamAdaptor extends DrizzleStreamAdaptor {
  /**
   * Add a text note to a directory
   */
  async addTextNote(params: AddTextNoteParams): Promise<StreamEntry> {
    const result = await invoke<StreamEntryResult>('plugin:o19-ff|add_text_note', {
      directory: params.directory,
      subpath: params.subpath,
      content: params.content,
      title: params.title
    });

    // Return a minimal stream entry - actual data comes from DB events
    return {
      id: result.id ?? 0,
      seenAt: new Date(result.seenAt),
      chunk: {
        type: 'post', // Text notes are stored as posts
        id: result.id ?? 0,
        entity: {
          id: result.id ?? 0,
          bits: [{ type: 'text', content: params.content }],
          links: [],
          createdAt: new Date(result.seenAt)
        }
      },
      createdAt: new Date(result.seenAt)
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create all Tauri adaptors that extend Drizzle adaptors
 *
 * Write operations (create, add*) use Tauri commands to delegate to
 * the backend platform. Read operations use Drizzle/LocalStorage.
 */
export function createTauriAdaptors(db: BaseSQLiteDatabase<any, any> | any): DatabasePorts {
  const stream = new TauriStreamAdaptor(db);
  const view = new DrizzleViewAdaptor(db, stream);

  return {
    person: new TauriPersonAdaptor(db),
    media: new TauriMediaAdaptor(db),
    post: new TauriPostAdaptor(db),
    bookmark: new TauriBookmarkAdaptor(db),
    conversation: new TauriConversationAdaptor(db),
    stream,
    view,
  };
}
