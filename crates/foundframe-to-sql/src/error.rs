//! Error types for foundframe-to-sql.

use thiserror::Error;

/// Result type alias.
pub type Result<T> = std::result::Result<T, Error>;

/// Error types.
#[derive(Error, Debug)]
pub enum Error {
    /// SQLite error.
    #[error("SQLite error: {0}")]
    Sqlite(#[from] sqlite::Error),

    /// No rows returned.
    #[error("No rows returned")]
    NoRows,

    /// Serialization error.
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Other error.
    #[error("{0}")]
    Other(String),
}

impl From<String> for Error {
    fn from(s: String) -> Self {
        Error::Other(s)
    }
}

impl From<&str> for Error {
    fn from(s: &str) -> Self {
        Error::Other(s.to_string())
    }
}
