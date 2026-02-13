use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_internal_api);

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<InternalApi<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("ty.circulari.o19.ffi", "ApiPlugin")?;

  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_internal_api)?;

  Ok(InternalApi(handle))
}

pub struct InternalApi<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> InternalApi<R> {
  pub fn request_permissions(&self) -> crate::Result<NotificationPermissionStatus> {
    self
      .0
      .run_mobile_plugin("requestPermissions", ())
      .map_err(Into::into)
  }
}
