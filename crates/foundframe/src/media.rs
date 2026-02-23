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

// ============================================================================
// Media Source Module (Polling-based ingestion)
// ============================================================================

pub mod source;

// Re-export main types
pub use source::{MediaSourceRegistry, PullConfig, PushConfig, MediaItem, MediaLocation};

/// Handle to the media service thread.
///
/// The media service runs in its own thread to isolate resource usage
/// (file system scanning, network requests) from the main application.
/// This handle allows controlled shutdown and health monitoring.
pub struct MediaServiceHandle {
    /// Thread handle for joining on shutdown
    pub thread: std::thread::JoinHandle<()>,
    /// Cancellation token for graceful shutdown
    pub cancel: tokio_util::sync::CancellationToken,
    /// Channel for sending commands to the service
    pub command_tx: tokio::sync::mpsc::UnboundedSender<MediaServiceCommand>,
}

/// Commands that can be sent to the media service
pub enum MediaServiceCommand {
    /// Register a new pull source
    RegisterPull { url: String, config: PullConfig },
    /// Register a new push source
    RegisterPush { url: String, config: PushConfig },
    /// Unregister a source by ID
    Unregister { source_id: i64 },
    /// Trigger manual poll
    PollNow { source_id: i64 },
    /// Get health status (response sent back via oneshot)
    GetHealth { respond: tokio::sync::oneshot::Sender<Vec<source::SourceHealthEntry>> },
    /// Graceful shutdown
    Shutdown,
}

impl MediaServiceHandle {
    /// Send a command to the media service
    pub fn send(&self, cmd: MediaServiceCommand) -> std::result::Result<(), String> {
        self.command_tx.send(cmd).map_err(|_| "Media service stopped".to_string())
    }
    
    /// Request graceful shutdown
    pub fn shutdown(self) {
        let _ = self.send(MediaServiceCommand::Shutdown);
        self.cancel.cancel();
        // Don't wait for thread here - let caller decide
    }
}
