//! Bookmark operations for TheStream™
//!
//! Handles bookmark ingestions into the Personal Knowledge Base.

use std::path::Path;

use crate::error::{Error, Result};
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Bookmark data structure.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BookmarkData {
  pub url: String,
  pub title: Option<String>,
  pub notes: Option<String>,
  #[serde(flatten)]
  pub extra: serde_json::Map<String, serde_json::Value>,
}

/// Bookmark extension trait for TheStream
pub trait BookmarkStream {
  /// Add a bookmark to the PKB (convenience wrapper).
  fn add_bookmark(
    &self,
    url: impl Into<String>,
    title: Option<&str>,
    notes: Option<&str>,
  ) -> Result<StreamEntry>;

  /// Get a bookmark by its URL.
  ///
  /// Searches the bookmarks directory for an entry with matching URL.
  fn get_bookmark_by_url(&self, url: &str) -> Result<Option<(StreamEntry, BookmarkData)>>;

  /// List all bookmarks in the bookmarks directory.
  ///
  /// Returns a list of (stream_entry, bookmark_data) tuples.
  fn list_bookmarks(&self, directory: Option<&str>) -> Result<Vec<(StreamEntry, BookmarkData)>>;

  /// Delete (soft-delete) a bookmark by its URL.
  ///
  /// Marks the bookmark as deleted without removing it from the PKB.
  fn delete_bookmark(&self, url: &str) -> Result<bool>;
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

  fn get_bookmark_by_url(&self, url: &str) -> Result<Option<(StreamEntry, BookmarkData)>> {
    let dir_name = "bookmarks";
    
    // Get the directory path
    let dir = self.pkb.get_directory(dir_name)?
      .ok_or_else(|| Error::Other("Bookmarks directory not found".into()))?;

    // Scan directory for bookmark files
    for entry in std::fs::read_dir(&dir.path)? {
      let entry = entry?;
      let path = entry.path();
      
      if path.extension().and_then(|s| s.to_str()) != Some("md") {
        continue;
      }

      // Try to read and parse the entry
      if let Ok(content) = std::fs::read_to_string(&path) {
        if let Some((stream_entry, bookmark_data)) = parse_bookmark_entry(self, &path, &content)? {
          if bookmark_data.url == url {
            return Ok(Some((stream_entry, bookmark_data)));
          }
        }
      }
    }

    Ok(None)
  }

  fn list_bookmarks(&self, _directory: Option<&str>) -> Result<Vec<(StreamEntry, BookmarkData)>> {
    let dir_name = "bookmarks";
    let mut bookmarks = Vec::new();

    // Get the directory
    let dir = match self.pkb.get_directory(dir_name)? {
      Some(d) => d,
      None => return Ok(Vec::new()), // Empty if directory doesn't exist
    };

    // Scan directory for bookmark files
    for entry in std::fs::read_dir(&dir.path)? {
      let entry = entry?;
      let path = entry.path();
      
      if path.extension().and_then(|s| s.to_str()) != Some("md") {
        continue;
      }

      // Try to read and parse the entry
      if let Ok(content) = std::fs::read_to_string(&path) {
        if let Some((stream_entry, bookmark_data)) = parse_bookmark_entry(self, &path, &content)? {
          bookmarks.push((stream_entry, bookmark_data));
        }
      }
    }

    Ok(bookmarks)
  }

  fn delete_bookmark(&self, url: &str) -> Result<bool> {
    let dir_name = "bookmarks";

    // Get the directory
    let dir = match self.pkb.get_directory(dir_name)? {
      Some(d) => d,
      None => return Ok(false),
    };

    // Find the bookmark by URL
    for entry in std::fs::read_dir(&dir.path)? {
      let entry = entry?;
      let path = entry.path();
      
      if path.extension().and_then(|s| s.to_str()) != Some("md") {
        continue;
      }

      if let Ok(content) = std::fs::read_to_string(&path) {
        if let Some((_, bookmark_data)) = parse_bookmark_entry(self, &path, &content)? {
          if bookmark_data.url == url {
            // Soft delete: rename to .deleted.js.md
            let filename = path.file_stem()
              .and_then(|s| s.to_str())
              .ok_or_else(|| Error::Other("Invalid filename".into()))?;
            
            // Remove .js extension if present
            let base_name = filename.strip_suffix(".js").unwrap_or(filename);
            let deleted_path = dir.path.join(format!("{}.deleted.js.md", base_name));
            
            std::fs::rename(&path, deleted_path)?;
            return Ok(true);
          }
        }
      }
    }

    Ok(false)
  }
}

/// Parse a bookmark entry from file content.
fn parse_bookmark_entry(
  _stream: &TheStream,
  path: &Path,
  content: &str,
) -> Result<Option<(StreamEntry, BookmarkData)>> {
  // Parse the .js.md format: first line is JSON metadata
  let mut lines = content.lines();
  let first_line = lines.next()
    .ok_or_else(|| Error::Other("Empty file".into()))?;
  
  // Parse metadata
  let meta: serde_json::Value = match serde_json::from_str(first_line) {
    Ok(m) => m,
    Err(_) => return Ok(None), // Not a valid entry
  };

  // Check if it's a bookmark
  let db_type = meta.get("__dbType")
    .and_then(|v| v.as_str())
    .unwrap_or("");
  
  if db_type != "Bookmark" {
    return Ok(None);
  }

  // Extract bookmark data from metadata
  let url = meta.get("url")
    .and_then(|v| v.as_str())
    .ok_or_else(|| Error::Other("Bookmark missing URL".into()))?;

  let title = meta.get("title").and_then(|v| v.as_str()).map(String::from);
  let notes = meta.get("notes").and_then(|v| v.as_str()).map(String::from);

  let bookmark_data = BookmarkData {
    url: url.to_string(),
    title,
    notes,
    extra: serde_json::Map::new(),
  };

  // Build StreamEntry
  let path_str = path.to_string_lossy();
  let reference = format!("pkb://{}", path_str); // Simplified URL
  
  let stream_entry = StreamEntry {
    id: None, // Would need to extract from filename
    seen_at: crate::pkb::now_timestamp() * 1000,
    commit_hash: "unknown".into(), // Would need git info
    reference,
    summary: None,
  };

  Ok(Some((stream_entry, bookmark_data)))
}
