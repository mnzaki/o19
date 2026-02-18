//! Client-side bindings for FoundframeRadicle service
//!
//! This module provides a clean API for the tauri-plugin that doesn't
//! expose rsbinder types.

use crate::ty::circulari::o19::{
  IEventCallback::IEventCallback,
  IFoundframeRadicle::{BpFoundframeRadicle, IFoundframeRadicle},
};

use rsbinder::{hub, status, ProcessState, Proxy, StatusCode, Strong};
use std::fmt;

/// Error type for service operations
#[derive(Debug, Clone)]
pub enum ServiceError {
  /// Service not found or not running
  NotConnected,
  /// Invalid parameter
  InvalidParameter,
  /// Service-specific error
  ServiceError(String),
  /// Unknown error
  Unknown,
}

impl fmt::Display for ServiceError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      ServiceError::NotConnected => write!(f, "Service not connected"),
      ServiceError::InvalidParameter => write!(f, "Invalid parameter"),
      ServiceError::ServiceError(msg) => write!(f, "Service error: {}", msg),
      ServiceError::Unknown => write!(f, "Unknown error"),
    }
  }
}

impl std::error::Error for ServiceError {}

impl From<status::Status> for ServiceError {
  fn from(status: status::Status) -> Self {
    // Map common status codes to service errors
    // Note: NameNotFound, BadValue etc are StatusCode variants which get
    // converted to Status and then to ExceptionCode in the binder layer
    ServiceError::ServiceError(format!("{:?}", status))
  }
}

/// Result type for service operations
pub type ServiceResult<T> = std::result::Result<T, ServiceError>;

/// Client for the FoundframeRadicle service
pub struct Client {
  proxy: Option<Strong<dyn IFoundframeRadicle>>,
}

impl Client {
  /// Create a new client (does not connect yet)
  pub fn new() -> Self {
    Self { proxy: None }
  }

  /// Connect to the service
  pub fn connect(&mut self) -> ServiceResult<()> {
    ProcessState::init_default();

    match hub::get_service("foundframe.radicle") {
      Some(binder) => {
        // Use from_binder to create the proxy
        match BpFoundframeRadicle::from_binder(binder) {
          Some(proxy) => {
            self.proxy = Some(Strong::new(Box::new(proxy)));
            Ok(())
          }
          None => Err(ServiceError::NotConnected),
        }
      }
      None => Err(ServiceError::NotConnected),
    }
  }

  /// Check if connected to the service
  pub fn is_connected(&self) -> bool {
    self.proxy.is_some()
  }

  fn proxy(&self) -> ServiceResult<&Strong<dyn IFoundframeRadicle>> {
    self.proxy.as_ref().ok_or(ServiceError::NotConnected)
  }

  // ========================================================================
  // Node Info
  // ========================================================================

  pub fn get_node_id(&self) -> ServiceResult<String> {
    self.proxy()?.r#getNodeId().map_err(Into::into)
  }

  pub fn is_node_running(&self) -> ServiceResult<bool> {
    self.proxy()?.r#isNodeRunning().map_err(Into::into)
  }

  pub fn get_node_alias(&self) -> ServiceResult<String> {
    self.proxy()?.r#getNodeAlias().map_err(Into::into)
  }

  // ========================================================================
  // PKB / Repository Operations
  // ========================================================================

  pub fn create_repository(&self, name: &str) -> ServiceResult<bool> {
    self.proxy()?.r#createRepository(name).map_err(Into::into)
  }

  pub fn list_repositories(&self) -> ServiceResult<Vec<String>> {
    self.proxy()?.r#listRepositories().map_err(Into::into)
  }

  // ========================================================================
  // Device Pairing
  // ========================================================================

  pub fn generate_pairing_code(&self) -> ServiceResult<String> {
    self.proxy()?.r#generatePairingCode().map_err(Into::into)
  }

  pub fn confirm_pairing(&self, device_id: &str, code: &str) -> ServiceResult<bool> {
    self
      .proxy()?
      .r#confirmPairing(device_id, code)
      .map_err(Into::into)
  }

  pub fn follow_device(&self, device_id: &str) -> ServiceResult<bool> {
    self.proxy()?.r#followDevice(device_id).map_err(Into::into)
  }

  pub fn list_followers(&self) -> ServiceResult<Vec<String>> {
    self.proxy()?.r#listFollowers().map_err(Into::into)
  }

  pub fn unpair_device(&self, device_id: &str) -> ServiceResult<()> {
    self.proxy()?.r#unpairDevice(device_id).map_err(Into::into)
  }

  // ========================================================================
  // Write Operations - Content Creation
  // ========================================================================

  pub fn add_post(&self, content: &str, title: Option<&str>) -> ServiceResult<String> {
    let title_str = title.unwrap_or("");
    self.proxy()?.r#addPost(content, title_str).map_err(Into::into)
  }

  pub fn add_bookmark(&self, url: &str, title: Option<&str>, notes: Option<&str>) -> ServiceResult<String> {
    let title_str = title.unwrap_or("");
    let notes_str = notes.unwrap_or("");
    self.proxy()?.r#addBookmark(url, title_str, notes_str).map_err(Into::into)
  }

  pub fn add_media_link(
    &self,
    directory: &str,
    url: &str,
    title: Option<&str>,
    mime_type: Option<&str>,
    subpath: Option<&str>,
  ) -> ServiceResult<String> {
    let title_str = title.unwrap_or("");
    let mime_str = mime_type.unwrap_or("");
    let subpath_str = subpath.unwrap_or("");
    self.proxy()?.r#addMediaLink(directory, url, title_str, mime_str, subpath_str).map_err(Into::into)
  }

  pub fn add_person(&self, display_name: &str, handle: Option<&str>) -> ServiceResult<String> {
    let handle_str = handle.unwrap_or("");
    self.proxy()?.r#addPerson(display_name, handle_str).map_err(Into::into)
  }

  pub fn add_conversation(&self, conversation_id: &str, title: Option<&str>) -> ServiceResult<String> {
    let title_str = title.unwrap_or("");
    self.proxy()?.r#addConversation(conversation_id, title_str).map_err(Into::into)
  }

  pub fn add_text_note(
    &self,
    directory: &str,
    content: &str,
    title: Option<&str>,
    subpath: Option<&str>,
  ) -> ServiceResult<String> {
    let title_str = title.unwrap_or("");
    let subpath_str = subpath.unwrap_or("");
    self.proxy()?.r#addTextNote(directory, content, title_str, subpath_str).map_err(Into::into)
  }

  // ========================================================================
  // Event Subscription
  // ========================================================================

  /// Subscribe to events from the service.
  /// Note: This uses rsbinder::Strong which is still exposed for callbacks.
  /// The tauri-plugin doesn't need to use this directly.
  pub fn subscribe_events(
    &self,
    callback: &Strong<dyn IEventCallback>,
  ) -> ServiceResult<()> {
    self.proxy()?.r#subscribeEvents(callback).map_err(Into::into)
  }

  pub fn unsubscribe_events(
    &self,
    callback: &Strong<dyn IEventCallback>,
  ) -> ServiceResult<()> {
    self
      .proxy()?
      .r#unsubscribeEvents(callback)
      .map_err(Into::into)
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
  hub::get_service("foundframe.radicle").is_some()
}

/// JNI helper for checking service availability
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleClient_nativePingService() -> bool {
  is_service_running()
}
