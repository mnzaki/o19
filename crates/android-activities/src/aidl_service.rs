//! Service-side implementation of FoundframeRadicle

use std::collections::HashMap;
use std::sync::Mutex;

use crate::ty::circulari::o19::{
  IEventCallback::IEventCallback,
  IFoundframeRadicle::{BnFoundframeRadicle, IFoundframeRadicle},
};
use rsbinder::{hub, status, Interface, ProcessState, StatusCode, Strong, Weak};

/// The FoundframeRadicle service implementation
///
/// This is a thin wrapper around the Foundframe runtime. All content operations
/// are delegated to `foundframe.with_thestream()` - foundframe owns TheStream.
pub struct Service {
  foundframe: Mutex<Option<o19_foundframe::Foundframe>>,
  config: Mutex<Config>,
  callbacks: Mutex<HashMap<u64, Weak<dyn IEventCallback>>>,
  callback_counter: Mutex<u64>,
}

#[derive(Clone, Debug)]
struct Config {
  radicle_home: String,
  node_alias: String,
}

impl Service {
  pub fn new(radicle_home: String, node_alias: String) -> Self {
    Self {
      foundframe: Mutex::new(None),
      config: Mutex::new(Config {
        radicle_home,
        node_alias,
      }),
      callbacks: Mutex::new(HashMap::new()),
      callback_counter: Mutex::new(0),
    }
  }

  fn ensure_initialized(&self) -> status::Result<()> {
    let mut guard = self.foundframe.lock().unwrap();
    if guard.is_some() {
      return Ok(());
    }

    let config = self.config.lock().unwrap();
    // Configure with PKB base for content storage
    let pkb_base = std::path::PathBuf::from(&config.radicle_home).join("pkb");
    let options = o19_foundframe::InitOptions::new(&config.radicle_home, &config.node_alias)
      .pkb_base(&pkb_base);

    match o19_foundframe::init(options, None) {
      Ok(foundframe) => {
        *guard = Some(foundframe);
        Ok(())
      }
      Err(e) => {
        eprintln!("Failed to initialize foundframe: {}", e);
        Err(status::Status::from(StatusCode::ServiceSpecific(-1)))
      }
    }
  }

  /// Helper to execute a function with the foundframe instance.
  fn with_foundframe<T>(
    &self,
    f: impl FnOnce(&o19_foundframe::Foundframe) -> status::Result<T>,
  ) -> status::Result<T> {
    let guard = self.foundframe.lock().unwrap();
    let foundframe = guard
      .as_ref()
      .ok_or_else(|| status::Status::from(StatusCode::NoInit))?;
    f(foundframe)
  }

  /// Helper to execute a function with TheStream via foundframe.
  /// Handles error conversion from foundframe::Error to status::Status.
  fn with_thestream<T>(
    &self,
    f: impl FnOnce(&o19_foundframe::thestream::TheStream) -> Result<T, o19_foundframe::Error>,
  ) -> status::Result<T> {
    let guard = self.foundframe.lock().unwrap();
    let foundframe = guard
      .as_ref()
      .ok_or_else(|| status::Status::from(StatusCode::NoInit))?;

    // Initialize thestream if needed and execute the function
    let result: Result<T, o19_foundframe::Error> = foundframe.with_thestream(|stream| f(stream));

    result.map_err(|e| {
      eprintln!("TheStream error: {}", e);
      status::Status::from(StatusCode::ServiceSpecific(-2))
    })
  }
}

// Implement Interface for Service (required by IFoundframeRadicle)
impl Interface for Service {
  fn as_binder(&self) -> rsbinder::SIBinder {
    // This should not be called directly on Service
    // The BnFoundframeRadicle wrapper handles this
    unimplemented!("Service::as_binder should not be called directly")
  }
}

impl IFoundframeRadicle for Service {
  fn r#getNodeId(&self) -> status::Result<String> {
    self.ensure_initialized()?;
    let mut guard = self.foundframe.lock().unwrap();
    let foundframe = guard
      .as_mut()
      .ok_or_else(|| status::Status::from(StatusCode::NoInit))?;

