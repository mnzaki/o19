//! foundframe-to-sql: TheStream to SQLite adapter.
//!
//! This crate listens to TheStream events and persists them to SQLite.
//! It's the bridge between the domain layer (foundframe) and the database.
//!
//! # Architecture
//!
//! ```text
//! TheStream (events)
//!     ↓
//! StreamToSql (listener)
//!     ↓
//! SQLite (thestream table)
//! ```

use std::path::Path;
use std::sync::Arc;
use std::thread;

use sqlite as sql;
use tracing::{debug, error, info, warn};

use o19_foundframe::pkb::{DirectoryId, EntryId, StreamChunk};
use o19_foundframe::signal::EventBus;
use o19_foundframe::thestream::{StreamEntry, TheStreamEvent};

pub mod error;
pub use error::{Error, Result};

/// Database connection wrapper.
#[derive(Clone)]
pub struct Database {
  db: Arc<sql::ConnectionThreadSafe>,
}

impl Database {
  /// Open a database at the given path.
  pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
    let db = sql::Connection::open_thread_safe(path)?;
    db.execute("PRAGMA foreign_keys = ON")?;

    Ok(Self { db: Arc::new(db) })
  }

  /// Create an in-memory database (for testing).
  pub fn memory() -> Result<Self> {
    let db = sql::Connection::open_thread_safe(":memory:")?;
    db.execute("PRAGMA foreign_keys = ON")?;

    Ok(Self { db: Arc::new(db) })
  }

  /// Get database version.
  pub fn version(&self) -> Result<i64> {
    let version: i64 = self
      .db
      .prepare("PRAGMA user_version")?
      .into_iter()
      .next()
      .ok_or(Error::NoRows)??
      .read(0);
    Ok(version)
  }

  /// Set database version.
  pub fn set_version(&self, version: i64) -> Result<()> {
    self
      .db
      .execute(format!("PRAGMA user_version = {}", version))?;
    Ok(())
  }
}

/// TheStream to SQL adapter.
///
/// Listens to TheStream events and writes them to SQLite.
pub struct StreamToSql {
  /// Database connection.
  db: Database,
  /// Event bus for receiving TheStream events.
  events: EventBus,
}

impl StreamToSql {
  /// Create a new StreamToSql adapter.
  pub fn new(db: Database, events: EventBus) -> Self {
    Self { db, events }
  }

  /// Start listening to TheStream events and writing to database.
  ///
  /// Returns a handle that keeps the listener alive.
  pub fn start(&self) -> ListenerHandle {
    let rx = self.events.subscribe::<TheStreamEvent>();
    let db = self.db.clone();

    let handle = thread::spawn(move || {
      while let Ok(event) = rx.recv() {
        if let Err(e) = Self::handle_event(&db, &event) {
          error!("Failed to handle TheStream event: {}", e);
        }
      }
    });

    ListenerHandle { _handle: handle }
  }

  /// Handle a single TheStream event.
  fn handle_event(db: &Database, event: &TheStreamEvent) -> Result<()> {
    match event {
      TheStreamEvent::ChunkAdded {
        entry,
        chunk,
        directory,
      } => {
        info!("Chunk added to {}", directory);
        Self::insert_stream_entry(db, entry, chunk, directory, false, None)?;
      }
      TheStreamEvent::EntryPulled {
        entry,
        chunk,
        directory,
        source_device,
      } => {
        info!("Entry pulled from {} into {}", source_device, directory);
        Self::insert_stream_entry(db, entry, chunk, directory, true, Some(source_device))?;
      }
      TheStreamEvent::ChunkUpdated {
        entry,
        chunk,
        directory,
      } => {
        info!("Chunk updated in {}", directory);
        Self::update_stream_entry(db, entry, chunk)?;
      }
      TheStreamEvent::ChunkRemoved {
        directory,
        entry_id,
      } => {
        info!("Chunk removed from {}", directory);
        Self::remove_stream_entry(db, entry_id)?;
      }
      TheStreamEvent::SyncStarted { directory } => {
        debug!("Sync started for {}", directory);
        // Could log sync operations if needed
      }
      TheStreamEvent::SyncCompleted {
        directory,
        entries_pulled,
        entries_pushed,
      } => {
        info!(
          "Sync completed for {}: {} pulled, {} pushed",
          directory, entries_pulled, entries_pushed
        );
      }
      TheStreamEvent::SyncFailed { directory, error } => {
        error!("Sync failed for {}: {}", directory, error);
      }
    }
    Ok(())
  }

