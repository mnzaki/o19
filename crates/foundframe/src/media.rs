//! Media operations for TheStream™
//!
//! Handles media links and file ingestions into the Personal Knowledge Base.

use std::path::PathBuf;

use crate::error::Result;
use crate::pkb::{DirectoryId, StreamChunk};
use crate::thestream::{StreamEntry, TheStream};

/// Media extension trait for TheStream
pub trait MediaStream {
  /// Add a media link to the PKB.
  ///
  /// # Arguments
  /// * `directory` - Which directory (e.g., "screenshots", "memes")
  /// * `subpath` - Optional subdirectory path
  /// * `url` - The media URL
  /// * `title` - Optional title/description
  /// * `mime_type` - Optional MIME type hint
  fn add_media_link(
    &self,
    directory: DirectoryId,
    subpath: Option<&str>,
    url: impl Into<String>,
    title: Option<&str>,
    mime_type: Option<&str>,
  ) -> Result<StreamEntry>;

  /// Add a media entry to the PKB (convenience wrapper).
  ///
  /// This creates both a media file AND a media link entry.
  fn add_media(&self, file_path: &std::path::Path, title: Option<&str>) -> Result<StreamEntry>;
}

impl MediaStream for TheStream {
  fn add_media_link(
    &self,
    directory: DirectoryId,
    subpath: Option<&str>,
    url: impl Into<String>,
    title: Option<&str>,
    mime_type: Option<&str>,
  ) -> Result<StreamEntry> {
    let chunk = StreamChunk::MediaLink {
      url: url.into(),
      mime_type: mime_type.map(|s| s.to_string()),
      title: title.map(|s| s.to_string()),
    };

    let filename = chunk.generate_filename(crate::pkb::now_timestamp(), title);

    let path = match subpath {
      Some(sub) => PathBuf::from(sub).join(filename),
      None => PathBuf::from(filename),
    };

    self.add_chunk(directory, path, chunk)
  }

  fn add_media(&self, file_path: &std::path::Path, title: Option<&str>) -> Result<StreamEntry> {
    // TODO: Copy file to media directory, generate content hash
    // For now, just create a media link
    let directory = DirectoryId::from("media");
    let url = format!("file://{}", file_path.display());

    self.add_media_link(directory, None, url, title, None)
  }
}
