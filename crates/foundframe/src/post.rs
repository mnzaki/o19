//! Post operations for TheStream™
//!
//! Handles post ingestions into the Personal Knowledge Base.

use crate::db::PostFilter;
use crate::error::{Error, Result};
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Post extension trait for TheStream
pub trait PostStream {
  /// Add a post to the PKB (convenience wrapper).
  ///
  /// Posts go to the "posts" directory by default.
  fn add_post(&self, content: impl Into<String>, title: Option<&str>) -> Result<StreamEntry>;

  /// List posts from the database with optional filtering.
  ///
  /// Requires database indexing to be enabled.
  async fn list_posts_filtered(
    &self,
    limit: Option<usize>,
    offset: Option<usize>,
    filter: PostFilter,
  ) -> Result<Vec<crate::db::PostData>>;
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

    let data = crate::pkb::StructuredData::new("Post", data);

    let filename = data.generate_filename(crate::pkb::now_timestamp(), title);
    let path = std::path::PathBuf::from(filename);

    self.add_entry(directory, path, data)
  }

  async fn list_posts_filtered(
    &self,
    limit: Option<usize>,
    offset: Option<usize>,
    filter: PostFilter,
  ) -> Result<Vec<crate::db::PostData>> {
    let db = self.db.as_ref()
      .ok_or_else(|| Error::Other("Database not available".into()))?;
    
    db.list_posts(limit, offset, filter).await
      .map_err(|e| Error::Other(format!("Database error: {}", e)))
  }
}
