//! TheStream™ - Temporal experience orchestration.
//!
//! TheStream™ is the orchestration layer that mediates between raw PKB (git files)
//! and the database view. It converts PKB events into StreamChunk events,
//! maintains the stream of experience, and provides the domain API for
//! adding content to the Personal Knowledge Base.
//!
//! # Architecture
//!
//! ```
//! PKB (git repos)
//!     ↓ (emits PkbEvent)
//! TheStream (converts to StreamChunks, emits TheStreamEvent)
//!     ↓ (emits TheStreamEvent)
//! Database (SQLite ViewModel)
//! ```
//!
//! # The Rhythm
//!
//! TheStream™ embodies the O-O-F rhythm (observe twice, react once):
//! - Files exist in PKB first (observation)
//! - TheStream™ witnesses them (observation)
//! - Database reflects the experience (reaction)
//!
//! But variance is encoded: some identities may use O-F-F or other patterns.
//!
//! # Extension Methods
//!
//! Additional TheStream methods are implemented in other modules:
//! - [`BookmarkStream`](crate::bookmark::BookmarkStream) - `add_bookmark()` and related bookmark operations
//!   (see `src/bookmark.rs` for the trait implementation)

use std::path::PathBuf;

use emoji_from_entropy::EmojiIdentity;
use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::pkb::{DirectoryId, EntryId, PkbService, StreamChunk};
use crate::signal::{EventBus, PkbEvent};

/// PKB URL type alias for convenience.
pub type PkbUrl = String;

/// A record in TheStream™ - represents "I saw this thing at this time".
///
/// This maps directly to a row in the `thestream` database table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEntry {
  /// Database ID (None if not yet persisted).
  pub id: Option<i64>,

  /// When *I* first encountered this (milliseconds since epoch).
  pub seen_at: u64,

  /// Git commit hash when this was recorded.
  pub commit_hash: String,

  /// Reference to the actual content.
  /// Format: `pkb://{identity}/{repo}/{path}?v={commit}`
  pub reference: String,

  /// Optional inline summary for quick display.
  pub summary: Option<StreamSummary>,
}

/// Quick summary for displaying stream entries without fetching full content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamSummary {
  /// Title for display.
  pub title: String,
  /// Type of content (post, media, bookmark, etc.).
  pub content_type: String,
  /// Brief preview.
  pub preview: Option<String>,
}

/// Events emitted by TheStream™ system.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TheStreamEvent {
  /// A chunk was added to a PKB directory.
  ///
  /// This is the primary event for content creation.
  ChunkAdded {
    /// The stream entry (the "seeing" record).
    entry: StreamEntry,
    /// The actual content chunk.
    chunk: StreamChunk,
    /// Which directory it was added to.
    directory: DirectoryId,
  },

  /// A stream entry was pulled from a remote device.
  ///
  /// This happens when sync brings in new content.
  EntryPulled {
    /// The stream entry.
    entry: StreamEntry,
    /// The content chunk.
    chunk: StreamChunk,
    /// Which directory.
    directory: DirectoryId,
    /// Which device it came from.
    source_device: String,
  },

  /// A chunk was updated (file changed).
  ChunkUpdated {
    /// The stream entry with new commit hash.
    entry: StreamEntry,
    /// The updated content.
    chunk: StreamChunk,
    /// Which directory.
    directory: DirectoryId,
  },

  /// A chunk was removed.
  ChunkRemoved {
    /// The directory.
    directory: DirectoryId,
    /// The entry ID that was removed.
    entry_id: EntryId,
  },

  /// Sync operation started for a directory.
  SyncStarted { directory: DirectoryId },

  /// Sync operation completed.
  SyncCompleted {
    directory: DirectoryId,
    entries_pulled: usize,
    entries_pushed: usize,
  },

  /// Sync operation failed.
  SyncFailed {
    directory: DirectoryId,
    error: String,
  },
}

/// TheStream™ service - orchestrates content flow.
///
/// This service:
/// 1. Listens to PKB events
/// 2. Converts them to TheStream™ events
/// 3. Provides the API for adding content
/// 4. Syncs to SQLite via DbActor (hybrid PKB + DB architecture)
pub struct TheStream {
  /// Reference to the PKB service.
  pub(crate) pkb: PkbService,

