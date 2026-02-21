//! Android Platform Implementation
//!
//! Uses Binder IPC to communicate with the FoundframeRadicle service.
//! This implementation has NO dependency on foundframe - it delegates
//! all operations to the remote singleton service.
//!
//! NOTE: Generated methods are in spire/src/mobile/android.rs

use crate::platform::{Platform, HasEventBus, *};
use crate::{Error, Result};
use o19_foundframe::signal::EventBus;
use o19_foundframe_android::aidl_client::Client as ServiceClient;
use serde::de::DeserializeOwned;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime, plugin::PluginApi};

/// Initialize the Android platform.
pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
  plugin_handle: tauri::plugin::PluginHandle<R>,
) -> Result<AndroidPlatform<R>> {
  AndroidPlatform::new(app.clone(), plugin_handle)
}

/// Android platform implementation.
///
/// Connects to the FoundframeRadicle service via Binder IPC.
/// All operations are delegated to the remote service - no local foundframe code.
pub struct AndroidPlatform<R: Runtime> {
  app_handle: AppHandle<R>,
  events: EventBus,
  service_client: Mutex<ServiceClient>,
  plugin_handle: tauri::plugin::PluginHandle<R>,
}

impl<R: Runtime> AndroidPlatform<R> {
  fn new(app_handle: AppHandle<R>, plugin_handle: tauri::plugin::PluginHandle<R>) -> Result<Self> {
    // Connect to the service
    let mut service_client = ServiceClient::new();
    let connection_result = service_client.connect();

    match &connection_result {
      Ok(()) => {
        tracing::info!("Connected to FoundframeRadicle service successfully");
        // Emit success event to UI
        let _ = app_handle.emit("foundframe:service-connected", ());
      }
      Err(e) => {
        tracing::error!(
          "FATAL: Failed to connect to FoundframeRadicle service: {}",
          e
        );
        // Emit fatal error event to UI
        match app_handle.emit("foundframe:fatal-error", serde_json::json!({
          "error": "Service not connected",
          "message": "The FoundframeRadicle background service is not running. Please restart the app.",
          "details": format!("{}", e),
          "recoverable": false
        })) {
          Ok(_) => tracing::info!("Fatal error event emitted successfully"),
          Err(emit_err) => tracing::error!("Failed to emit fatal error event: {}", emit_err),
        }
      }
    }

    // Create local event bus for receiving events from service
    let events = EventBus::new();

    Ok(Self {
      app_handle,
      events,
      service_client: Mutex::new(service_client),
      plugin_handle,
    })
  }

  pub fn app_handle(&self) -> &AppHandle<R> {
    &self.app_handle
  }

  /// Get the service client (helper)
  fn with_client<T>(
    &self,
    f: impl FnOnce(&ServiceClient) -> android::aidl_client::ServiceResult<T>,
  ) -> Result<T> {
    let client = self.service_client.lock().unwrap();
    if !client.is_connected() {
      tracing::error!("[AndroidPlatform] Service operation attempted but service not connected");
      // Emit event to UI so user knows service is down
      let _ = self.app_handle.emit("foundframe:service-disconnected", ());
      return Err(Error::Other(
        "Service not connected. The background service may have crashed. Please restart the app."
          .into(),
      ));
    }
    match f(&client) {
      Ok(result) => Ok(result),
      Err(e) => {
        tracing::error!("[AndroidPlatform] Service operation failed: {}", e);
        Err(Error::Other(format!("Service error: {}", e)))
      }
    }
  }
}

// Implement getter trait for blanket impl support
impl<R: Runtime> HasEventBus for AndroidPlatform<R> {
  fn get_event_bus(&self) -> &EventBus {
    &self.events
  }
}

impl<R: Runtime> Platform for AndroidPlatform<R> {
  fn event_bus(&self) -> &EventBus {
    // Delegate to HasEventBus blanket impl pattern
    <Self as HasEventBus>::get_event_bus(self)
  }

  fn stream(&self) -> &o19_foundframe::thestream::TheStream {
    // Android doesn't have a local stream - all operations go through the service
    panic!("AndroidPlatform does not have a local TheStream - use the write methods directly")
  }

  fn exit(&self, code: i32) {
    self.app_handle.exit(code);
  }

  fn request_permissions(&self) -> Result<NotificationPermissionStatus> {
    // TODO: Call into Android plugin for actual permission request
    Ok(NotificationPermissionStatus {
      status: "granted".into(),
    })
  }

  fn shutdown(&self) -> Result<()> {
    // On Android, the service handles its own lifecycle
    tracing::info!("Android platform shutdown (service continues running)");
    Ok(())
  }

  // ===========================================================================
  // Device Pairing - Custom implementations (not generated)
  // ===========================================================================

  fn generate_pairing_qr(&self, _device_name: String) -> Result<PairingQrResponse> {
    let url = self.with_client(|c| c.generate_pairing_code())?;

    // Parse the URL to extract emoji identity and node ID
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
    let followers = self.with_client(|c| c.list_followers())?;

    let mut newly_paired = Vec::new();

    for nid in followers {
      let alias = format!("Device {}", &nid[..8.min(nid.len())]);

      match self.with_client(|c| c.follow_device(&nid)) {
        Ok(_) => {
          newly_paired.push(PairedDeviceInfo {
            node_id: nid,
            alias,
            paired: true,
          });
        }
        Err(e) => {
          tracing::warn!("Failed to auto-follow {}: {}", nid, e);
        }
      }
    }

    Ok(newly_paired)
  }

  // ===========================================================================
  // Camera Operations - Delegated to Tauri Android Plugin
  // ===========================================================================

  fn start_camera(&self, mode: String, camera_direction: String) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin(
        "startCamera",
        serde_json::json!({
          "mode": mode,
          "cameraDirection": camera_direction
        }),
      )
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }

  fn stop_camera(&self) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin("stopCamera", ())
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }

  fn capture_photo(&self) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin("capturePhoto", ())
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }

  fn set_camera_mode(&self, mode: String, camera_direction: String) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin(
        "setCameraMode",
        serde_json::json!({
          "mode": mode,
          "cameraDirection": camera_direction
        }),
      )
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }

  fn is_camera_active(&self) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin("isCameraActive", ())
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }

  fn request_camera_permissions(&self) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin("requestCameraPermissions", ())
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }

  fn check_camera_permissions(&self) -> Result<serde_json::Value> {
    self
      .plugin_handle
      .run_mobile_plugin("checkCameraPermissions", ())
      .map_err(|e| Error::Other(format!("Camera error: {}", e)))
  }
}
