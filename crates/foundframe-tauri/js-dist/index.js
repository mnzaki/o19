import { invoke } from '@tauri-apps/api/core';
import { PreviewAdaptor, createServices as createServices$1 } from '@o19/foundframe-front';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '@o19/foundframe-drizzle/schema';
import { DrizzleViewAdaptor, DrizzleBookmarkAdaptor, DrizzlePostAdaptor, DrizzleMediaAdaptor, DrizzlePersonAdaptor, DrizzleConversationAdaptor, DrizzleStreamAdaptor } from '@o19/foundframe-drizzle/adaptors';
import { DeviceAdaptor } from '@o19/foundframe-front/ports';

// FIXME add dbname to run_sql
function createDrizzleProxy(dbName) {
    try {
        const db = drizzle(async (sql, params, method) => {
            try {
                const rows = await invoke('plugin:o19-foundframe-tauri|run_sql', {
                    query: { sql, params }
                });
                if (rows.length === 0 && method === 'get') {
                    /**
                     * 🛠 Workaround for Drizzle ORM SQLite Proxy `.get()` bug
                     *
                     * `.get()` with no results throws due to Drizzle trying to destructure `undefined`.
                     * See: https://github.com/drizzle-team/drizzle-orm/issues/4113
                     *
                     * Until fixed upstream, we return `{}` when rows are empty to avoid crashes.
                     */
                    return {};
                }
                return method === 'get' ? { rows: rows[0].values } : { rows: rows.map((r) => r.values) };
            }
            catch (e) {
                console.error('Error from sqlite proxy server: ', e);
                return { rows: [] };
            }
        }, {
            schema,
            logger: true
        });
        if (!db) {
            throw new Error('Drizzle proxy not created');
        }
        console.log('created db', db);
        return db;
    }
    catch (err) {
        console.error('Failed to create drizzle proxy', err);
        throw err;
    }
}

/**
 * Tauri Device Adaptor
 *
 * Implements DevicePort by invoking Tauri commands.
 * Delegates to the Platform implementation (local on desktop, service on Android).
 */
class TauriDeviceAdaptor extends DeviceAdaptor {
    async generatePairingQr(deviceName) {
        const result = await invoke('plugin:o19-foundframe-tauri|generate_pairing_qr', {
            deviceName
        });
        // Convert snake_case to camelCase
        return {
            url: result.url,
            emojiIdentity: result.emoji_identity,
            nodeIdHex: result.node_id_hex
        };
    }
    async parsePairingUrl(url) {
        const result = await invoke('plugin:o19-foundframe-tauri|parse_pairing_url', {
            url
        });
        return {
            emojiIdentity: result.emojiIdentity,
            deviceName: result.deviceName,
            nodeIdHex: result.nodeIdHex,
            nodeId: result.nodeId
        };
    }
    async confirmPairing(nodeIdHex, alias) {
        const result = await invoke('plugin:o19-foundframe-tauri|confirm_pairing', {
            nodeIdHex,
            alias
        });
        return {
            nodeId: result.nodeId,
            alias: result.alias,
            paired: result.paired
        };
    }
    async listPairedDevices() {
        const results = await invoke('plugin:o19-foundframe-tauri|list_paired_devices');
        return results.map(r => ({
            nodeId: r.nodeId,
            alias: r.alias,
            paired: r.paired
        }));
    }
    async checkFollowersAndPair() {
        const results = await invoke('plugin:o19-foundframe-tauri|check_followers_and_pair');
        return results.map(r => ({
            nodeId: r.nodeId,
            alias: r.alias,
            paired: r.paired
        }));
    }
    async unpairDevice(nodeIdHex) {
        await invoke('plugin:o19-foundframe-tauri|unpair_device', {
            nodeIdHex
        });
    }
}

/**
 * Tauri adaptors extending Drizzle adaptors
 *
 * These adaptors override write methods to use Tauri commands that delegate
 * to the platform-specific implementation (desktop: direct foundframe,
 * Android/iOS: remote service via Binder/IPC).
 *
 * Read operations continue to use Drizzle/LocalStorage as normal.
 */