  /// Event bus for emitting TheStream™ events.
  pub(crate) events: EventBus,

  /// This device's emoji identity (for URL generation).
  pub(crate) identity: EmojiIdentity,
  
  /// Optional database handle for SQLite indexing.
  /// When present, TheStream will sync PKB changes to SQLite.
  pub(crate) db: Option<crate::db::DbHandle>,
}

/// Handle to a running listener.
/// When dropped, the listener thread will be joined (blocking until complete).
pub struct ListenerHandle {
  /// The underlying thread handle.
  /// This is pub(crate) so @o19/foundframe-tauri can create placeholder handles.
  #[doc(hidden)]
  pub _handle: std::thread::JoinHandle<()>,
}

impl TheStream {
  /// Create a new TheStream™ service.
  ///
  /// # Arguments
  /// * `pkb` - The PKB service
  /// * `events` - Event bus for emitting events
  /// * `identity` - This device's emoji identity (derived from public key)
  /// * `db` - Optional database handle for SQLite indexing
  pub fn new(
    pkb: PkbService,
    events: EventBus,
    identity: EmojiIdentity,
    db: Option<crate::db::DbHandle>,
  ) -> Self {
    Self {
      pkb,
      events,
      identity,
      db,
    }
  }

  /// Create with a public key (generates emoji identity automatically).
  pub fn with_pubkey(
    pkb: PkbService,
    events: EventBus,
    pubkey: [u8; 32],
    db: Option<crate::db::DbHandle>,
  ) -> Self {
    let identity = EmojiIdentity::from_256_bits(pubkey);
    Self::new(pkb, events, identity, db)
  }
  
  /// Get the database handle if available.
  pub fn db(&self) -> Option<&crate::db::DbHandle> {
    self.db.as_ref()
  }
  
  /// Check if database indexing is enabled.
  pub fn has_db(&self) -> bool {
    self.db.is_some()
  }

  /// Get the filesystem path for a directory.
  pub(crate) fn dir_path(&self, directory: &DirectoryId) -> Result<std::path::PathBuf> {
    // Access through the base
    // TODO: This is a temporary workaround - PkbService needs to expose this
    Ok(std::path::PathBuf::from(format!(
      "{}/dirs/{}",
      std::env::var("HOME").unwrap_or_default(),
      directory
    )))
  }

  /// Get the current HEAD commit hash.
  pub(crate) fn get_head_commit(&self, directory: &DirectoryId) -> Result<String> {
    use radicle::git;

    let dir_path = self.dir_path(directory)?;
    let git_repo = git::raw::Repository::open(&dir_path)
      .map_err(|e| Error::Other(format!("Failed to open git repo: {}", e)))?;

    let head = git_repo
      .head()
      .map_err(|e| Error::Other(format!("Failed to get HEAD: {}", e)))?;

    let commit = head
      .peel_to_commit()
      .map_err(|e| Error::Other(format!("Failed to peel to commit: {}", e)))?;

    Ok(commit.id().to_string())
  }

  /// Start listening to PKB events and converting them.
  ///
  /// This spawns a background task that continuously listens to PKB events
  /// and converts them to TheStream events.
  ///
  /// Returns a handle that can be used to stop listening (when dropped).
  pub fn start_listening(&self) -> ListenerHandle {
    let rx = self.events.subscribe::<PkbEvent>();
    let events = self.events.clone();
    let identity = self.identity.clone();

    // Spawn a thread to listen for events
    let handle = std::thread::spawn(move || {
      while let Ok(pkb_event) = rx.recv() {
        // Convert PKB event to TheStream event
        if let Some(stream_event) = Self::convert_pkb_event(&pkb_event, &identity) {
          events.emit(stream_event);
        }
      }
    });

    ListenerHandle { _handle: handle }
  }

