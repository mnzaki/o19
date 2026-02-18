//! iOS Platform Implementation (Stub)
//!
//! iOS is not currently implemented. All operations return errors.

use crate::platform::*;
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
///
/// Currently returns errors for all operations.
/// Could be implemented similar to Android with a remote service,
/// or use local foundframe like desktop.
pub struct IosPlatform<R: Runtime> {
  app_handle: AppHandle<R>,
  events: EventBus,
  // We still need a stream for the trait, but it won't work
  stream: TheStream,
}

impl<R: Runtime> IosPlatform<R> {
  fn new(app_handle: AppHandle<R>) -> Result<Self> {
    // Create stub event bus and stream
    let events = EventBus::new();

    // This will fail because we can't create a PKB service without a node
    // For now we use a placeholder that will error when used
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

impl<R: Runtime> Platform for IosPlatform<R> {
  fn event_bus(&self) -> &EventBus {
    &self.events
  }

  fn stream(&self) -> &TheStream {
    &self.stream
  }

  fn exit(&self, code: i32) {
    self.app_handle.exit(code);
  }

  fn request_permissions(&self) -> Result<NotificationPermissionStatus> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  fn generate_pairing_qr(&self, _device_name: String) -> Result<PairingQrResponse> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  fn parse_pairing_url(&self, _url: String) -> Result<ScannedPairingData> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  fn confirm_pairing(&self, _node_id_hex: String, _alias: String) -> Result<PairedDeviceInfo> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  fn list_paired_devices(&self) -> Result<Vec<PairedDeviceInfo>> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  fn check_followers_and_pair(&self) -> Result<Vec<PairedDeviceInfo>> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  fn unpair_device(&self, _node_id_hex: String) -> Result<()> {
    Err(Error::Other(
      "iOS platform not implemented".into(),
    ))
  }

  // ===========================================================================
  // Write Operations - Not implemented on iOS
  // ===========================================================================

  fn add_post(&self, _content: String, _title: Option<String>) -> Result<StreamEntryResult> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn add_bookmark(
    &self,
    _url: String,
    _title: Option<String>,
    _notes: Option<String>,
  ) -> Result<StreamEntryResult> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn add_media_link(
    &self,
    _directory: String,
    _url: String,
    _title: Option<String>,
    _mime_type: Option<String>,
    _subpath: Option<String>,
  ) -> Result<StreamEntryResult> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn add_person(
    &self,
    _display_name: String,
    _handle: Option<String>,
  ) -> Result<StreamEntryResult> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn add_conversation(
    &self,
    _conversation_id: String,
    _title: Option<String>,
  ) -> Result<StreamEntryResult> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn add_text_note(
    &self,
    _directory: String,
    _content: String,
    _title: Option<String>,
    _subpath: Option<String>,
  ) -> Result<StreamEntryResult> {
    Err(Error::Other("iOS platform not implemented".into()))
  }

  fn shutdown(&self) -> Result<()> {
    Ok(())
  }
}

/// Create a stub stream that returns errors for all operations.
fn create_unimplemented_stream(events: EventBus) -> Result<TheStream> {
  // This is a hack - we create a minimal PKB service that will error
  // when actually used. The stream exists but doesn't work.
  use o19_foundframe::device::DeviceManager;
  use o19_foundframe::pkb::PkbService;
  use o19_foundframe::radicle::NodeHandle;

  // Try to create handles - this will fail on iOS without a node
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
