//! Android Platform Implementation
//!
//! Uses Binder IPC to communicate with the FoundframeRadicle service.
//! This implementation has NO dependency on foundframe - it delegates
//! all operations to the remote singleton service.

use crate::platform::*;
use crate::{Error, Result};
use android::aidl_client::Client as ServiceClient;
use o19_foundframe::signal::EventBus;
use serde::de::DeserializeOwned;
use std::sync::Mutex;
use tauri::{AppHandle, Runtime, plugin::PluginApi};

/// Initialize the Android platform.
pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> Result<AndroidPlatform<R>> {
  AndroidPlatform::new(app.clone())
}

/// Android platform implementation.
///
/// Connects to the FoundframeRadicle service via Binder IPC.
/// All operations are delegated to the remote service - no local foundframe code.
pub struct AndroidPlatform<R: Runtime> {
  app_handle: AppHandle<R>,
  events: EventBus,
  service_client: Mutex<ServiceClient>,
}

impl<R: Runtime> AndroidPlatform<R> {
  fn new(app_handle: AppHandle<R>) -> Result<Self> {
    // Connect to the service
    let mut service_client = ServiceClient::new();
    match service_client.connect() {
      Ok(()) => {
        tracing::info!("Connected to FoundframeRadicle service");
      }
      Err(e) => {
        tracing::warn!("Failed to connect to service: {}", e);
        // Continue anyway - we'll error on operations if not connected
      }
    }

    // Create local event bus for receiving events from service
    let events = EventBus::new();

    Ok(Self {
      app_handle,
      events,
      service_client: Mutex::new(service_client),
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
      return Err(Error::Other("Service not connected".into()));
    }
    f(&client).map_err(|e| Error::Other(format!("Service error: {}", e)))
  }
}

impl<R: Runtime> Platform for AndroidPlatform<R> {
  fn event_bus(&self) -> &EventBus {
    &self.events
  }

  fn stream(&self) -> &o19_foundframe::thestream::TheStream {
    // This should never be called on Android - the platform doesn't have a local stream
    // All write operations go through the binder service
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

  // ===========================================================================
  // Write Operations - Delegated to remote service via Binder
  // ===========================================================================

  fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult> {
    let reference = self.with_client(|c| c.add_post(&content, title.as_deref()))?;
    
    // The service returns the PKB URL reference
    // We don't have a local database ID since the service handles that
    Ok(StreamEntryResult {
      id: None, // ID is managed by the remote service
      seen_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64,
      reference,
    })
  }

  fn add_bookmark(
    &self,
    url: String,
    title: Option<String>,
    notes: Option<String>,
  ) -> Result<StreamEntryResult> {
    let reference = self.with_client(|c| c.add_bookmark(&url, title.as_deref(), notes.as_deref()))?;
    
    Ok(StreamEntryResult {
      id: None,
      seen_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64,
      reference,
    })
  }

  fn add_media_link(
    &self,
    directory: String,
    url: String,
    title: Option<String>,
    mime_type: Option<String>,
    subpath: Option<String>,
  ) -> Result<StreamEntryResult> {
    let reference = self.with_client(|c| {
      c.add_media_link(&directory, &url, title.as_deref(), mime_type.as_deref(), subpath.as_deref())
    })?;
    
    Ok(StreamEntryResult {
      id: None,
      seen_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64,
      reference,
    })
  }

  fn add_person(
    &self,
    display_name: String,
    handle: Option<String>,
  ) -> Result<StreamEntryResult> {
    let reference = self.with_client(|c| c.add_person(&display_name, handle.as_deref()))?;
    
    Ok(StreamEntryResult {
      id: None,
      seen_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64,
      reference,
    })
  }

  fn add_conversation(
    &self,
    conversation_id: String,
    title: Option<String>,
  ) -> Result<StreamEntryResult> {
    let reference = self.with_client(|c| c.add_conversation(&conversation_id, title.as_deref()))?;
    
    Ok(StreamEntryResult {
      id: None,
      seen_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64,
      reference,
    })
  }

  fn add_text_note(
    &self,
    directory: String,
    content: String,
    title: Option<String>,
    subpath: Option<String>,
  ) -> Result<StreamEntryResult> {
    let reference = self.with_client(|c| {
      c.add_text_note(&directory, &content, title.as_deref(), subpath.as_deref())
    })?;
    
    Ok(StreamEntryResult {
      id: None,
      seen_at: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64,
      reference,
    })
  }

  // ===========================================================================
  // Device Pairing - Delegated to service via Binder
  // ===========================================================================

  fn generate_pairing_qr(&self, _device_name: String) -> Result<PairingQrResponse> {
    let url = self.with_client(|c| c.generate_pairing_code())?;

    // Parse the URL to extract emoji identity and node ID
    let node_id_hex = extract_node_id_from_url(&url)?;
    let emoji_identity = extract_emoji_from_url(&url)?;

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

  fn confirm_pairing(&self, node_id_hex: String, alias: String) -> Result<PairedDeviceInfo> {
    self.with_client(|c| c.confirm_pairing(&node_id_hex, ""))?;

    Ok(PairedDeviceInfo {
      node_id: node_id_hex,
      alias,
      paired: true,
    })
  }

  fn list_paired_devices(&self) -> Result<Vec<PairedDeviceInfo>> {
    let followers = self.with_client(|c| c.list_followers())?;

    Ok(followers
      .into_iter()
      .map(|nid| PairedDeviceInfo {
        node_id: nid.clone(),
        alias: format!("Device {}", &nid[..8.min(nid.len())]),
        paired: true,
      })
      .collect())
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

  fn unpair_device(&self, node_id_hex: String) -> Result<()> {
    self.with_client(|c| c.unpair_device(&node_id_hex))?;
    Ok(())
  }

  fn shutdown(&self) -> Result<()> {
    // On Android, the service handles its own lifecycle
    // The app just disconnects
    tracing::info!("Android platform shutdown (service continues running)");
    Ok(())
  }
}

/// Extract node ID from pairing URL
fn extract_node_id_from_url(url: &str) -> Result<String> {
  url.split("?")
    .nth(1)
    .and_then(|params| {
      params.split("&").find_map(|p| p.strip_prefix("nid=").map(|v| v.to_string()))
    })
    .ok_or_else(|| Error::Other("Invalid pairing URL".into()))
}

/// Extract emoji identity from pairing URL
fn extract_emoji_from_url(url: &str) -> Result<String> {
  url.split("?")
    .nth(1)
    .and_then(|params| {
      params.split("&").find_map(|p| p.strip_prefix("emoji=").map(|v| v.to_string()))
    })
    .ok_or_else(|| Error::Other("Invalid pairing URL".into()))
}
