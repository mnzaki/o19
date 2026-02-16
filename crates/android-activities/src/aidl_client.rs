//! Client-side bindings for FoundframeRadicle service

use std::sync::Arc;

use crate::ty::circulari::o19::{
  IEventCallback::IEventCallback,
  IFoundframeRadicle::{BpFoundframeRadicle, IFoundframeRadicle},
};

use rsbinder::{hub, status::Status, status::StatusCode, ProcessState};

/// Client for the FoundframeRadicle service
pub struct Client {
  proxy: Option<BpFoundframeRadicle>,
}

impl Client {
  /// Create a new client (does not connect yet)
  pub fn new() -> Self {
    Self { proxy: None }
  }

  /// Connect to the service
  pub fn connect(&mut self) -> rsbinder::Result<()> {
    ProcessState::init_default();

    match hub::get_service("foundframe.radicle") {
      Ok(Some(binder)) => {
        self.proxy = Some(BpFoundframeRadicle::new(binder));
        Ok(())
      }
      Ok(None) => Err(Status::from(StatusCode::NameNotFound)),
      Err(e) => Err(e),
    }
  }

  /// Check if connected to the service
  pub fn is_connected(&self) -> bool {
    self.proxy.is_some()
  }

  fn proxy(&self) -> rsbinder::Result<&BpFoundframeRadicle> {
    self
      .proxy
      .as_ref()
      .ok_or_else(|| Status::from(StatusCode::NotInitialized))
  }

  // ========================================================================
  // Node Info
  // ========================================================================

  pub fn get_node_id(&self) -> rsbinder::Result<String> {
    self.proxy()?.getNodeId()
  }

  pub fn is_node_running(&self) -> rsbinder::Result<bool> {
    self.proxy()?.isNodeRunning()
  }

  pub fn get_node_alias(&self) -> rsbinder::Result<String> {
    self.proxy()?.getNodeAlias()
  }

  // ========================================================================
  // PKB / Repository Operations
  // ========================================================================

  pub fn create_repository(&self, name: &str) -> rsbinder::Result<bool> {
    self.proxy()?.createRepository(name)
  }

  pub fn list_repositories(&self) -> rsbinder::Result<Vec<String>> {
    self.proxy()?.listRepositories()
  }

  // ========================================================================
  // Device Pairing
  // ========================================================================

  pub fn generate_pairing_code(&self) -> rsbinder::Result<String> {
    self.proxy()?.generatePairingCode()
  }

  pub fn confirm_pairing(&self, device_id: &str, code: &str) -> rsbinder::Result<bool> {
    self.proxy()?.confirmPairing(device_id, code)
  }

  pub fn follow_device(&self, device_id: &str) -> rsbinder::Result<bool> {
    self.proxy()?.followDevice(device_id)
  }

  pub fn list_followers(&self) -> rsbinder::Result<Vec<String>> {
    self.proxy()?.listFollowers()
  }

  pub fn unpair_device(&self, device_id: &str) -> rsbinder::Result<()> {
    self.proxy()?.unpairDevice(device_id)
  }

  // ========================================================================
  // Event Subscription
  // ========================================================================

  pub fn subscribe_events(&self, callback: Arc<dyn IEventCallback>) -> rsbinder::Result<()> {
    self.proxy()?.subscribeEvents(&callback)
  }

  pub fn unsubscribe_events(&self, callback: Arc<dyn IEventCallback>) -> rsbinder::Result<()> {
    self.proxy()?.unsubscribeEvents(&callback)
  }
}

impl Default for Client {
  fn default() -> Self {
    Self::new()
  }
}

/// Check if the service is running
pub fn is_service_running() -> bool {
  ProcessState::init_default();
  hub::get_service("foundframe.radicle").is_ok_and(|s| s.is_some())
}

/// JNI helper for checking service availability
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleClient_nativePingService() -> bool
{
  is_service_running()
}
