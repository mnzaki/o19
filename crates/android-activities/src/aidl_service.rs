//! Service-side implementation of FoundframeRadicle

use std::collections::HashMap;
use std::sync::{Arc, Mutex, Weak};

use crate::ty::circulari::o19::{
  IEventCallback::IEventCallback,
  IFoundframeRadicle::{BpFoundframeRadicle, IFoundframeRadicle},
};
use rsbinder::{hub, status::Status, status::StatusCode, ProcessState};

/// The FoundframeRadicle service implementation
pub struct Service {
  foundframe: Mutex<Option<o19_foundframe::Foundframe>>,
  config: Mutex<Config>,
  callbacks: Mutex<HashMap<u64, Weak<dyn IEventCallback + Send + Sync>>>,
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

  fn ensure_initialized(&self) -> rsbinder::Result<()> {
    let mut guard = self.foundframe.lock().unwrap();
    if guard.is_some() {
      return Ok(());
    }

    let config = self.config.lock().unwrap();
    let options =
      o19_foundframe::InitOptions::new(&config.radicle_home, &config.node_alias).no_pkb_base();

    match o19_foundframe::init(options, None) {
      Ok(foundframe) => {
        *guard = Some(foundframe);
        Ok(())
      }
      Err(e) => {
        eprintln!("Failed to initialize foundframe: {}", e);
        Err(Status::from(StatusCode::ServiceSpecific))
      }
    }
  }
}

impl IFoundframeRadicle for Service {
  fn getNodeId(&self) -> rsbinder::Result<String> {
    self.ensure_initialized()?;
    self
      .foundframe
      .lock()
      .unwrap()
      .as_ref()
      .and_then(|f| f.node().local_id().ok().map(|id| id.to_string()))
      .ok_or_else(|| Status::from(StatusCode::NotInitialized))
  }

  fn isNodeRunning(&self) -> rsbinder::Result<bool> {
    Ok(self.foundframe.lock().unwrap().is_some())
  }

  fn getNodeAlias(&self) -> rsbinder::Result<String> {
    let config = self.config.lock().unwrap();
    Ok(config.node_alias.clone())
  }

  fn createRepository(&self, name: &str) -> rsbinder::Result<bool> {
    self.ensure_initialized()?;
    eprintln!("createRepository: {}", name);
    Ok(true)
  }

  fn listRepositories(&self) -> rsbinder::Result<Vec<String>> {
    self.ensure_initialized()?;
    Ok(vec![])
  }

  fn followDevice(&self, device_id: &str) -> rsbinder::Result<bool> {
    self.ensure_initialized()?;
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::radicle::{node::NodeId, NodeHandle};
    use std::str::FromStr;

    let node_id = NodeId::from_str(device_id).map_err(|_| Status::from(StatusCode::BadValue))?;

    let node_handle = NodeHandle::new().map_err(|_| Status::from(StatusCode::ServiceSpecific))?;
    let mut device_manager = DeviceManager::new(node_handle);

    device_manager
      .pair(node_id, "Paired Device")
      .map_err(|_| Status::from(StatusCode::ServiceSpecific))?;

    Ok(true)
  }

  fn listFollowers(&self) -> rsbinder::Result<Vec<String>> {
    self.ensure_initialized()?;
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::radicle::NodeHandle;

    let node_handle = NodeHandle::new().map_err(|_| Status::from(StatusCode::ServiceSpecific))?;
    let device_manager = DeviceManager::new(node_handle);

    let devices = device_manager
      .list()
      .map_err(|_| Status::from(StatusCode::ServiceSpecific))?;

    Ok(devices.into_iter().map(|d| d.nid.to_string()).collect())
  }

  fn generatePairingCode(&self) -> rsbinder::Result<String> {
    self.ensure_initialized()?;
    use o19_foundframe::device::PairingQrData;
    use o19_foundframe::radicle::NodeHandle;

    let mut node_handle =
      NodeHandle::new().map_err(|_| Status::from(StatusCode::ServiceSpecific))?;
    let node_id = node_handle
      .local_id()
      .map_err(|_| Status::from(StatusCode::ServiceSpecific))?;

    let config = self.config.lock().unwrap();
    let qr_data = PairingQrData::new(node_id, &config.node_alias);

    Ok(qr_data.to_url())
  }

  fn confirmPairing(&self, device_id: &str, _code: &str) -> rsbinder::Result<bool> {
    self.followDevice(device_id)
  }

  fn unpairDevice(&self, device_id: &str) -> rsbinder::Result<()> {
    self.ensure_initialized()?;
    use o19_foundframe::device::DeviceManager;
    use o19_foundframe::radicle::{node::NodeId, NodeHandle};
    use std::str::FromStr;

    let node_id = NodeId::from_str(device_id).map_err(|_| Status::from(StatusCode::BadValue))?;

    let node_handle = NodeHandle::new().map_err(|_| Status::from(StatusCode::ServiceSpecific))?;
    let mut device_manager = DeviceManager::new(node_handle);

    device_manager
      .unpair(node_id)
      .map_err(|_| Status::from(StatusCode::ServiceSpecific))?;

    Ok(())
  }

  fn subscribeEvents(&self, callback: &Arc<dyn IEventCallback>) -> rsbinder::Result<()> {
    let mut counter = self.callback_counter.lock().unwrap();
    let id = *counter;
    *counter += 1;

    let mut callbacks = self.callbacks.lock().unwrap();
    callbacks.insert(id, Arc::downgrade(callback));
    Ok(())
  }

  fn unsubscribeEvents(&self, callback: &Arc<dyn IEventCallback>) -> rsbinder::Result<()> {
    let mut callbacks = self.callbacks.lock().unwrap();
    callbacks.retain(|_, weak| {
      weak
        .upgrade()
        .map(|arc| !Arc::ptr_eq(&arc, callback))
        .unwrap_or(false)
    });
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
  let binder = BpFoundframeRadicle::new_binder(service);

  hub::add_service("foundframe.radicle", binder.as_binder());
  eprintln!("Service registered");

  ProcessState::join_thread_pool();
}
