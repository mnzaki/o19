pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
  #[error("Hex decoding error: {0}")]
  BadHex(#[from] hex::FromHexError),

  #[error("Sync error: {0}")]
  Sync(String),

  #[error("IO error: {0}")]
  Io(#[from] std::io::Error),

  #[error("HTTP request failed: {0}")]
  Reqwest(#[from] reqwest::Error),

  #[error("SQLite error: {0}")]
  Sqlite(String),

  #[error("Image processing error: {0}")]
  Image(String),

  #[error("Failed to fetch page: {0}")]
  Fetch(String),

  #[error("Failed to parse response: {0}")]
  Parse(String),

  #[error("Failed to download media: {0}")]
  Download(String),

  #[error("Failed to create directory: {0}")]
  CreateDir(String),

  #[error("Failed to process media: {0}")]
  MediaProcessing(String),

  #[error("Invalid URL: {0}")]
  InvalidUrl(String),

  #[error("Database connection failed: {0}")]
  DatabaseConnection(String),

  #[error("Query failed: {0}")]
  QueryFailed(String),

  #[error("Path resolution failed: {0}")]
  PathResolution(String),

  #[error("Radicle node runtime error: {0}")]
  Runtime(String),

  #[error("{0}")]
  Other(String),
}

impl From<image::ImageError> for Error {
  fn from(e: image::ImageError) -> Self {
    Error::Image(e.to_string())
  }
}

impl From<sqlite::Error> for Error {
  fn from(e: sqlite::Error) -> Self {
    Error::Sqlite(e.to_string())
  }
}

impl From<radicle_node::runtime::Error> for Error {
  fn from(e: radicle_node::runtime::Error) -> Self {
    Error::Runtime(e.to_string())
  }
}

impl From<radicle::storage::Error> for Error {
  fn from(e: radicle::storage::Error) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::profile::Error> for Error {
  fn from(e: radicle::profile::Error) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::node::Error> for Error {
  fn from(e: radicle::node::Error) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<serde_json::Error> for Error {
  fn from(e: serde_json::Error) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::identity::project::ProjectError> for Error {
  fn from(e: radicle::identity::project::ProjectError) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::git::raw::Error> for Error {
  fn from(e: radicle::git::raw::Error) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::storage::RepositoryError> for Error {
  fn from(e: radicle::storage::RepositoryError) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::profile::config::LoadError> for Error {
  fn from(e: radicle::profile::config::LoadError) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle_node::fingerprint::Error> for Error {
  fn from(e: radicle_node::fingerprint::Error) -> Self {
    Error::Other(e.to_string())
  }
}

impl From<radicle::node::policy::config::Error> for Error {
  fn from(e: radicle::node::policy::config::Error) -> Self {
    Error::Other(e.to_string())
  }
}
