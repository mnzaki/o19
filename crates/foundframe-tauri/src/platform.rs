//! Platform abstraction trait
//!
//! All foundframe operations go through the Platform trait.
//! - Desktop: Direct foundframe calls
//! - Android: Binder IPC to RemoteFoundframe service
//! - iOS: Not implemented (returns errors)

pub use crate::models::*;
use crate::Result;
use o19_foundframe::signal::EventBus;
use o19_foundframe::thestream::TheStream;

/// Platform trait abstracts all foundframe operations.
///
/// This allows the tauri-plugin to work on different platforms:
/// - Desktop: Direct foundframe integration
/// - Android: Binder IPC to singleton service
/// - iOS: Not implemented (stub)
pub trait Platform: Send + Sync {
  /// Get the event bus for this platform.
  fn event_bus(&self) -> &EventBus;

  /// Get TheStream instance for adding content.
  fn stream(&self) -> &TheStream;

  /// Exit the application cleanly.
  fn exit(&self, code: i32);

  /// Request permissions (notifications, etc).
  fn request_permissions(&self) -> Result<NotificationPermissionStatus>;

  // ===========================================================================
  // Write Operations - Content Creation
  // ===========================================================================

  /// Add a post to the stream.
  fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult>;

  /// Add a bookmark to the stream.
  fn add_bookmark(
    &self,
    url: String,
    title: Option<String>,
    notes: Option<String>,
  ) -> Result<StreamEntryResult>;

  /// Add a media link to the stream.
  fn add_media_link(
    &self,
    directory: String,
    url: String,
    title: Option<String>,
    mime_type: Option<String>,
    subpath: Option<String>,
  ) -> Result<StreamEntryResult>;

  /// Add a person to the stream.
  fn add_person(
    &self,
    display_name: String,
    handle: Option<String>,
  ) -> Result<StreamEntryResult>;

  /// Add a conversation to the stream.
  fn add_conversation(
    &self,
    conversation_id: String,
    title: Option<String>,
  ) -> Result<StreamEntryResult>;

  /// Add a text note to a specific directory.
  fn add_text_note(
    &self,
    directory: String,
    content: String,
    title: Option<String>,
    subpath: Option<String>,
  ) -> Result<StreamEntryResult>;

  // ===========================================================================
  // Device Pairing Operations
  // ===========================================================================

  /// Generate pairing QR code data.
  fn generate_pairing_qr(&self, device_name: String) -> Result<PairingQrResponse>;

  /// Parse a scanned pairing URL.
  fn parse_pairing_url(&self, url: String) -> Result<ScannedPairingData>;

  /// Confirm pairing with a device.
  fn confirm_pairing(&self, node_id_hex: String, alias: String) -> Result<PairedDeviceInfo>;

  /// List all paired devices.
  fn list_paired_devices(&self) -> Result<Vec<PairedDeviceInfo>>;

  /// Check for followers and auto-follow back.
  fn check_followers_and_pair(&self) -> Result<Vec<PairedDeviceInfo>>;

  /// Unpair a device.
  fn unpair_device(&self, node_id_hex: String) -> Result<()>;

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /// Called when the app is shutting down.
  /// Desktop: shutdown foundframe. Mobile: no-op (service handles it).
  fn shutdown(&self) -> Result<()>;

  // ===========================================================================
  // Camera Operations
  // ===========================================================================

  /// Start the camera with specified mode.
  fn start_camera(&self, mode: String, camera_direction: String) -> Result<serde_json::Value>;

  /// Stop the camera.
  fn stop_camera(&self) -> Result<serde_json::Value>;

  /// Capture a photo (when in photo mode).
  fn capture_photo(&self) -> Result<serde_json::Value>;

  /// Set camera mode.
  fn set_camera_mode(&self, mode: String, camera_direction: String) -> Result<serde_json::Value>;

  /// Check if camera is active.
  fn is_camera_active(&self) -> Result<serde_json::Value>;

  /// Request camera permissions.
  fn request_camera_permissions(&self) -> Result<serde_json::Value>;

  /// Check camera permissions.
  fn check_camera_permissions(&self) -> Result<serde_json::Value>;
}
