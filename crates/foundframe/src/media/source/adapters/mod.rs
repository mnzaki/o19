//! Source Adapters
//!
//! Concrete implementations of the `SourceAdapter` trait.
//! Each adapter handles a specific source type (local filesystem, webhooks, RSS, etc.).

pub mod local_dir;

pub use local_dir::{LocalDirAdapter, LocalDirConfig, LocalDirCursor};

/* TODO: WebhookAdapter for HTTP push sources
 * 
 * This would:
 * - Setup an HTTP endpoint (e.g., /webhooks/media/:id)
 * - Validate incoming requests (HMAC signature)
 * - Parse webhook payload (various formats: JSON, multipart)
 * - Transform to MediaItems
 * - Call the registered callback
 * 
 * SPIRAL: Requires platform-specific HTTP server setup
 * - Tauri: Axum/Tide server or use Tauri's HTTP API
 * - Android: FCM or local HTTP server
 * - iOS: PushKit or local server
 */

/* TODO: RssAdapter for RSS/Atom feeds
 * 
 * This would:
 * - Poll RSS feeds
 * - Parse XML (atom, rss2, etc.)
 * - Extract media enclosures
 * - Handle pagination (if supported)
 * - Respect ttl/cache headers
 */

/* TODO: S3Adapter for S3-compatible storage
 * 
 * This would:
 * - List objects with pagination
 * - Support S3 event notifications (push)
 * - Handle multipart uploads for large files
 */
