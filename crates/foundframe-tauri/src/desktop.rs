//! Desktop Platform Implementation
//!
//! On desktop, we initialize foundframe directly and call into it.

use crate::platform::*;
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

impl<R: Runtime> Platform for DesktopPlatform<R> {
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
    Ok(NotificationPermissionStatus {
      status: "granted".into(),
    })
  }

  // ===========================================================================
  // Write Operations - Direct TheStream calls
  // ===========================================================================

  fn add_post(&self, content: String, title: Option<String>) -> Result<StreamEntryResult> {
    use o19_foundframe::post::PostStream;

    let entry = self
      .stream
      .add_post(content, title.as_deref())
      .map_err(|e| Error::Other(format!("Failed to add post: {e}")))?;

    Ok(StreamEntryResult {
      id: entry.id,
      seen_at: entry.seen_at,
      reference: entry.reference,
    })
  }

  fn add_bookmark(
    &self,
    url: String,
    title: Option<String>,
    notes: Option<String>,
  ) -> Result<StreamEntryResult> {
    use o19_foundframe::bookmark::BookmarkStream;

    let entry = self
      .stream
      .add_bookmark(url, title.as_deref(), notes.as_deref())
      .map_err(|e| Error::Other(format!("Failed to add bookmark: {e}")))?;

    Ok(StreamEntryResult {
      id: entry.id,
      seen_at: entry.seen_at,
      reference: entry.reference,
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
    use o19_foundframe::media::MediaStream;
    use o19_foundframe::pkb::DirectoryId;

    let dir_id = DirectoryId::from(directory);
    let entry = self
      .stream
      .add_media_link(
        dir_id,
        subpath.as_deref(),
        url,
        title.as_deref(),
        mime_type.as_deref(),
      )
      .map_err(|e| Error::Other(format!("Failed to add media link: {e}")))?;

    Ok(StreamEntryResult {
      id: entry.id,
      seen_at: entry.seen_at,
      reference: entry.reference,
    })
  }

  fn add_person(&self, display_name: String, handle: Option<String>) -> Result<StreamEntryResult> {
    use o19_foundframe::person::PersonStream;

    let entry = self
      .stream
      .add_person(display_name, handle.as_deref())
      .map_err(|e| Error::Other(format!("Failed to add person: {e}")))?;

    Ok(StreamEntryResult {
      id: entry.id,
      seen_at: entry.seen_at,
      reference: entry.reference,
    })
  }

  fn add_conversation(
    &self,
    conversation_id: String,
    title: Option<String>,
  ) -> Result<StreamEntryResult> {
    use o19_foundframe::conversation::ConversationStream;

    let entry = self
      .stream
      .add_conversation(conversation_id, title.as_deref())
      .map_err(|e| Error::Other(format!("Failed to add conversation: {e}")))?;

    Ok(StreamEntryResult {
      id: entry.id,
      seen_at: entry.seen_at,
      reference: entry.reference,
    })
  }

  fn add_text_note(
    &self,
    directory: String,
    content: String,
    title: Option<String>,
    subpath: Option<String>,
  ) -> Result<StreamEntryResult> {
    use o19_foundframe::pkb::{DirectoryId, StreamChunk};

    let dir_id = DirectoryId::from(directory);
    let chunk = StreamChunk::TextNote {
      content,
      title: title.clone(),
    };

    let timestamp = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs();
    let filename = chunk.generate_filename(timestamp, title.as_deref());
    let path = match subpath {
      Some(sub) => std::path::PathBuf::from(sub).join(filename),
      None => std::path::PathBuf::from(filename),
    };

    let entry = self
      .stream
      .add_chunk(dir_id, path, chunk)
      .map_err(|e| Error::Other(format!("Failed to add text note: {e}")))?;

    Ok(StreamEntryResult {
      id: entry.id,
      seen_at: entry.seen_at,
      reference: entry.reference,
    })
  }

  // ===========================================================================
  // Device Pairing
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

    Ok(PairingQrResponse {
      url,
      emoji_identity: qr_data.emoji_identity,
      node_id_hex: qr_data.node_id,
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
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::NodeHandle;
    use o19_foundframe::pkb::radicle::node::NodeId;
    use std::str::FromStr;

    let node_id =
      NodeId::from_str(&node_id_hex).map_err(|e| Error::Other(format!("Invalid node ID: {e}")))?;

    let node_handle =
      NodeHandle::new().map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
    let mut device_manager = DeviceManager::new(node_handle);

    device_manager
      .pair(node_id, &alias)
      .map_err(|e| Error::Other(format!("Failed to pair device: {e}")))?;

    Ok(PairedDeviceInfo {
      node_id: node_id.to_string(),
      alias,
      paired: true,
    })
  }

  fn list_paired_devices(&self) -> Result<Vec<PairedDeviceInfo>> {
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::NodeHandle;

    let node_handle =
      NodeHandle::new().map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
    let device_manager = DeviceManager::new(node_handle);

    let devices = device_manager
      .list()
      .map_err(|e| Error::Other(format!("Failed to list devices: {e}")))?;

    Ok(
      devices
        .into_iter()
        .map(|d| PairedDeviceInfo {
          node_id: d.nid.to_string(),
          alias: d.alias.unwrap_or_else(|| "Unnamed".to_string()),
          paired: true,
        })
        .collect(),
    )
  }

  fn check_followers_and_pair(&self) -> Result<Vec<PairedDeviceInfo>> {
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::NodeHandle;
    use o19_foundframe::pkb::radicle::node::Session;
    use std::collections::HashSet;

    let currently_paired: HashSet<String> = {
      let node_handle = NodeHandle::new()
        .map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
      let device_manager = DeviceManager::new(node_handle);

      device_manager
        .list()
        .map_err(|e| Error::Other(format!("Failed to list devices: {e}")))?
        .into_iter()
        .map(|d| d.nid.to_string())
        .collect()
    };

    let node_handle =
      NodeHandle::new().map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
    let sessions: Vec<Session> = node_handle
      .sessions()
      .map_err(|e| Error::Other(format!("Failed to get sessions: {e}")))?;

    let mut newly_paired = Vec::new();

    for session in sessions {
      let nid_str = session.nid.to_string();

      if !currently_paired.contains(&nid_str) {
        let alias = format!("Device {}", &nid_str[..8]);

        let node_handle = NodeHandle::new()
          .map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
        let mut device_manager = DeviceManager::new(node_handle);

        match device_manager.pair(session.nid, &alias) {
          Ok(_) => {
            newly_paired.push(PairedDeviceInfo {
              node_id: nid_str,
              alias,
              paired: true,
            });
          }
          Err(e) => {
            tracing::warn!("Failed to auto-follow {}: {}", session.nid, e);
          }
        }
      }
    }

    Ok(newly_paired)
  }

  fn unpair_device(&self, node_id_hex: String) -> Result<()> {
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::NodeHandle;
    use o19_foundframe::pkb::radicle::node::NodeId;
    use std::str::FromStr;

    let node_id =
      NodeId::from_str(&node_id_hex).map_err(|e| Error::Other(format!("Invalid node ID: {e}")))?;

    let node_handle =
      NodeHandle::new().map_err(|e| Error::Other(format!("Failed to create node handle: {e}")))?;
    let mut device_manager = DeviceManager::new(node_handle);

    device_manager
      .unpair(node_id)
      .map_err(|e| Error::Other(format!("Failed to unpair device: {e}")))?;

    Ok(())
  }

  fn shutdown(&self) -> Result<()> {
    if let Ok(mut guard) = self.foundframe.lock() {
      if let Some(foundframe) = guard.take() {
        foundframe
          .shutdown()
          .map_err(|e| Error::Other(format!("Shutdown error: {e}")))?;
      }
    }
    Ok(())
  }
}

/// Get the default PKB path for desktop: $HOME/pkb
fn default_pkb_path() -> PathBuf {
  std::env::var("HOME")
    .map(|h| PathBuf::from(h).join("pkb"))
    .unwrap_or_else(|_| PathBuf::from(".pkb"))
}
