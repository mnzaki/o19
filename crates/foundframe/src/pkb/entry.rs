//! Entry management for the PKB.
//!
//! Entries are the individual items stored in PKB directories.
//! They are stored as `.js.md` files - a hybrid format that is both
//! valid JSON and readable Markdown.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::Result;
use super::chunk::EntryId;

/// A PKB entry.
///
/// Entries are stored as `.js.md` files with a special format:
/// - First line: JSON metadata (with `__dbType` field)
/// - Remaining lines: Markdown content
///
/// This makes them both machine-readable (JSON) and human-readable (Markdown).
#[derive(Debug, Clone)]
pub struct Entry {
    /// Entry metadata.
    pub meta: EntryMeta,
    /// Entry content (Markdown).
    pub content: String,
}

/// Entry metadata stored in JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryMeta {
    /// Database type identifier.
    #[serde(rename = "__dbType")]
    pub db_type: String,
    /// Entry ID (BLAKE3 hash of content).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    /// Creation timestamp.
    pub created_at: u64,
    /// Last modified timestamp.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<u64>,
    /// Optional title.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Additional type-specific fields.
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

impl Entry {
    /// Create a new entry from a text note.
    pub fn from_text_note(content: String, title: Option<String>) -> Self {
        let meta = EntryMeta {
            db_type: "TextNote".into(),
            id: None,
            created_at: super::now_timestamp(),
            modified_at: None,
            title: title.clone(),
            extra: serde_json::Map::new(),
        };

        Self { meta, content }
    }

    /// Create a new entry from structured data.
    pub fn from_structured_data(db_type: String, data: serde_json::Value) -> Self {
        let mut extra = serde_json::Map::new();
        let content = if let serde_json::Value::Object(map) = data {
            // Extract known fields, put rest in extra
            let mut content_parts = Vec::new();
            for (key, value) in map {
                match key.as_str() {
                    "content" | "body" | "text" | "markdown" => {
                        if let serde_json::Value::String(text) = value {
                            content_parts.push(text);
                        }
                    }
                    _ => {
                        extra.insert(key, value);
                    }
                }
            }
            content_parts.join("\n\n")
        } else {
            String::new()
        };

        let meta = EntryMeta {
            db_type,
            id: None,
            created_at: super::now_timestamp(),
            modified_at: None,
            title: extra.get("title").and_then(|v| v.as_str()).map(String::from),
            extra,
        };

        Self { meta, content }
    }

    /// Serialize to .js.md format.
    ///
    /// Format:
    /// ```
    /// {"__dbType": "TextNote", "created_at": 1234567890}
    /// 
    /// # Title (if any)
    ///
    /// Content in Markdown format...
    /// ```
    pub fn to_js_md(&self) -> String {
        let mut output = String::new();

        // First line: JSON metadata
        let json = serde_json::to_string(&self.meta).unwrap_or_default();
        output.push_str(&json);
        output.push('\n');

        // Add title as heading if present
        if let Some(title) = &self.meta.title {
            output.push('\n');
            output.push_str("# ");
            output.push_str(title);
            output.push('\n');
        }

        // Content
        if !self.content.is_empty() {
            output.push('\n');
            output.push_str(&self.content);
        }

        output
    }

    /// Parse from .js.md format.
    pub fn from_js_md(content: &str) -> Result<Self> {
        let mut lines = content.lines();

        // First line should be JSON
        let first_line = lines.next().unwrap_or("{}");
        let meta: EntryMeta = serde_json::from_str(first_line)?;

        // Remaining lines are markdown content
        let body: String = lines.collect::<Vec<_>>().join("\n");

        // Remove leading newlines
        let body = body.trim_start().to_string();

        Ok(Self { meta, content: body })
    }

    /// Write to a file.
    pub fn write_to(&self, path: &Path) -> Result<()> {
        let content = self.to_js_md();
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Read from a file.
    pub fn read_from(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        Self::from_js_md(&content)
    }

    /// Get the entry ID (computed from content hash).
    pub fn compute_id(&self) -> EntryId {
        let content = self.to_js_md();
        let hash = blake3::hash(content.as_bytes());
        EntryId::new(hash.into())
    }
}

/// Parse a filename in the format `<timestamp> <title?>.<ext>`.
///
/// Returns (timestamp, optional_title).
pub fn parse_filename(filename: &str) -> Option<(u64, Option<String>)> {
    // Remove extension
    let name = filename.split('.').next()?;

    // Find first space (if any)
    match name.find(' ') {
        Some(pos) => {
            let timestamp: u64 = name[..pos].parse().ok()?;
            let title = if pos + 1 < name.len() {
                Some(name[pos + 1..].to_string())
            } else {
                None
            };
            Some((timestamp, title))
        }
        None => {
            let timestamp: u64 = name.parse().ok()?;
            Some((timestamp, None))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entry_js_md_roundtrip() {
        let entry = Entry::from_text_note(
            "This is my note content.\nWith multiple lines.".into(),
            Some("My Note".into()),
        );

        let serialized = entry.to_js_md();
        let parsed = Entry::from_js_md(&serialized).unwrap();

        assert_eq!(parsed.meta.db_type, "TextNote");
        assert_eq!(parsed.meta.title, Some("My Note".into()));
        assert!(parsed.content.contains("This is my note content"));
    }

    #[test]
    fn test_entry_structured_data() {
        let data = serde_json::json!({
            "title": "Test Entry",
            "content": "This is the content",
            "tags": ["test", "example"],
            "priority": 5
        });

        let entry = Entry::from_structured_data("CustomType".into(), data);

        assert_eq!(entry.meta.db_type, "CustomType");
        assert_eq!(entry.meta.title, Some("Test Entry".into()));
        assert_eq!(entry.content, "This is the content");
        assert!(entry.meta.extra.contains_key("tags"));
        assert!(entry.meta.extra.contains_key("priority"));
    }

    #[test]
    fn test_parse_filename() {
        assert_eq!(
            parse_filename("1234567890.js.md"),
            Some((1234567890, None))
        );
        assert_eq!(
            parse_filename("1234567890 My Note.js.md"),
            Some((1234567890, Some("My Note".into())))
        );
        assert_eq!(
            parse_filename("1234567890.mln"),
            Some((1234567890, None))
        );
        assert_eq!(parse_filename("invalid.js.md"), None);
    }
}
