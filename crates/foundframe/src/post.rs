//! Post operations for TheStream™
//!
//! Handles post ingestions into the Personal Knowledge Base.

use crate::error::Result;
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Post extension trait for TheStream
pub trait PostStream {
  /// Add a post to the PKB (convenience wrapper).
  ///
  /// Posts go to the "posts" directory by default.
  fn add_post(&self, content: impl Into<String>, title: Option<&str>) -> Result<StreamEntry>;
}

impl PostStream for TheStream {
  fn add_post(&self, content: impl Into<String>, title: Option<&str>) -> Result<StreamEntry> {
    // TODO: Get the posts directory ID
    // For now, use a default
    let directory = DirectoryId::from("posts");

    let content = content.into();
    let data = serde_json::json!({
        "bits": [{"type": "text", "content": content}],
        "links": [],
    });

    let chunk = crate::pkb::StreamChunk::StructuredData {
      db_type: "Post".to_string(),
      data,
    };

    let filename = chunk.generate_filename(crate::pkb::now_timestamp(), title);
    let path = std::path::PathBuf::from(filename);

    self.add_chunk(directory, path, chunk)
  }
}
