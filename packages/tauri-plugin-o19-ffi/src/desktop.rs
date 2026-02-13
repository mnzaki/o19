use std::{path::PathBuf};

use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime, Manager};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<InternalApi<R>> {
  Ok(InternalApi(app.clone()))
}

pub struct InternalApi<R: Runtime>(AppHandle<R>);
impl<R: Runtime> InternalApi<R> {
  fn data_dir(&self) -> PathBuf {
    self.0.path().app_local_data_dir().unwrap()
  }

  fn get_preferences(&self) -> crate::Result<Preferences> {
    let preferences_file_path = self.data_dir().join("preferences.json");
    let preferences = std::fs::read_to_string(preferences_file_path).map_err(crate::Error::Io)?;
    serde_json::from_str(&preferences).map_err(Into::into)
  }

  fn set_preferences(&self, preferences: Preferences) -> crate::Result<()> {
    let preferences_file_path = self.data_dir().join("preferences.json");

    if let Some(parent) = preferences_file_path.parent() {
      std::fs::create_dir_all(parent)?;
    }

    std::fs::write(
      preferences_file_path,
      serde_json::to_string(&preferences).unwrap(),
    )
    .map_err(Into::into)
  }

  pub fn request_permissions(&self) -> crate::Result<NotificationPermissionStatus> {
    Ok(NotificationPermissionStatus {
      status: "granted".into(),
    })
  }
}
