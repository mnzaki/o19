//! Stream data ingestion for the PKB.
//!
//! StructuredData is the fundamental unit of content in Circulari.ty.
//! It is ingested into PKB directories as files.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::Result;

/// Unique identifier for a stream entry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EntryId(pub [u8; 32]); // BLAKE3 hash

impl EntryId {
  /// Create a new EntryId from a byte array.
  pub fn new(bytes: [u8; 32]) -> Self {
    Self(bytes)
  }
}

/// A single "bit" of content in a post.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccumulableBit {
  pub r#type: String,
  pub content: String,
  pub metadata: Option<serde_json::Value>,
}

/// A Xanadu-style link between posts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XanaduLink {
  pub source_post_id: i64,
  pub target_post_id: i64,
  pub link_type: String,
  pub anchor_text: Option<String>,
}

/// Structured data - the unified content type for all data in Circulari.ty.
///
/// Previously this was part of a StreamChunk enum, but we've simplified
/// to just use structured data with a data_type discriminator.
///
/// Special data_types:
/// - "Media": Stored as .mln file (plain text URI)
/// - Everything else: Stored as .js.md file (JSON frontmatter + markdown)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredData {
  /// Data type (e.g., "Media", "Bookmark", "Person", "Conversation", "Post").
  pub data_type: String,
  /// The data as JSON.
  pub data: serde_json::Value,
}

impl StructuredData {
  /// Create new structured data.
  pub fn new(data_type: impl Into<String>, data: serde_json::Value) -> Self {
    Self {
      data_type: data_type.into(),
      data,
    }
  }

  /// Create a media entry.
  /// Stored as .mln file (just the URI as plain text).
  pub fn media(uri: impl Into<String>, mime_type: Option<String>, title: Option<String>) -> Self {
    let mut data = serde_json::json!({
      "uri": uri.into(),
    });
    if let Some(mt) = mime_type {
      data["mimeType"] = serde_json::json!(mt);
    }
    if let Some(t) = title {
      data["title"] = serde_json::json!(t);
    }
    Self::new("Media", data)
  }

  /// Create a bookmark entry.
  pub fn bookmark(uri: impl Into<String>, title: Option<String>, notes: Option<String>) -> Self {
    let mut data = serde_json::json!({
      "uri": uri.into(),
    });
    if let Some(t) = title {
      data["title"] = serde_json::json!(t);
    }
    if let Some(n) = notes {
      data["notes"] = serde_json::json!(n);
    }
    Self::new("Bookmark", data)
  }

  /// Create a post entry.
  pub fn post(content: impl Into<String>, title: Option<String>) -> Self {
    let mut bits = vec![serde_json::json!({
      "type": "text",
      "content": content.into(),
    })];
    
    // If there's a title, add it as a title bit at the beginning
    if let Some(t) = title {
      bits.insert(0, serde_json::json!({
        "type": "title",
        "content": t,
      }));
    }
    
    let data = serde_json::json!({
      "bits": bits,
      "links": [],
    });
    
    Self::new("Post", data)
  }

  /// Create a person entry.
  pub fn person(display_name: impl Into<String>, handle: Option<String>) -> Self {
    let mut data = serde_json::json!({
      "displayName": display_name.into(),
    });
    if let Some(h) = handle {
      data["handle"] = serde_json::json!(h);
    }
    Self::new("Person", data)
  }

  /// Create a conversation entry.
  pub fn conversation(content: impl Into<String>, attributed_to: impl Into<String>) -> Self {
    Self::new("Conversation", serde_json::json!({
      "content": content.into(),
      "attributedTo": attributed_to.into(),
    }))
  }

