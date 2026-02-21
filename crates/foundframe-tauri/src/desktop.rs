//! Desktop Platform Implementation
//!
//! On desktop, we initialize foundframe directly and call into it.
//!
//! NOTE: Generated methods are in spire/src/desktop.rs

use crate::platform::{Platform, HasEventBus, HasStream, *};
use crate::{Error, Result};
use o19_foundframe::signal::EventBus;
use o19_foundframe::thestream::TheStream;
use serde::de::DeserializeOwned;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime, plugin::PluginApi};

/// Initialize the desktop platform.
pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> Result<DesktopPlatform<R>> {
  DesktopPlatform::new(app.clone())
}

/// Desktop platform implementation.
///
/// Holds the foundframe runtime and provides direct access to all operations.
pub struct DesktopPlatform<R: Runtime> {
  app_handle: AppHandle<R>,
  events: EventBus,
  stream: TheStream,
  foundframe: std::sync::Mutex<Option<o19_foundframe::Foundframe>>,
}

impl<R: Runtime> DesktopPlatform<R> {
  fn new(app_handle: AppHandle<R>) -> Result<Self> {
    let app_data_dir = app_handle.path().app_data_dir()?;
    let radicle_home = app_data_dir.join(".o19.radicle");

    // Initialize foundframe
    let init_options =
      o19_foundframe::InitOptions::new(&radicle_home, "deardiary").pkb_base(default_pkb_path());

    // Clone for the exit callback
    let exit_handle = app_handle.clone();
    let on_runtime_exit = Some(Box::new(move || {
      tracing::info!("Radicle runtime exited, shutting down via Tauri...");
      exit_handle.exit(0);
    }) as Box<dyn FnOnce() + Send>);

    let foundframe = o19_foundframe::init(init_options, on_runtime_exit)
      .map_err(|e| Error::Other(format!("Failed to initialize foundframe: {e}")))?;

    let events = foundframe.events_clone();

    // Create PKB service
    let pkb = foundframe
      .create_pkb_service()
      .map_err(|e| Error::Other(format!("Failed to create PKB service: {e}")))?;

    // Create TheStream
    let device_pubkey = [0u8; 32]; // TODO: Get from KERI
    let stream = TheStream::with_pubkey(pkb, events.clone(), device_pubkey);
    let _stream_listener = stream.start_listening();

    Ok(Self {
      app_handle,
      events,
      stream,
      foundframe: std::sync::Mutex::new(Some(foundframe)),
    })
  }

  pub fn app_handle(&self) -> &AppHandle<R> {
    &self.app_handle
  }
}

// Implement getter traits for blanket impl support
impl<R: Runtime> HasEventBus for DesktopPlatform<R> {
  fn get_event_bus(&self) -> &EventBus {
    &self.events
  }
}

impl<R: Runtime> HasStream for DesktopPlatform<R> {
  fn get_stream(&self) -> &TheStream {
    &self.stream
  }
}

impl<R: Runtime> Platform for DesktopPlatform<R> {
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
    Ok(NotificationPermissionStatus {
      status: "granted".into(),
    })
  }

  fn shutdown(&self) -> Result<()> {
    // Shutdown foundframe
    if let Some(foundframe) = self.foundframe.lock().unwrap().take() {
      foundframe.shutdown();
    }
    Ok(())
  }

  // ===========================================================================
  // Device Pairing - Custom implementations (not generated)
  // ===========================================================================

  fn generate_pairing_qr(&self, device_name: String) -> Result<PairingQrResponse> {
    use o19_foundframe::device::PairingQrData;
    use o19_foundframe::pkb::radicle::NodeHandle;

    let mut node_handle =
      NodeHandle::new().map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
    let node_id = node_handle
      .local_id()
      .map_err(|e| Error::Other(format!("Failed to get node ID: {e}")))?;

    let qr_data = PairingQrData::new(node_id, device_name);
    let url = qr_data.to_url();

    let node_id_hex = url.split('/').last().unwrap_or("").to_string();
    let emoji_identity = url
      .split("emoji=")
      .nth(1)
      .unwrap_or("")
      .split('&')
      .next()
      .unwrap_or("")
      .to_string();

    Ok(PairingQrResponse {
      url,
      emoji_identity,
      node_id_hex,
    })
  }

  fn parse_pairing_url(&self, url: String) -> Result<ScannedPairingData> {
    use o19_foundframe::device::PairingUrl;

    let parsed = PairingUrl::parse(&url)?;

    Ok(ScannedPairingData {
      emoji_identity: parsed.emoji_identity,
      device_name: parsed.device_name,
      node_id_hex: parsed.node_id,
      node_id: parsed.node_id_parsed.to_string(),
    })
  }

  fn check_followers_and_pair(&self) -> Result<Vec<PairedDeviceInfo>> {
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::NodeHandle;

    let node_handle =
      NodeHandle::new().map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
    let device_manager = DeviceManager::new(node_handle);

    let followers = device_manager
      .list_followers()
      .map_err(|e| Error::Other(format!("Failed to list followers: {e}")))?;

    let mut newly_paired = Vec::new();

    for follower in followers {
      let alias = format!(
        "Device {}",
        &follower.node_id[..8.min(follower.node_id.len())]
      );

      match device_manager.follow_device(&follower.node_id) {
        Ok(_) => {
          newly_paired.push(PairedDeviceInfo {
            node_id: follower.node_id,
            alias,
            paired: true,
          });
        }
        Err(e) => {
          tracing::warn!("Failed to auto-follow {}: {}", follower.node_id, e);
        }
      }
    }

    Ok(newly_paired)
  }

  // ===========================================================================
  // Camera Operations - Platform-specific (not generated)
  // ===========================================================================

  fn start_camera(&self, _mode: String, _camera_direction: String) -> Result<serde_json::Value> {
    // Desktop doesn't have camera support via Platform trait
    Err(Error::Other("Camera not supported on desktop".into()))
  }

  fn stop_camera(&self) -> Result<serde_json::Value> {
    Err(Error::Other("Camera not supported on desktop".into()))
  }

  fn capture_photo(&self) -> Result<serde_json::Value> {
    Err(Error::Other("Camera not supported on desktop".into()))
  }

  fn set_camera_mode(&self, _mode: String, _camera_direction: String) -> Result<serde_json::Value> {
    Err(Error::Other("Camera not supported on desktop".into()))
  }

  fn is_camera_active(&self) -> Result<serde_json::Value> {
    Ok(serde_json::json!({ "active": false }))
  }

  fn request_camera_permissions(&self) -> Result<serde_json::Value> {
    Ok(serde_json::json!({ "granted": true }))
  }

  fn check_camera_permissions(&self) -> Result<serde_json::Value> {
    Ok(serde_json::json!({ "granted": true }))
  }
}

fn default_pkb_path() -> PathBuf {
  PathBuf::from("pkb")
}
