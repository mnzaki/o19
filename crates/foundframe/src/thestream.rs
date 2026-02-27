use crate::db::commands::StreamEntryFilter;

// TheStream™ - Temporal experience orchestration.
//
// TheStream™ is the orchestration layer that mediates between raw PKB (git files)
// and the database view. It converts PKB events into StructuredData events,
// maintains the stream of experience, and provides the domain API for
// adding content to the Personal Knowledge Base.
//
// # Architecture
//
// ```
// PKB (git repos)
//     ↓ (emits PkbEvent)
// TheStream (converts to StreamChunks, emits TheStreamEvent)
//     ↓ (emits TheStreamEvent)
// Database (SQLite ViewModel)
// ```
//
// # The Rhythm
//
// TheStream™ embodies the O-O-F rhythm (observe twice, react once):
// - Files exist in PKB first (observation)
// - TheStream™ witnesses them (observation)
// - Database reflects the experience (reaction)
//
// But variance is encoded: some identities may use O-F-F or other patterns.
//
// # Extension Methods
//
// Additional TheStream methods are implemented in other modules:
// - [`BookmarkStream`](crate::bookmark::BookmarkStream) - `add_bookmark()` and related bookmark operations
//   (see `src/bookmark.rs` for the trait implementation)

use std::path::PathBuf;