    // NodeHandle::local_id needs mutable access
    // Create a new handle instead of borrowing
    use o19_foundframe::pkb::radicle::NodeHandle;
    let mut node_handle =
      NodeHandle::new().map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;
    let node_id = node_handle
      .local_id()
      .map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;

    Ok(node_id.to_string())
  }

  fn r#isNodeRunning(&self) -> status::Result<bool> {
    Ok(self.foundframe.lock().unwrap().is_some())
  }

  fn r#getNodeAlias(&self) -> status::Result<String> {
    let config = self.config.lock().unwrap();
    Ok(config.node_alias.clone())
  }

  fn r#createRepository(&self, name: &str) -> status::Result<bool> {
    self.ensure_initialized()?;
    eprintln!("createRepository: {}", name);
    Ok(true)
  }

  fn r#listRepositories(&self) -> status::Result<Vec<String>> {
    self.ensure_initialized()?;
    Ok(vec![])
  }

  fn r#followDevice(&self, device_id: &str) -> status::Result<bool> {
    self.ensure_initialized()?;
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::{node::NodeId, NodeHandle};
    use std::str::FromStr;

    let node_id =
      NodeId::from_str(device_id).map_err(|_| status::Status::from(StatusCode::BadValue))?;

    let node_handle =
      NodeHandle::new().map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;
    let mut device_manager = DeviceManager::new(node_handle);

    device_manager
      .pair(node_id, "Paired Device")
      .map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;

    Ok(true)
  }

  fn r#listFollowers(&self) -> status::Result<Vec<String>> {
    self.ensure_initialized()?;
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::NodeHandle;

    let node_handle =
      NodeHandle::new().map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;
    let device_manager = DeviceManager::new(node_handle);

    let devices = device_manager
      .list()
      .map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;

    Ok(devices.into_iter().map(|d| d.nid.to_string()).collect())
  }

  fn r#generatePairingCode(&self) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::device::PairingQrData;
    use o19_foundframe::pkb::radicle::NodeHandle;

    let mut node_handle =
      NodeHandle::new().map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;
    let node_id = node_handle
      .local_id()
      .map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;

    let config = self.config.lock().unwrap();
    let qr_data = PairingQrData::new(node_id, &config.node_alias);

    Ok(qr_data.to_url())
  }

  fn r#confirmPairing(&self, device_id: &str, _code: &str) -> status::Result<bool> {
    self.r#followDevice(device_id)
  }

  fn r#unpairDevice(&self, device_id: &str) -> status::Result<()> {
    self.ensure_initialized()?;
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::pkb::radicle::{node::NodeId, NodeHandle};
    use std::str::FromStr;

    let node_id =
      NodeId::from_str(device_id).map_err(|_| status::Status::from(StatusCode::BadValue))?;

    let node_handle =
      NodeHandle::new().map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;
    let mut device_manager = DeviceManager::new(node_handle);

    device_manager
      .unpair(node_id)
      .map_err(|_| status::Status::from(StatusCode::ServiceSpecific(-1)))?;

    Ok(())
  }

  // ===========================================================================
  // Write Operations - Content Creation
  // ===========================================================================

  fn r#addPost(&self, content: &str, title: &str) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::post::PostStream;

    let title_opt = if title.is_empty() { None } else { Some(title) };
    self
      .with_thestream(|stream| stream.add_post(content, title_opt))
      .map(|entry| entry.reference)
  }

  fn r#addBookmark(&self, url: &str, title: &str, notes: &str) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::bookmark::BookmarkStream;

    let title_opt = if title.is_empty() { None } else { Some(title) };
    let notes_opt = if notes.is_empty() { None } else { Some(notes) };
    self
      .with_thestream(|stream| stream.add_bookmark(url, title_opt, notes_opt))
      .map(|entry| entry.reference)
  }

  fn r#addMediaLink(
    &self,
    directory: &str,
    url: &str,
    title: &str,
    mime_type: &str,
    subpath: &str,
  ) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::media::MediaStream;
    use o19_foundframe::pkb::DirectoryId;

    let dir_id = DirectoryId::from(directory);
    let title_opt = if title.is_empty() { None } else { Some(title) };
    let mime_opt = if mime_type.is_empty() {
      None
    } else {
      Some(mime_type)
    };
    let subpath_opt = if subpath.is_empty() {
      None
    } else {
      Some(subpath)
    };

    self
      .with_thestream(|stream| stream.add_media_link(dir_id, subpath_opt, url, title_opt, mime_opt))
      .map(|entry| entry.reference)
  }

  fn r#addPerson(&self, display_name: &str, handle: &str) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::person::PersonStream;

    let handle_opt = if handle.is_empty() {
      None
    } else {
      Some(handle)
    };
    self
      .with_thestream(|stream| stream.add_person(display_name, handle_opt))
      .map(|entry| entry.reference)
  }

  fn r#addConversation(&self, conversation_id: &str, title: &str) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::conversation::ConversationStream;

    let title_opt = if title.is_empty() { None } else { Some(title) };
    self
      .with_thestream(|stream| stream.add_conversation(conversation_id, title_opt))
      .map(|entry| entry.reference)
  }

  fn r#addTextNote(
    &self,
    directory: &str,
    content: &str,
    title: &str,
    subpath: &str,
  ) -> status::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::pkb::{DirectoryId, StreamChunk};

    let dir_id = DirectoryId::from(directory);
    let title_opt = if title.is_empty() {
      None
    } else {
      Some(title.to_string())
    };
    let chunk = StreamChunk::TextNote {
      content: content.to_string(),
      title: title_opt.clone(),
    };

    let timestamp = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default()
      .as_secs();
    let filename = chunk.generate_filename(timestamp, title_opt.as_deref());
    let path = match subpath {
      "" => std::path::PathBuf::from(filename),
      _ => std::path::PathBuf::from(subpath).join(filename),
    };

    self
      .with_thestream(|stream| stream.add_chunk(dir_id, path, chunk))
      .map(|entry| entry.reference)
  }

  fn r#subscribeEvents(&self, callback: &Strong<dyn IEventCallback>) -> status::Result<()> {
    let mut counter = self.callback_counter.lock().unwrap();
    let id = *counter;
    *counter += 1;

    let mut callbacks = self.callbacks.lock().unwrap();
    callbacks.insert(id, Strong::downgrade(callback));
    Ok(())
  }

  fn r#unsubscribeEvents(&self, _callback: &Strong<dyn IEventCallback>) -> status::Result<()> {
    // Simplified: we don't try to match specific callbacks
    // In a real implementation, you'd compare binder pointers
    // For now, just clear stale callbacks
    let mut callbacks = self.callbacks.lock().unwrap();
    callbacks.retain(|_, weak| weak.upgrade().is_ok());
    Ok(())
  }
}

/// JNI entry point for starting the service
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeStartService(
  _env: *mut std::ffi::c_void,
  _class: *mut std::ffi::c_void,
  radicle_home: *const u8,
  radicle_home_len: usize,
  alias: *const u8,
  alias_len: usize,
) {
  let radicle_home = unsafe {
    String::from_utf8_lossy(std::slice::from_raw_parts(radicle_home, radicle_home_len)).to_string()
  };
  let alias =
    unsafe { String::from_utf8_lossy(std::slice::from_raw_parts(alias, alias_len)).to_string() };

  eprintln!("FoundframeRadicleService starting...");
  eprintln!("  Radicle home: {}", radicle_home);
  eprintln!("  Alias: {}", alias);

  ProcessState::init_default();

  let service = Service::new(radicle_home, alias);
  let binder = BnFoundframeRadicle::new_binder(service);

  hub::add_service("foundframe.radicle", binder.as_binder());
  eprintln!("Service registered");

  ProcessState::join_thread_pool();
}