  /// Convert a PKB event to a TheStream event.
  fn convert_pkb_event(event: &PkbEvent, identity: &EmojiIdentity) -> Option<TheStreamEvent> {
    use crate::pkb::StreamChunk;

    match event {
      PkbEvent::EntryCreatedOrPulled {
        directory,
        entry_id,
        path,
        from_remote,
        source_device,
      } => {
        // Build the PKB URL reference
        let reference = format!("pkb://{}/{}/{}", identity.string, directory, path.display());

        // Create stream entry
        let entry = StreamEntry {
          id: None,
          seen_at: crate::pkb::now_timestamp() * 1000,
          commit_hash: String::new(), // TODO: Get actual commit
          reference,
          summary: None,
        };

        // Create placeholder chunk (actual content would be read from file)
        let chunk = StreamChunk::TextNote {
          content: String::new(),
          title: None,
        };

        if *from_remote {
          Some(TheStreamEvent::EntryPulled {
            entry,
            chunk,
            directory: directory.clone(),
            source_device: source_device.clone().unwrap_or_default(),
          })
        } else {
          Some(TheStreamEvent::ChunkAdded {
            entry,
            chunk,
            directory: directory.clone(),
          })
        }
      }
      PkbEvent::SyncStarted { directory } => Some(TheStreamEvent::SyncStarted {
        directory: directory.clone(),
      }),
      PkbEvent::SyncCompleted {
        directory,
        entries_pulled,
        entries_pushed,
      } => Some(TheStreamEvent::SyncCompleted {
        directory: directory.clone(),
        entries_pulled: *entries_pulled,
        entries_pushed: *entries_pushed,
      }),
      PkbEvent::SyncFailed { directory, error } => Some(TheStreamEvent::SyncFailed {
        directory: directory.clone(),
        error: error.clone(),
      }),
      _ => None, // Other events don't have direct TheStream equivalents
    }
  }

  //===========================================================================
  // Generic chunk addition
  //===========================================================================

  /// Add a generic StreamChunk to a PKB directory.
  ///
  /// This is the core method - all other `add_*` methods delegate here.
  ///
  /// # Arguments
  /// * `directory` - Which PKB directory to add to
  /// * `path` - Relative path within the directory
  /// * `chunk` - The content to add
  ///
  /// # Returns
  /// The StreamEntry representing this addition.
  pub fn add_chunk(
    &self,
    directory: DirectoryId,
    path: PathBuf,
    chunk: StreamChunk,
  ) -> Result<StreamEntry> {
    // Get directory path and ingest the chunk
    let dir_path = self.dir_path(&directory)?;
    let entry_id = chunk.ingest(&dir_path, &path)?;

    // Get current commit hash
    let commit_hash = self.get_head_commit(&directory)?;

    // Build the PKB URL reference
    let reference = self.build_pkb_url(&directory, &path, &commit_hash)?;

    // Create the stream entry
    let entry = StreamEntry {
      id: None,
      seen_at: crate::pkb::now_timestamp() * 1000, // Convert to ms
      commit_hash,
      reference,
      summary: Self::extract_summary(&chunk),
    };

    // Emit event
    self.events.emit(TheStreamEvent::ChunkAdded {
      entry: entry.clone(),
      chunk,
      directory,
    });

    Ok(entry)
  }

  /// Add a chunk and return both the entry and entry ID.
  ///
  /// This is useful when you need the content hash for referencing.
  pub fn add_chunk_with_id(
    &self,
    directory: DirectoryId,
    path: PathBuf,
    chunk: StreamChunk,
  ) -> Result<(StreamEntry, EntryId)> {
    let entry = self.add_chunk(directory.clone(), path.clone(), chunk.clone())?;

    // Re-read to get the entry ID from the content hash
    let full_path = self.dir_path(&directory)?.join(&path);
    let content = std::fs::read(&full_path)?;
    let hash = blake3::hash(&content);
    let entry_id = EntryId::new(hash.into());

    Ok((entry, entry_id))
  }

  /// Build a PKB URL for a given path.
  pub(crate) fn build_pkb_url(
    &self,
    directory: &DirectoryId,
    path: &std::path::Path,
    commit_hash: &str,
  ) -> Result<String> {
    let url = emoji_from_entropy::url::PkbUrl::new(
      &self.identity.string,
      directory.clone(),
      path.to_string_lossy().to_string(),
    )
    .with_version(commit_hash);

    Ok(url.to_string())
  }

