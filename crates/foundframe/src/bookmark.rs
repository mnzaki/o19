//! Bookmark operations for TheStream™
//!
//! Handles bookmark ingestions into the Personal Knowledge Base.

use crate::error::Result;
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Bookmark extension trait for TheStream
pub trait BookmarkStream {
  /// Add a bookmark to the PKB (convenience wrapper).
  fn add_bookmark(
    &self,
    url: impl Into<String>,
    title: Option<&str>,
    notes: Option<&str>,
  ) -> Result<StreamEntry>;
}

impl BookmarkStream for TheStream {
  fn add_bookmark(
    &self,
    url: impl Into<String>,
    title: Option<&str>,
    notes: Option<&str>,
  ) -> Result<StreamEntry> {
    let directory = DirectoryId::from("bookmarks");

    let data = serde_json::json!({
        "url": url.into(),
        "title": title,
        "notes": notes,
        "creation_context": {},
    });

    let chunk = crate::pkb::StreamChunk::StructuredData {
      db_type: "Bookmark".to_string(),
      data,
    };

    let filename = chunk.generate_filename(crate::pkb::now_timestamp(), title);
    let path = std::path::PathBuf::from(filename);

    self.add_chunk(directory, path, chunk)
  }
}
