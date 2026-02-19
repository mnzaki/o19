/**
 * Tauri adaptors extending Drizzle adaptors
 *
 * These adaptors override write methods to use Tauri commands that delegate
 * to the platform-specific implementation (desktop: direct foundframe,
 * Android/iOS: remote service via Binder/IPC).
 *
 * Read operations continue to use Drizzle/LocalStorage as normal.
 */
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { DrizzleBookmarkAdaptor, DrizzlePostAdaptor, DrizzleMediaAdaptor, DrizzlePersonAdaptor, DrizzleConversationAdaptor, DrizzleStreamAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { Bookmark, CreateBookmark, Post, CreatePost, Media, CreateMedia, Person, CreatePerson, Conversation, CreateConversation, StreamEntry, DatabasePorts } from '@o19/foundframe-front';
export { TauriDeviceAdaptor } from './device.adaptor.js';
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
export declare class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor {
    create(data: CreateBookmark): Promise<Bookmark>;
}
export declare class TauriPostAdaptor extends DrizzlePostAdaptor {
    create(data: CreatePost): Promise<Post>;
}
export interface AddMediaLinkParams {
    directory: string;
    subpath?: string;
    url: string;
    title?: string;
    mimeType?: string;
}
export declare class TauriMediaAdaptor extends DrizzleMediaAdaptor {
    create(data: CreateMedia): Promise<Media>;
    /**
     * Add a media link specifically (external URL)
     */
    addMediaLink(params: AddMediaLinkParams): Promise<Media>;
}
export declare class TauriPersonAdaptor extends DrizzlePersonAdaptor {
    create(data: CreatePerson): Promise<Person>;
}
export declare class TauriConversationAdaptor extends DrizzleConversationAdaptor {
    create(data: CreateConversation): Promise<Conversation>;
}
/**
 * Parameters for adding a text note
 */
export interface AddTextNoteParams {
    directory: string;
    subpath?: string;
    content: string;
    title?: string;
}
export declare class TauriStreamAdaptor extends DrizzleStreamAdaptor {
    /**
     * Add a text note to a directory
     */
    addTextNote(params: AddTextNoteParams): Promise<StreamEntry>;
}
/**
 * Create all Tauri adaptors that extend Drizzle adaptors
 *
 * Write operations (create, add*) use Tauri commands to delegate to
 * the backend platform. Read operations use Drizzle/LocalStorage.
 */
export declare function createTauriAdaptors(db: BaseSQLiteDatabase<any, any> | any): DatabasePorts;
//# sourceMappingURL=index.d.ts.map