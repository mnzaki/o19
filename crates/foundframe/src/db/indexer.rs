//! DbActor Indexer - Bridges PKB events to SQLite
//!
//! This module subscribes to TheStream events and updates the SQLite
//! database via DbActor, maintaining the PKB → SQLite sync.

use std::thread;
use std::time::Duration;

use crossbeam_channel::Receiver;
use tracing::{debug, error, info, warn};

use crate::db::{DbCommand, DbHandle};
use crate::pkb::StructuredData;
use crate::thestream::{StreamEntry, TheStreamEvent};
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
    /// Returns the thread handle - the indexer runs in background.
    pub fn spawn(db: DbHandle, event_bus: &EventBus) -> thread::JoinHandle<()> {
        let event_rx = event_bus.subscribe::<TheStreamEvent>();
        
        let indexer = Self { db, event_rx };
        thread::spawn(move || indexer.run())
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
            TheStreamEvent::ChunkAdded { entry, data, directory } => {
                debug!("Indexing ChunkAdded: {:?}", entry.id);
                self.index_data(&entry, &data, &directory)?;
            }
            
            TheStreamEvent::ChunkUpdated { entry, data, directory } => {
                debug!("Indexing ChunkUpdated: {:?}", entry.id);
                self.update_data(&entry, &data, &directory)?;
            }
            
            TheStreamEvent::ChunkRemoved { directory, entry_id } => {
                debug!("Indexing ChunkRemoved: {:?}", entry_id);
                self.remove_chunk(&directory, entry_id)?;
            }
            
            TheStreamEvent::EntryPulled { entry, data, directory, source_device } => {
                debug!("Indexing EntryPulled from {}: {:?}", source_device, entry.id);
                self.index_data(&entry, &data, &directory)?;
            }
            
            // Sync events don't need indexing - they're just notifications
            TheStreamEvent::SyncStarted { .. } => {}
            TheStreamEvent::SyncCompleted { .. } => {}
            TheStreamEvent::SyncFailed { .. } => {}
        }
        
        Ok(())
    }

    /// Index new data into SQLite.
    fn index_data(
        &self,
        entry: &StreamEntry,
        data: &StructuredData,
        directory: &crate::pkb::DirectoryId,
    ) -> crate::Result<()> {
        // Index based on data_type
        let data_type = data.data_type.as_str();
        debug!(
            "Would index data: type={}, dir={}, entry={:?}",
            data_type,
            directory,
            entry.id
        );
        
        // TODO: Match on data_type and insert into appropriate table
        // match data_type {
        //     "Bookmark" => self.db.insert_bookmark(...).await,
        //     "Media" => self.db.insert_media(...).await,
        //     ...
        // }
        
        Ok(())
    }

    /// Update existing data in SQLite.
    fn update_data(
        &self,
        entry: &StreamEntry,
        data: &StructuredData,
        directory: &crate::pkb::DirectoryId,
    ) -> crate::Result<()> {
        let data_type = data.data_type.as_str();
        debug!(
            "Would update data: type={}, dir={}, entry={:?}",
            data_type,
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
    EventIndexer::spawn(db, event_bus)
}
