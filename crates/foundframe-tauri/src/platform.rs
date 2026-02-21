//! Platform abstraction trait
//!
//! All foundframe operations go through the Platform trait.
//! - Desktop: Direct foundframe calls
//! - Android: Binder IPC to RemoteFoundframe service
//! - iOS: Not implemented (returns errors)
//!
//! NOTE: Generated methods are in spire/src/platform.rs

use crate::Result;
pub use crate::models::*;
use o19_foundframe::signal::EventBus;
use o19_foundframe::thestream::TheStream;

// ============================================================================
// Platform Trait
// ============================================================================

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

  /// Called when the app is shutting down.
  /// Desktop: shutdown foundframe. Mobile: no-op (service handles it).
  fn shutdown(&self) -> Result<()>;

  // ===========================================================================
  // Device Pairing Operations - Custom implementations (not generated)
  // ===========================================================================

  /// Generate pairing QR code data.
  fn generate_pairing_qr(&self, device_name: String) -> Result<PairingQrResponse>;

  /// Parse a scanned pairing URL.
  fn parse_pairing_url(&self, url: String) -> Result<ScannedPairingData>;

  /// Check for followers and auto-follow back.
  fn check_followers_and_pair(&self) -> Result<Vec<PairedDeviceInfo>>;

  // ===========================================================================
  // Camera Operations - Platform-specific (not generated)
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

// ============================================================================
// Getter Traits with Blanket Implementations
//
// These traits allow Platform methods to be implemented via blanket impls.
// Pattern: If a type has an 'events' field, impl HasEventsBus for it,
//          and it automatically gets event_bus() via the blanket impl below.
// ============================================================================

/// Types that have an `events: EventBus` field can implement this trait
/// to get `Platform::event_bus()` for free via the blanket impl.
pub trait HasEventBus {
  fn get_event_bus(&self) -> &EventBus;
}

/// Types that have a `stream: TheStream` field can implement this trait
/// to get `Platform::stream()` for free via the blanket impl.
pub trait HasStream {
  fn get_stream(&self) -> &TheStream;
}

// Blanket impl: any type that implements HasEventBus automatically
// provides Platform::event_bus() when implementing Platform.
// 
// Usage in platform implementations:
//   impl HasEventBus for DesktopPlatform {
//     fn get_event_bus(&self) -> &EventBus { &self.events }
//   }
//   
//   impl Platform for DesktopPlatform {
//     // event_bus() is provided by this blanket impl
//     fn event_bus(&self) -> &EventBus { <Self as HasEventBus>::get_event_bus(self) }
//     // ... implement other methods
//   }
//
// NOTE: The blanket impl is on Platform for types that implement HasEventBus,
// but Rust doesn't allow conflicting impls. So instead, we use the trait
// methods directly in platform implementations.

/// Extension trait for types that have an event bus.
/// Provides convenient access without importing HasEventBus everywhere.
pub trait EventBusExt: HasEventBus {
  /// Get the event bus (shorthand for get_event_bus)
  fn events(&self) -> &EventBus {
    self.get_event_bus()
  }
}

impl<T: HasEventBus> EventBusExt for T {}

/// Extension trait for types that have a stream.
pub trait StreamExt: HasStream {
  /// Get the stream (shorthand for get_stream)
  fn stream_ref(&self) -> &TheStream {
    self.get_stream()
  }
}

impl<T: HasStream> StreamExt for T {}