// ============================================================================
// Bookmark Adaptor
// ============================================================================
class TauriBookmarkAdaptor extends DrizzleBookmarkAdaptor {
    async create(data) {
        // Call Tauri command which delegates to platform
        const result = await invoke('plugin:o19-foundframe-tauri|add_bookmark', {
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
class TauriPostAdaptor extends DrizzlePostAdaptor {
    async create(data) {
        // Extract text content from bits for the backend
        const content = data.bits
            .filter(bit => bit.type === 'text')
            .map(bit => bit.content)
            .join('');
        // Call Tauri command
        const result = await invoke('plugin:o19-foundframe-tauri|add_post', {
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
class TauriMediaAdaptor extends DrizzleMediaAdaptor {
    async create(data) {
        // For media, we need to determine if it's a link or local file
        if (data.uri.startsWith('http://') || data.uri.startsWith('https://')) {
            // This is a media link - use add_media_link command
            const result = await invoke('plugin:o19-foundframe-tauri|add_media_link', {
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
    async addMediaLink(params) {
        const result = await invoke('plugin:o19-foundframe-tauri|add_media_link', {
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
class TauriPersonAdaptor extends DrizzlePersonAdaptor {
    async create(data) {
        const result = await invoke('plugin:o19-foundframe-tauri|add_person', {
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
class TauriConversationAdaptor extends DrizzleConversationAdaptor {
    async create(data) {
        // Generate a unique conversation ID if not provided
        // In practice, conversations are usually captured from external sources
        // and would have an ID from the source system
        const conversationId = `conv-${Date.now()}`;
        const result = await invoke('plugin:o19-foundframe-tauri|add_conversation', {
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
class TauriStreamAdaptor extends DrizzleStreamAdaptor {
    /**
     * Add a text note to a directory
     */
    async addTextNote(params) {
        const result = await invoke('plugin:o19-foundframe-tauri|add_text_note', {
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
function createTauriAdaptors(db) {
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
        device: new TauriDeviceAdaptor(),
    };
}

/**
 * Tauri Preview adaptor
 * Uses existing url_preview_json command from Rust backend
 */
class TauriPreviewAdaptor extends PreviewAdaptor {
    async getForURL(url) {
        const result = await invoke('plugin:o19-foundframe-tauri|url_preview_json', { url });
        // Convert PreviewType to PreviewMetadata
        if (result.type === 'html') {
            return {
                url,
                title: result.title,
                description: result.description,
                imagePath: result.imageUrl,
                siteName: result.siteName,
                fetchedAt: new Date(),
            };
        }
        else if (result.type === 'media') {
            return {
                url,
                title: result.metadata.title || result.url,
                description: result.metadata.description,
                imagePath: result.thumbnailPath,
                siteName: undefined,
                fetchedAt: new Date(),
            };
        }
        else {
            // Unknown type - return minimal metadata
            return {
                url,
                fetchedAt: new Date(),
            };
        }
    }
    async getCached(url) {
        // The Rust backend doesn't have a separate cache check command,
        // so we just call getForURL which handles caching internally
        try {
            return await this.getForURL(url);
        }
        catch {
            return null;
        }
    }
    async store(_preview) {
        // The Rust backend handles caching automatically in url_preview_json
        // No explicit store command needed
    }
    async deleteOlderThan(_maxAgeMs) {
        // The Rust backend handles cache expiration automatically
        // No explicit cleanup command needed
    }
}

function createServices(dbName = "database.db") {
    const db = createDrizzleProxy();
    const adaptors = createTauriAdaptors(db);
    return createServices$1({
        ...adaptors,
        preview: new TauriPreviewAdaptor(),
    });
}
async function convertJpegToWebp(jpeg) {
    const bytes = await invoke('plugin:o19-foundframe-tauri|convert_jpeg_to_webp', {
        payload: { jpeg }
    });
    return Uint8Array.from(bytes);
}
async function compressWebpToSize(webp, maxSize) {
    const bytes = await invoke('plugin:o19-foundframe-tauri|compress_webp_to_size', {
        payload: { webp, maxSize }
    });
    return Uint8Array.from(bytes);
}
async function requestPermissions() {
    return await invoke('plugin:o19-foundframe-tauri|request_permissions');
}
async function generatePairingQr(deviceName) {
    return await invoke('plugin:o19-foundframe-tauri|generate_pairing_qr', { deviceName });
}
async function parsePairingUrl(url) {
    return await invoke('plugin:o19-foundframe-tauri|parse_pairing_url', { url });
}
async function confirmPairing(nodeIdHex, alias) {
    return await invoke('plugin:o19-foundframe-tauri|confirm_pairing', { nodeIdHex, alias });
}
async function listPairedDevices() {
    return await invoke('plugin:o19-foundframe-tauri|list_paired_devices');
}
async function checkFollowersAndPair() {
    return await invoke('plugin:o19-foundframe-tauri|check_followers_and_pair');
}
async function unpairDevice(nodeIdHex) {
    return await invoke('plugin:o19-foundframe-tauri|unpair_device', { nodeIdHex });
}
/**
 * Start the camera with specified mode.
 * - 'preview': Just show camera preview
 * - 'qr': Scan for QR codes (emits 'qr-scanned' event when found)
 * - 'photo': Enable photo capture mode
 */
async function startCamera(options = {}) {
    return await invoke('plugin:o19-foundframe-tauri|start_camera', {
        options: {
            mode: options.mode || 'preview',
            cameraDirection: options.cameraDirection || 'back'
        }
    });
}
/**
 * Stop the camera and release resources.
 */
async function stopCamera() {
    return await invoke('plugin:o19-foundframe-tauri|stop_camera');
}
/**
 * Capture a photo (only works when mode is 'photo').
 * Photo is saved to device gallery natively without passing through JS.
 */
async function capturePhoto() {
    return await invoke('plugin:o19-foundframe-tauri|capture_photo');
}
/**
 * Change camera mode without stopping/starting.
 */
async function setCameraMode(options) {
    return await invoke('plugin:o19-foundframe-tauri|set_camera_mode', {
        options: {
            mode: options.mode || 'preview',
            cameraDirection: options.cameraDirection || 'back'
        }
    });
}
/**
 * Check if camera is currently active.
 */
async function isCameraActive() {
    return await invoke('plugin:o19-foundframe-tauri|is_camera_active');
}
/**
 * Request camera permissions.
 */
async function requestCameraPermissions() {
    return await invoke('plugin:o19-foundframe-tauri|request_camera_permissions');
}
/**
 * Check camera permission status.
 */
async function checkCameraPermissions() {
    return await invoke('plugin:o19-foundframe-tauri|check_camera_permissions');
}
/**
 * Listen for QR code scan events.
 * Use with Tauri's `listen` function:
 *
 * ```typescript
 * import { listen } from '@tauri-apps/api/event';
 *
 * listen('qr-scanned', (event) => {
 *   console.log('QR Code:', event.payload.content);
 * });
 * ```
 */
const QR_SCANNED_EVENT = 'qr-scanned';
/**
 * Listen for photo capture events.
 *
 * ```typescript
 * import { listen } from '@tauri-apps/api/event';
 *
 * listen('photo-captured', (event) => {
 *   console.log('Photo saved:', event.payload.uri);
 * });
 * ```
 */
const PHOTO_CAPTURED_EVENT = 'photo-captured';

export { PHOTO_CAPTURED_EVENT, QR_SCANNED_EVENT, TauriBookmarkAdaptor, TauriConversationAdaptor, TauriDeviceAdaptor, TauriMediaAdaptor, TauriPersonAdaptor, TauriPostAdaptor, TauriStreamAdaptor, capturePhoto, checkCameraPermissions, checkFollowersAndPair, compressWebpToSize, confirmPairing, convertJpegToWebp, createServices, createTauriAdaptors, generatePairingQr, isCameraActive, listPairedDevices, parsePairingUrl, requestCameraPermissions, requestPermissions, setCameraMode, startCamera, stopCamera, unpairDevice };
//# sourceMappingURL=index.js.map