use emoji_from_entropy::EmojiIdentity;
use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::pkb::{DirectoryId, EntryId, PkbService, StructuredData};
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
  /// Data was added to a PKB directory.
  ///
  /// This is the primary event for content creation.
  ChunkAdded {
    /// The stream entry (the "seeing" record).
    entry: StreamEntry,
    /// The actual content data.
    data: StructuredData,
    /// Which directory it was added to.
    directory: DirectoryId,
  },

  /// A stream entry was pulled from a remote device.
  ///
  /// This happens when sync brings in new content.
  EntryPulled {
    /// The stream entry.
    entry: StreamEntry,
    /// The content data.
    data: StructuredData,
    /// Which directory.
    directory: DirectoryId,
    /// Which device it came from.
    source_device: String,
  },

  /// Data was updated (file changed).
  ChunkUpdated {
    /// The stream entry with new commit hash.
    entry: StreamEntry,
    /// The updated content.
    data: StructuredData,
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
    use crate::pkb::StructuredData;

    match event {
      PkbEvent::EntryCreatedOrPulled {
        directory,
        entry_id: _,
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

        // Create placeholder data (actual content would be read from file)
        let data = StructuredData::new(
          "Entry",
          serde_json::json!({"path": path.display().to_string()}),
        );

        if *from_remote {
          Some(TheStreamEvent::EntryPulled {
            entry,
            data,
            directory: directory.clone(),
            source_device: source_device.clone().unwrap_or_default(),
          })
        } else {
          Some(TheStreamEvent::ChunkAdded {
            entry,
            data,
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

  /// Add an entry to TheStream™ (and PKB directory).
  ///
  /// This is the core method - all other `add_*` methods delegate here.
  /// Emits TheStreamEvent::ChunkAdded which is captured by the indexer
  /// and other downstream consumers.
  ///
  /// # Arguments
  /// * `directory` - Which PKB directory to add to
  /// * `path` - Relative path within the directory
  /// * `data` - The structured content to add
  ///
  /// # Returns
  /// The StreamEntry representing this addition.
  pub fn add_entry(
    &self,
    directory: DirectoryId,
    path: PathBuf,
    data: StructuredData,
  ) -> Result<StreamEntry> {
    // Get directory path and ingest the data
    let dir_path = self.dir_path(&directory)?;
    let _entry_id = data.ingest(&dir_path, &path)?;

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
      summary: Self::extract_summary(&data),
    };

    // Emit event
    self.events.emit(TheStreamEvent::ChunkAdded {
      entry: entry.clone(),
      data,
      directory,
    });

    Ok(entry)
  }

  /// Add an entry and return both the entry and entry ID.
  ///
  /// This is useful when you need the content hash for referencing.
  pub fn add_entry_with_id(
    &self,
    directory: DirectoryId,
    path: PathBuf,
    data: StructuredData,
  ) -> Result<(StreamEntry, EntryId)> {
    let entry = self.add_entry(directory.clone(), path.clone(), data.clone())?;

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

  /// Extract a summary from structured data for quick display.
  pub(crate) fn extract_summary(data: &StructuredData) -> Option<StreamSummary> {
    // Try to extract title from data
    let title = data
      .get("title")
      .and_then(|v| v.as_str())
      .map(|s| s.to_string())
      .unwrap_or_else(|| data.data_type.clone());

    // Try to extract preview
    let preview = data
      .get("content")
      .or_else(|| data.get("uri"))
      .or_else(|| data.get("url"))
      .and_then(|v| v.as_str())
      .map(|s| s.chars().take(100).collect());

    Some(StreamSummary {
      title,
      content_type: data.data_type.to_lowercase(),
      preview,
    })
  }

  /// Get the event bus for subscribing to TheStream™ events.
  pub fn events(&self) -> &EventBus {
    &self.events
  }

  /// List stream entries from the database with optional filtering.
  ///
  /// This is the primary query interface for TheStream™ when database
  /// indexing is enabled. Use `filter` to narrow results:
  ///
  /// # Filter Examples
  /// ```rust,ignore
  /// // All entries, paginated
  /// let entries = stream.list_entries_filtered(50, 0, StreamEntryFilter::new()).await?;
  ///
  /// // Only posts
  /// let filter = StreamEntryFilter::new().kind("post");
  /// let posts = stream.list_entries_filtered(50, 0, filter).await?;
  ///
  /// // Media from a specific time range
  /// let filter = StreamEntryFilter::new()
  ///     .kind("media")
  ///     .after(1700000000000)
  ///     .before(1800000000000);
  /// let media = stream.list_entries_filtered(50, 0, filter).await?;
  ///
  /// // By specific entity reference
  /// let filter = StreamEntryFilter::new().person_id(42);
  /// let person_entries = stream.list_entries_filtered(50, 0, filter).await?;
  /// ```
  ///
  /// # Arguments
  /// * `limit` - Maximum number of entries to return
  /// * `offset` - Number of entries to skip (for pagination)
  /// * `filter` - Filter criteria (`StreamEntryFilter` from `crate::db`)
  ///
  /// # Errors
  /// Returns an error if database indexing is not enabled.
  pub async fn list_entries_filtered(
    &self,
    limit: usize,
    offset: usize,
    filter: StreamEntryFilter,
  ) -> Result<Vec<crate::db::streamentry_data::StreamEntryData>> {
    let db = self.db.as_ref().ok_or_else(|| {
      Error::Other("Database indexing not enabled. Call start_networking() first.".into())
    })?;

    db.list_streamentrys(Some(limit), Some(offset), filter)
      .await
      .map_err(|e| Error::Other(format!("Database query failed: {}", e)))
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
  let (directory, _path, commit_hash) = thestream.parse_pkb_url(reference)?;

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
    data: StructuredData::new("Reference", serde_json::json!({"reference": reference})),
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
  use crate::pkb::StructuredData;

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
    let media = StructuredData::media(
      "https://example.com/image.png",
      Some("image/png".to_string()),
      Some("Sunset".to_string()),
    );

    let summary = TheStream::extract_summary(&media).unwrap();
    assert_eq!(summary.title, "Sunset");
    assert_eq!(summary.content_type, "media");

    let post = StructuredData::post(
      "Hello world this is a long note",
      Some("Greeting".to_string()),
    );

    let summary = TheStream::extract_summary(&post).unwrap();
    assert_eq!(summary.title, "Greeting");
    assert!(summary.preview.unwrap().contains("Hello"));
  }
}
