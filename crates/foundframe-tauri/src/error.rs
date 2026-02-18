use caesium::error::CaesiumError;
use serde::{Serialize, ser::Serializer};
use std::path::PathBuf;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
  #[error(transparent)]
  Json(#[from] serde_json::Error),

  #[error(transparent)]
  Tauri(#[from] tauri::Error),

  #[error(transparent)]
  Io(#[from] std::io::Error),

  #[error("forbidden path: {0}")]
  PathForbidden(PathBuf),

  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  #[error(transparent)]
  Reqwest(#[from] reqwest::Error),

  #[cfg(any(target_os = "android", target_os = "ios"))]
  #[error(transparent)]
  PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),

  #[error("URL is not a valid path")]
  InvalidPathUrl,

  #[error("Unsafe PathBuf: {0}")]
  UnsafePathBuf(&'static str),

  #[error("an error occurred while refreshing the token")]
  RefreshTokenError(),

  #[error(transparent)]
  Caesium(#[from] CaesiumError),

  #[error("Core error: {0}")]
  Core(#[from] o19_foundframe::Error),

  #[error("Database error: {0}")]
  Database(#[from] foundframe_to_sql::error::Error),

  #[error("SQL error: {0}")]
  Sql(String),

  #[error("{0}")]
  Other(String),
}

impl From<sqlite::Error> for Error {
  fn from(e: sqlite::Error) -> Self {
    Error::Sql(e.to_string())
  }
}

impl Serialize for Error {
  fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}
