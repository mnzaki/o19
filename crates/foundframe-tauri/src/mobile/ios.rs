//! iOS Platform Implementation (Stub)
//!
//! iOS is not currently implemented. All operations return errors.
//!
//! NOTE: Generated stub is in spire/src/mobile/ios.rs

use crate::platform::{Platform, HasEventBus, HasStream, *};
use crate::{Error, Result};
use o19_foundframe::signal::EventBus;
use o19_foundframe::thestream::TheStream;
use serde::de::DeserializeOwned;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime, plugin::PluginApi};

/// Initialize the iOS platform.
pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> Result<IosPlatform<R>> {
  IosPlatform::new(app.clone())
}

/// iOS platform implementation (stub).
pub struct IosPlatform<R: Runtime> {
  app_handle: AppHandle<R>,
  events: EventBus,
  stream: TheStream,
}

impl<R: Runtime> IosPlatform<R> {
  fn new(app_handle: AppHandle<R>) -> Result<Self> {
    // Create stub event bus and stream
    let events = EventBus::new();
    let stream = create_unimplemented_stream(events.clone())?;

    Ok(Self {
      app_handle,
      events,
      stream,
    })
  }

  pub fn app_handle(&self) -> &AppHandle<R> {
    &self.app_handle
  }
}

// Implement getter traits for blanket impl support
impl<R: Runtime> HasEventBus for IosPlatform<R> {
  fn get_event_bus(&self) -> &EventBus {
    &self.events
  }
}

impl<R: Runtime> HasStream for IosPlatform<R> {
  fn get_stream(&self) -> &TheStream {
    &self.stream
  }
}

impl<R: Runtime> Platform for IosPlatform<R> {
  fn event_bus(&self) -> &EventBus {
    // Delegate to HasEventBus blanket impl pattern
    <Self as HasEventBus>::get_event_bus(self)
  }

  fn stream(&self) -> &TheStream {
    // Delegate to HasStream blanket impl pattern
    <Self as HasStream>::get_stream(self)
  }

  fn exit(&self, code: i32) {
    self.app_handle.exit(code);
  }

  fn request_permissions(&self) -> Result<NotificationPermissionStatus> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn shutdown(&self) -> Result<()> {
    Ok(())
  }

  // ===========================================================================
  // Device Pairing - Not implemented on iOS
  // ===========================================================================

  fn generate_pairing_qr(&self, _device_name: String) -> Result<PairingQrResponse> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn parse_pairing_url(&self, _url: String) -> Result<ScannedPairingData> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn check_followers_and_pair(&self) -> Result<Vec<PairedDeviceInfo>> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  // ===========================================================================
  // Camera Operations - Not implemented on iOS
  // ===========================================================================

  fn start_camera(&self, _mode: String, _camera_direction: String) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn stop_camera(&self) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn capture_photo(&self) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn set_camera_mode(&self, _mode: String, _camera_direction: String) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn is_camera_active(&self) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn request_camera_permissions(&self) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn check_camera_permissions(&self) -> Result<serde_json::Value> {
    Err(Error::Other("iOS platform not implemented".into()))
  }
}

/// Create a stub stream that returns errors for all operations.
fn create_unimplemented_stream(events: EventBus) -> Result<TheStream> {
  use o19_foundframe::device::DeviceManager;
  use o19_foundframe::pkb::PkbService;
  use o19_foundframe::radicle::NodeHandle;

  let node_handle =
    NodeHandle::new().map_err(|e| Error::Other(format!("iOS not implemented: {e}")))?;
  let device_manager = DeviceManager::new(node_handle);

  let node_handle =
    NodeHandle::new().map_err(|e| Error::Other(format!("iOS not implemented: {e}")))?;

  let pkb = PkbService::with_event_bus(
    &PathBuf::from("/dev/null"),
    node_handle,
    device_manager,
    events.clone(),
  )
  .map_err(|e| Error::Other(format!("iOS not implemented: {e}")))?;

  let device_pubkey = [0u8; 32];
  Ok(TheStream::with_pubkey(pkb, events, device_pubkey))
}
