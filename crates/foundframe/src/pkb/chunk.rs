//! StreamChunk ingestion for the PKB.
//!
//! StreamChunks are the fundamental unit of content in Circulari.ty.
//! They are ingested into PKB directories as files.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::Result;

/// Unique identifier for a chunk.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ChunkId(pub [u8; 32]); // BLAKE3 hash

impl ChunkId {
    /// Create a new ChunkId from a byte array.
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}

/// Unique identifier for an entry (derived from chunk).
pub type EntryId = ChunkId;

/// A media link file (.mln).
///
/// MLN files are super simple text files containing just a URL.
/// They are designed to be readable across all UIs, including
/// when opened as plain text by non-technical users.
#[derive(Debug, Clone)]
pub struct MediaLink {
    /// The URL to the media.
    pub url: String,
}

impl MediaLink {
    /// Create a new media link.
    pub fn new(url: impl Into<String>) -> Self {
        Self { url: url.into() }
    }

    /// Serialize to file content (just the URL as plain text).
    pub fn to_content(&self) -> String {
        self.url.clone()
    }

    /// Parse from file content.
    pub fn from_content(content: &str) -> Self {
        Self {
            url: content.trim().to_string(),
        }
    }

    /// Write to a file.
    pub fn write_to(&self, path: &Path) -> Result<()> {
        std::fs::write(path, self.to_content())?;
        Ok(())
    }

    /// Read from a file.
    pub fn read_from(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        Ok(Self::from_content(&content))
    }
}

/// Types of StreamChunks that can be ingested.
#[derive(Debug, Clone)]
pub enum StreamChunk {
    /// Media link - stored as .mln file.
    MediaLink {
        /// URL to the media.
        url: String,
        /// Optional MIME type hint.
        mime_type: Option<String>,
        /// Optional title/description.
        title: Option<String>,
    },
    /// Text note - stored as .js.md file.
    TextNote {
        /// The note content.
        content: String,
        /// Optional title.
        title: Option<String>,
    },
    /// Structured data - stored as .js.md file.
    StructuredData {
        /// Database type (e.g., "StreamChunk", "Entry", "PomodoroSession").
        db_type: String,
        /// The data as JSON.
        data: serde_json::Value,
    },
}

impl StreamChunk {
    /// Determine the file extension for this chunk type.
    pub fn file_extension(&self) -> &'static str {
        match self {
            StreamChunk::MediaLink { .. } => "mln",
            StreamChunk::TextNote { .. } | StreamChunk::StructuredData { .. } => "js.md",
        }
    }

    /// Generate a filename for this chunk.
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

    /// Ingest the chunk to a directory at the given path.
    ///
    /// Creates the parent directories if they don't exist.
    pub fn ingest(&self, dir_path: &Path, relative_path: &Path) -> Result<EntryId> {
        let full_path = dir_path.join(relative_path);
        
        // Create parent directories
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Write content based on type
        match self {
            StreamChunk::MediaLink { url, .. } => {
                let link = MediaLink::new(url.clone());
                link.write_to(&full_path)?;
            }
            StreamChunk::TextNote { content, title } => {
                let entry = super::entry::Entry::from_text_note(
                    content.clone(),
                    title.clone(),
                );
                entry.write_to(&full_path)?;
            }
            StreamChunk::StructuredData { db_type, data } => {
                let entry = super::entry::Entry::from_structured_data(
                    db_type.clone(),
                    data.clone(),
                );
                entry.write_to(&full_path)?;
            }
        }

        // Generate entry ID from content hash
        let content = std::fs::read(&full_path)?;
        let hash = blake3::hash(&content);
        Ok(EntryId::new(hash.into()))
    }

    /// Detect the chunk type from a file path.
    pub fn detect_from_path(path: &Path) -> Option<Self> {
        match path.extension()?.to_str()? {
            "mln" => Some(StreamChunk::MediaLink {
                url: String::new(),
                mime_type: None,
                title: None,
            }),
            "md" | "js" | "js.md" => Some(StreamChunk::TextNote {
                content: String::new(),
                title: None,
            }),
            _ => None,
        }
    }
}

/// Sanitize a string for use as a filename.
///
/// Removes or replaces filesystem-unsafe characters.
fn sanitize_filename(name: &str) -> String {
    let unsafe_chars: &[char] = &['/', '\\', '<', '>', ':', '"', '|', '?', '*'];
    
    name.chars()
        .map(|c| if unsafe_chars.contains(&c) { '_' } else { c })
        .take(100) // Limit length
        .collect()
}

/// Heuristics for guessing which directory a chunk should go to.
///
/// These are suggestions only - the user must confirm before ingestion.
/// Philosophy: "never force, only guide"
pub mod heuristics {
    use super::*;

    /// Guess the appropriate directory for a chunk.
    ///
    /// Returns a list of (directory_name, confidence_score) tuples,
    /// sorted by confidence (highest first).
    pub fn guess_directory(chunk: &StreamChunk) -> Vec<(&'static str, f32)> {
        let mut guesses = Vec::new();

        match chunk {
            StreamChunk::MediaLink { mime_type, .. } => {
                if let Some(mime) = mime_type {
                    if mime.starts_with("image/") {
                        guesses.push(("screenshots", 0.9));
                        guesses.push(("memes", 0.7));
                    } else if mime.starts_with("video/") {
                        guesses.push(("screenrecs", 0.9));
                    } else if mime.starts_with("audio/") {
                        guesses.push(("music", 0.9));
                    }
                }
            }
            StreamChunk::TextNote { .. } => {
                guesses.push(("notes", 0.8));
                guesses.push(("diary", 0.5));
            }
            StreamChunk::StructuredData { db_type, .. } => {
                match db_type.as_str() {
                    "PomodoroSession" => guesses.push(("pomodoro", 1.0)),
                    "StreamChunk" => guesses.push(("archive", 0.6)),
                    _ => guesses.push(("notes", 0.5)),
                }
            }
        }

        // Sort by confidence (highest first)
        guesses.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        guesses
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_media_link() {
        let link = MediaLink::new("https://example.com/image.png");
        assert_eq!(link.to_content(), "https://example.com/image.png");

        let parsed = MediaLink::from_content("  https://example.com/image.png  \n");
        assert_eq!(parsed.url, "https://example.com/image.png");
    }

    #[test]
    fn test_chunk_filename() {
        let chunk = StreamChunk::MediaLink {
            url: "http://x".into(),
            mime_type: None,
            title: Some("My Photo".into()),
        };
        assert_eq!(chunk.generate_filename(1234567890, Some("My Photo")), "1234567890 My Photo.mln");

        let chunk2 = StreamChunk::TextNote {
            content: "hello".into(),
            title: None,
        };
        assert_eq!(chunk2.generate_filename(1234567890, None), "1234567890.js.md");
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("hello/world"), "hello_world");
        assert_eq!(sanitize_filename("file:name"), "file_name");
        assert_eq!(sanitize_filename("normal name"), "normal name");
    }

    #[test]
    fn test_heuristics_guess() {
        let media = StreamChunk::MediaLink {
            url: "x".into(),
            mime_type: Some("image/png".into()),
            title: None,
        };
        let guesses = heuristics::guess_directory(&media);
        assert_eq!(guesses[0].0, "screenshots");

        let pomodoro = StreamChunk::StructuredData {
            db_type: "PomodoroSession".into(),
            data: serde_json::json!({}),
        };
        let guesses = heuristics::guess_directory(&pomodoro);
        assert_eq!(guesses[0].0, "pomodoro");
        assert_eq!(guesses[0].1, 1.0);
    }
}
