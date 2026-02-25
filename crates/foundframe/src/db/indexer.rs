//! DbActor Indexer - Bridges PKB events to SQLite
//!
//! This module subscribes to TheStream events and updates the SQLite
//! database via DbActor, maintaining the PKB → SQLite sync.

use std::thread;
use std::time::Duration;

use crossbeam_channel::Receiver;
use tracing::{debug, error, info, warn};

use crate::db::{DbCommand, DbHandle};
use crate::thestream::{StreamChunk, StreamEntry, TheStreamEvent};
use crate::signal::EventBus;

/// Indexes TheStream events into SQLite via DbActor.
///
/// This runs in its own thread, subscribing to TheStream events
/// and issuing DbCommands to keep SQLite in sync with PKB.
pub struct EventIndexer {
    db: DbHandle,
    event_rx: Receiver<TheStreamEvent>,
}

impl EventIndexer {
    /// Create a new indexer and subscribe to events.
    pub fn new(db: DbHandle, event_bus: &EventBus) -> (Self, thread::JoinHandle<()>) {
        let event_rx = event_bus.subscribe::<TheStreamEvent>();
        
        let indexer = Self { db, event_rx };
        let handle = thread::spawn(move || indexer.run());
        
        (indexer, handle)
    }

    /// Run the indexer loop.
    fn run(&self) {
        info!("EventIndexer started - bridging PKB to SQLite");
        
        loop {
            match self.event_rx.recv() {
                Ok(event) => {
                    if let Err(e) = self.handle_event(event) {
                        error!("Failed to index event: {}", e);
                    }
                }
                Err(_) => {
                    // Channel closed, exit
                    info!("EventIndexer shutting down - channel closed");
                    break;
                }
            }
        }
    }

    /// Handle a single TheStream event.
    fn handle_event(&self, event: TheStreamEvent) -> crate::Result<()> {
        match event {
            TheStreamEvent::ChunkAdded { entry, chunk, directory } => {
                debug!("Indexing ChunkAdded: {:?}", entry.id);
                self.index_chunk(&entry, &chunk, &directory)?;
            }
            
            TheStreamEvent::ChunkUpdated { entry, chunk, directory } => {
                debug!("Indexing ChunkUpdated: {:?}", entry.id);
                self.update_chunk(&entry, &chunk, &directory)?;
            }
            
            TheStreamEvent::ChunkRemoved { directory, entry_id } => {
                debug!("Indexing ChunkRemoved: {:?}", entry_id);
                self.remove_chunk(&directory, entry_id)?;
            }
            
            TheStreamEvent::EntryPulled { entry, chunk, directory, source_device } => {
                debug!("Indexing EntryPulled from {}: {:?}", source_device, entry.id);
                self.index_chunk(&entry, &chunk, &directory)?;
            }
            
            // Sync events don't need indexing - they're just notifications
            TheStreamEvent::SyncStarted { .. } => {}
            TheStreamEvent::SyncCompleted { .. } => {}
            TheStreamEvent::SyncFailed { .. } => {}
        }
        
        Ok(())
    }

    /// Index a new chunk into SQLite.
    fn index_chunk(
        &self,
        entry: &StreamEntry,
        chunk: &StreamChunk,
        directory: &crate::pkb::DirectoryId,
    ) -> crate::Result<()> {
        // TODO: Match on chunk type and index appropriately
        // For now, just log that we would index
        debug!(
            "Would index chunk: type={:?}, dir={}, entry={:?}",
            chunk.content_type(),
            directory,
            entry.id
        );
        
        // Example: if bookmark, insert into bookmarks table
        // self.db.insert_bookmark(...).await;
        
        Ok(())
    }

    /// Update an existing chunk in SQLite.
    fn update_chunk(
        &self,
        entry: &StreamEntry,
        chunk: &StreamChunk,
        directory: &crate::pkb::DirectoryId,
    ) -> crate::Result<()> {
        debug!(
            "Would update chunk: type={:?}, dir={}, entry={:?}",
            chunk.content_type(),
            directory,
            entry.id
        );
        
        Ok(())
    }

    /// Remove a chunk from SQLite.
    fn remove_chunk(
        &self,
        directory: &crate::pkb::DirectoryId,
        entry_id: crate::pkb::EntryId,
    ) -> crate::Result<()> {
        debug!("Would remove chunk: dir={}, entry={:?}", directory, entry_id);
        
        Ok(())
    }
}

/// Start the event indexer in a background thread.
///
/// Returns the thread handle so caller can manage lifecycle.
pub fn start_indexer(
    db: DbHandle,
    event_bus: &EventBus,
) -> thread::JoinHandle<()> {
    let (_indexer, handle) = EventIndexer::new(db, event_bus);
    handle
}
