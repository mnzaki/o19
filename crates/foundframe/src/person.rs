//! Person operations for TheStream™
//!
//! Handles person/contact ingestions into the Personal Knowledge Base.

use crate::error::Result;
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Person extension trait for TheStream
pub trait PersonStream {
  /// Add a person to the PKB (convenience wrapper).
  fn add_person(
    &self,
    display_name: impl Into<String>,
    handle: Option<&str>,
  ) -> Result<StreamEntry>;
}

impl PersonStream for TheStream {
  fn add_person(
    &self,
    display_name: impl Into<String>,
    handle: Option<&str>,
  ) -> Result<StreamEntry> {
    let directory = DirectoryId::from("people");

    let data = serde_json::json!({
        "display_name": display_name.into(),
        "handle": handle,
        "metadata": {},
    });

    let chunk = crate::pkb::StreamChunk::StructuredData {
      db_type: "Person".to_string(),
      data,
    };

    let filename = chunk.generate_filename(crate::pkb::now_timestamp(), None);
    let path = std::path::PathBuf::from(filename);

    self.add_chunk(directory, path, chunk)
  }
}