  /// Get the file extension for this data type.
  ///
  /// - Media → "mln" (plain text URI)
  /// - Everything else → "js.md" (JSON frontmatter + markdown)
  pub fn file_extension(&self) -> &'static str {
    match self.data_type.as_str() {
      "Media" => "mln",
      _ => "js.md",
    }
  }

  /// Generate a filename for this data.
  ///
  /// Format: `<timestamp> <title?>.<ext>`
  /// If no title, just `<timestamp>.<ext>`
  pub fn generate_filename(&self, timestamp: u64, title: Option<&str>) -> String {
    let ext = self.file_extension();

    match title {
      Some(t) if !t.is_empty() => {
        // Sanitize title for filesystem
        let sanitized = sanitize_filename(t);
        format!("{} {}.{}", timestamp, sanitized, ext)
      }
      _ => format!("{}.{}", timestamp, ext),
    }
  }

  /// Parse structured data from file content.
  pub fn from_file_content(content: &str, extension: &str) -> Result<Self> {
    match extension {
      "mln" => {
        // Media link file - just a URI
        let uri = content.trim().to_string();
        Ok(Self::media(uri, None, None))
      }
      "js.md" => {
        // JSON frontmatter + markdown
        // Parse the JSON frontmatter (between --- markers)
        let json_start = content.find("---").map(|i| i + 3);
        let json_end = json_start
          .and_then(|start| content[start..].find("---"))
          .map(|i| i + json_start.unwrap());
        
        if let (Some(start), Some(end)) = (json_start, json_end) {
          let json_str = &content[start..end].trim();
          let data: serde_json::Value = serde_json::from_str(json_str)?;
          
          // Extract data_type from the data or infer from content
          let data_type = data.get("dataType")
            .or_else(|| data.get("data_type"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
          
          Ok(Self { data_type, data })
        } else {
          // Try parsing the whole thing as JSON
          let data: serde_json::Value = serde_json::from_str(content)?;
          let data_type = data.get("dataType")
            .or_else(|| data.get("data_type"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
          Ok(Self { data_type, data })
        }
      }
      _ => Err(crate::error::Error::Other(format!(
        "Unknown file extension: {}",
        extension
      ))),
    }
  }

  /// Ingest the data to a directory at the given path.
  ///
  /// Creates the parent directories if they don't exist.
  pub fn ingest(&self, dir_path: &Path, relative_path: &Path) -> Result<EntryId> {
    let full_path = dir_path.join(relative_path);

    // Create parent directories
    if let Some(parent) = full_path.parent() {
      std::fs::create_dir_all(parent)?;
    }

    // Write content based on type
    match self.data_type.as_str() {
      "Media" => {
        // Media is stored as .mln file (plain text URI)
        if let Some(uri) = self.data["uri"].as_str() {
          std::fs::write(&full_path, uri)?;
        } else {
          return Err(crate::error::Error::Other(
            "Media data missing 'uri' field".to_string()
          ));
        }
      }
      _ => {
        // All other types use Entry format
        let entry = super::entry::Entry::from_structured_data(
          self.data_type.clone(),
          self.data.clone()
        );
        entry.write_to(&full_path)?;
      }
    }

    // Generate entry ID from content hash
    let content = std::fs::read(&full_path)?;
    let hash = blake3::hash(&content);
    Ok(EntryId::new(hash.into()))
  }

  /// Detect the data type from a file path.
  pub fn detect_from_path(path: &Path) -> Option<Self> {
    match path.extension()?.to_str()? {
      "mln" => Some(StructuredData::new("Media", serde_json::json!({"uri": ""}))),
      "md" | "js" | "js.md" => Some(StructuredData::new("Post", serde_json::json!({"content": ""}))),
      _ => None,
    }
  }

  /// Get a field from the data.
  pub fn get(&self, key: &str) -> Option<&serde_json::Value> {
    self.data.get(key)
  }

  /// Get a string field.
  pub fn get_string(&self, key: &str) -> Option<String> {
    self.data.get(key).and_then(|v| v.as_str()).map(String::from)
  }
}

/// Sanitize a string for use as a filename.
pub fn sanitize_filename(name: &str) -> String {
  name
    .replace(|c: char| !c.is_alphanumeric() && c != ' ', "_")
    .replace(' ', "_")
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_media_filename() {
    let media = StructuredData::media("https://example.com/image.png", None, Some("My Image"));
    let filename = media.generate_filename(1234567890, Some("My Image"));
    assert!(filename.starts_with("1234567890 "));
    assert!(filename.ends_with(".mln"));
  }

  #[test]
  fn test_bookmark_data() {
    let bookmark = StructuredData::bookmark("https://example.com", Some("Example"), None);
    assert_eq!(bookmark.data_type, "Bookmark");
    assert_eq!(bookmark.data["uri"], "https://example.com");
    assert_eq!(bookmark.data["title"], "Example");
  }
}
