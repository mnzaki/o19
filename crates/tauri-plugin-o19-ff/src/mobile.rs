//! Mobile platform implementation for o19-ff plugin
//!
//! On Android: Connects to FoundframeRadicle singleton service via Binder IPC
//! On iOS: (TODO) Direct foundframe initialization

use serde::de::DeserializeOwned;
use tauri::{
  AppHandle, Runtime,
  plugin::{PluginApi, PluginHandle},
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_internal_api);

/// Initialize the mobile platform
///
/// On Android: Starts/connects to FoundframeRadicle service
/// On iOS: Initializes foundframe directly
pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Platform<R>> {
  #[cfg(target_os = "android")]
  {
    // Register the Tauri plugin (for permissions, etc.)
    let handle = api.register_android_plugin("ty.circulari.o19.ff", "ApiPlugin")?;

    // Ensure the FoundframeRadicle service is running
    // The Kotlin side will start the service if needed
    ensure_service_running(app)?;

    Ok(Platform::Android { handle })
  }

  #[cfg(target_os = "ios")]
  {
    let handle = api.register_ios_plugin(init_plugin_internal_api)?;
    Ok(Platform::Ios { handle })
  }
}

/// Platform-specific implementation
pub enum Platform<R: Runtime> {
  #[cfg(target_os = "android")]
  Android { handle: PluginHandle<R> },
  #[cfg(target_os = "ios")]
  Ios { handle: PluginHandle<R> },
}

impl<R: Runtime> Platform<R> {
  /// Request notification permissions (Android only)
  pub fn request_permissions(&self) -> crate::Result<NotificationPermissionStatus> {
    match self {
      #[cfg(target_os = "android")]
      Platform::Android { handle } => handle
        .run_mobile_plugin("requestPermissions", ())
        .map_err(Into::into),
      #[cfg(target_os = "ios")]
      Platform::Ios { .. } => {
        // iOS permissions handled differently
        Ok(NotificationPermissionStatus {
          status: "granted".to_string(),
        })
      }
    }
  }

  /// Get the FoundframeRadicle service client (Android only)
  #[cfg(target_os = "android")]
  pub fn service_client(&self) -> crate::Result<android_activities::FoundframeRadicleClient> {
    use android_activities::FoundframeRadicleClient;

    // Initialize binder and get service
    rsbinder::ProcessState::init_default();

    let binder = rsbinder::hub::get_service("foundframe.radicle")
      .map_err(|e| crate::Error::Other(format!("Failed to get service: {:?}", e)))?
      .ok_or_else(|| crate::Error::Other("FoundframeRadicle service not running".to_string()))?;

    let client = android_activities::BpFoundframeRadicle::new(binder)
      .map_err(|e| crate::Error::Other(format!("Failed to create client: {:?}", e)))?;

    Ok(client)
  }
}

/// Ensure the FoundframeRadicle service is running (Android)
#[cfg(target_os = "android")]
fn ensure_service_running<R: Runtime>(_app: &AppHandle<R>) -> crate::Result<()> {
  use tracing::info;

  // Initialize rsbinder process state
  rsbinder::ProcessState::init_default();

  // Check if service is already running
  match rsbinder::hub::get_service("foundframe.radicle") {
    Ok(Some(_)) => {
      info!("FoundframeRadicle service already running");
      Ok(())
    }
    _ => {
      // Service not running - the Kotlin side needs to start it
      // We'll proceed and let the first service call fail gracefully
      // The MainActivity should have started the service
      info!("FoundframeRadicle service not yet running - will be started by Android side");
      Ok(())
    }
  }
}