  /// Parse a PKB URL into components.
  pub(crate) fn parse_pkb_url(&self, url: &str) -> Result<(DirectoryId, PathBuf, String)> {
    let parsed = emoji_from_entropy::url::PkbUrl::parse(url)
      .map_err(|e| Error::Other(format!("Failed to parse PKB URL: {}", e)))?;

    let directory = DirectoryId::from(parsed.repo);
    let path = PathBuf::from(parsed.path);
    let commit = parsed.version.unwrap_or_default();

    Ok((directory, path, commit))
  }

  /// Extract a summary from a chunk for quick display.
  pub(crate) fn extract_summary(chunk: &StreamChunk) -> Option<StreamSummary> {
    match chunk {
      StreamChunk::MediaLink { url, title, .. } => Some(StreamSummary {
        title: title.clone().unwrap_or_else(|| "Media".to_string()),
        content_type: "media".to_string(),
        preview: Some(url.clone()),
      }),
      StreamChunk::TextNote { content, title } => {
        let preview = content.chars().take(100).collect();
        Some(StreamSummary {
          title: title.clone().unwrap_or_else(|| "Note".to_string()),
          content_type: "text".to_string(),
          preview: Some(preview),
        })
      }
      StreamChunk::StructuredData { db_type, data } => {
        // Try to extract title from data
        let title = data
          .get("title")
          .and_then(|v| v.as_str())
          .map(|s| s.to_string())
          .unwrap_or_else(|| db_type.clone());

        Some(StreamSummary {
          title,
          content_type: db_type.to_lowercase(),
          preview: None,
        })
      }
    }
  }

  /// Get the event bus for subscribing to TheStream™ events.
  pub fn events(&self) -> &EventBus {
    &self.events
  }
}

/// Record that "I saw this thing" - creates a StreamEntry referencing existing content.
///
/// This is how content from other repos enters TheStream™.
///
/// # Arguments
/// * `reference` - PKB URL to the content (e.g., "pkb://🌲😀🍕/notes/diary/2024/My Day.js.md")
pub fn see(thestream: &TheStream, reference: &str) -> Result<StreamEntry> {
  // Parse the reference to extract directory and path
  let (directory, path, commit_hash) = thestream.parse_pkb_url(reference)?;

  // Create a stream entry without ingesting new content
  let entry = StreamEntry {
    id: None,
    seen_at: crate::pkb::now_timestamp() * 1000,
    commit_hash,
    reference: reference.to_string(),
    summary: None, // Could fetch and extract from referenced content
  };

  // Emit event
  // Note: We don't have the actual chunk here, just the reference
  // The database layer will need to resolve this
  thestream.events.emit(TheStreamEvent::ChunkAdded {
    entry: entry.clone(),
    chunk: StreamChunk::TextNote {
      content: String::new(), // Placeholder - reference only
      title: None,
    },
    directory,
  });

  Ok(entry)
}

//===========================================================================
// Tests
//===========================================================================

#[cfg(test)]
mod tests {
  use super::*;
  use crate::pkb::{DirectoryId, StreamChunk};

  #[test]
  fn test_stream_entry_serialization() {
    let entry = StreamEntry {
      id: Some(42),
      seen_at: 1700000000000,
      commit_hash: "abc123".to_string(),
      reference: "pkb://🌲😀🍕/notes/diary/2024/My Day.js.md?v=abc123".to_string(),
      summary: Some(StreamSummary {
        title: "My Day".to_string(),
        content_type: "text".to_string(),
        preview: Some("Today was...".to_string()),
      }),
    };

    let json = serde_json::to_string(&entry).unwrap();
    assert!(json.contains("pkb://"));
    assert!(json.contains("My Day"));

    let deserialized: StreamEntry = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.seen_at, 1700000000000);
  }

  #[test]
  fn test_extract_summary() {
    let media = StreamChunk::MediaLink {
      url: "https://example.com/image.png".to_string(),
      mime_type: Some("image/png".to_string()),
      title: Some("Sunset".to_string()),
    };

    let summary = TheStream::extract_summary(&media).unwrap();
    assert_eq!(summary.title, "Sunset");
    assert_eq!(summary.content_type, "media");

    let text = StreamChunk::TextNote {
      content: "Hello world this is a long note".to_string(),
      title: Some("Greeting".to_string()),
    };

    let summary = TheStream::extract_summary(&text).unwrap();
    assert_eq!(summary.title, "Greeting");
    assert!(summary.preview.unwrap().contains("Hello"));
  }
}