  /// Insert a stream entry into the database.
  fn insert_stream_entry(
    db: &Database,
    entry: &StreamEntry,
    chunk: &StreamChunk,
    directory: &DirectoryId,
    from_remote: bool,
    source_device: Option<&str>,
  ) -> Result<()> {
    let mut stmt = db.db.prepare(
      "INSERT INTO thestream 
             (seen_at, directory, commit_hash, reference, from_remote, source_device, 
              kind, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )?;

    let now = now_millis();
    let kind = match chunk {
      StreamChunk::MediaLink { .. } => "media_link",
      StreamChunk::TextNote { .. } => "text_note",
      StreamChunk::StructuredData { db_type, .. } => db_type.as_str(),
    };

    stmt.bind((1, sql::Value::Integer(entry.seen_at as i64)))?;
    stmt.bind((2, sql::Value::String(directory.clone())))?;
    stmt.bind((3, sql::Value::String(entry.commit_hash.clone())))?;
    stmt.bind((4, sql::Value::String(entry.reference.clone())))?;
    stmt.bind((5, sql::Value::Integer(from_remote as i64)))?;
    stmt.bind((6, source_device.map(|s| sql::Value::String(s.to_string()))))?;
    stmt.bind((7, sql::Value::String(kind.to_string())))?;
    stmt.bind((8, sql::Value::Integer(now)))?;
    stmt.bind((9, sql::Value::Integer(now)))?;

    stmt.next()?;
    Ok(())
  }

  /// Update an existing stream entry.
  fn update_stream_entry(db: &Database, entry: &StreamEntry, _chunk: &StreamChunk) -> Result<()> {
    // For now, just update the commit_hash and updated_at
    // In the future, this could update polymorphic FKs based on chunk type
    let mut stmt = db.db.prepare(
      "UPDATE thestream 
             SET commit_hash = ?, updated_at = ?
             WHERE reference = ?",
    )?;

    let now = now_millis();
    stmt.bind((1, sql::Value::String(entry.commit_hash.clone())))?;
    stmt.bind((2, sql::Value::Integer(now)))?;
    stmt.bind((3, sql::Value::String(entry.reference.clone())))?;

    stmt.next()?;
    Ok(())
  }

  /// Remove a stream entry.
  fn remove_stream_entry(db: &Database, entry_id: &EntryId) -> Result<()> {
    // Note: entry_id here is the content hash, not the database id
    // We'd need to look up by reference or content hash
    // For now, this is a placeholder
    warn!(
      "Remove stream entry not fully implemented (entry_id: {:?})",
      entry_id
    );
    Ok(())
  }

  /// Run migrations to create/update schema.
  pub fn migrate(&self) -> Result<()> {
    let migrations = MIGRATIONS;
    let current_version = self.db.version()?;

    for (i, migration) in migrations.iter().enumerate() {
      let version = i as i64;
      if version > current_version {
        info!("Running migration {}...", version);
        self.db.db.execute(migration)?;
        self.db.set_version(version)?;
      }
    }

    Ok(())
  }
}

/// Handle to keep the listener alive.
pub struct ListenerHandle {
  _handle: thread::JoinHandle<()>,
}

/// Current timestamp in milliseconds.
fn now_millis() -> i64 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as i64
}

/// SQL migrations.
include!(concat!(env!("OUT_DIR"), "/generated_migrations.rs"));

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_database_creation() {
    let db = Database::memory().unwrap();
    assert_eq!(db.version().unwrap(), 0);
  }

  #[test]
  fn test_migrations() {
    let db = Database::memory().unwrap();
    let adapter = StreamToSql::new(db, EventBus::new());

    adapter.migrate().unwrap();

    // Check that version was updated
    assert_eq!(adapter.db.version().unwrap(), (MIGRATIONS.len() - 1) as i64);
  }
}
