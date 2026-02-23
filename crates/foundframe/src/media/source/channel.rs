//! Ingestion Channel
//!
//! Unified ingestion channel that sits between sources and PKB.
//! Handles deduplication, batching, and error handling.

use std::collections::HashMap;
use std::sync::Arc;

use crate::error::Result;
use crate::pkb::{PkbService, StreamChunk};

use super::types::{BatchResult, MediaItem};

/// Unified ingestion channel.
///
/// This sits between sources and PKB, handling:
/// - Deduplication (by source_id)
/// - Rate limiting (for push floods)
/// - Batch processing
/// - Error handling and retries
///
/// Note: This is in-memory only. Deduplication cache is ephemeral.
pub struct IngestionChannel {
    pkb: Arc<PkbService>,
    /// Deduplication cache: source_id -> last_seen_timestamp
    /// This is in-memory only; for true dedup we check PKB content hash
    seen_cache: tokio::sync::RwLock<HashMap<String, chrono::DateTime<chrono::Utc>>>,
}

impl IngestionChannel {
    pub fn new(pkb: Arc<PkbService>) -> Self {
        Self {
            pkb,
            seen_cache: tokio::sync::RwLock::new(HashMap::new()),
        }
    }
    
    /// Ingest a single item.
    pub async fn ingest(&self, item: MediaItem) -> Result<()> {
        let source_id = item.source_id.clone();
        
        // Check deduplication cache
        {
            let cache = self.seen_cache.read().await;
            if let Some(last_seen) = cache.get(&source_id) {
                // If seen in last hour, skip (configurable)
                let elapsed = chrono::Utc::now().signed_duration_since(*last_seen);
                if elapsed.num_seconds() < 3600 {
                    return Ok(());
                }
            }
        }
        
        // Transform to PKB StreamChunk and add
        let chunk = self.item_to_chunk(item)?;
        // SPIRAL: Need proper directory and path here
        let _entry_id = chunk.ingest(std::path::Path::new("/tmp/pkb"), std::path::Path::new("media"))?;
        
        // Update cache using source_id
        self.seen_cache.write().await.insert(
            source_id,
            chrono::Utc::now()
        );
        
        Ok(())
    }
    
    /// Ingest a batch of items (more efficient).
    pub async fn ingest_batch(&self, items: Vec<MediaItem>) -> Result<BatchResult> {
        let mut processed = 0;
        let mut skipped = 0;
        let mut failed = Vec::new();
        
        // Check cache for each item
        let cache = self.seen_cache.read().await;
        let to_process: Vec<_> = items.into_iter().filter(|item| {
            if let Some(last_seen) = cache.get(&item.source_id) {
                let elapsed = chrono::Utc::now().signed_duration_since(*last_seen);
                if elapsed.num_seconds() < 3600 {
                    skipped += 1;
                    return false;
                }
            }
            true
        }).collect();
        drop(cache);
        
        // Process in chunks
        for chunk in to_process.chunks(10) {
            for item in chunk {
                match self.ingest(item.clone()).await {
                    Ok(_) => processed += 1,
                    Err(e) => failed.push((item.source_id.clone(), e.to_string())),
                }
            }
        }
        
        Ok(BatchResult {
            processed,
            skipped_duplicate: skipped,
            failed,
        })
    }
    
    fn item_to_chunk(&self, _item: MediaItem) -> Result<StreamChunk> {
        // SPIRAL: Transform MediaItem to PKB StreamChunk
        // This is where we determine the target directory, naming, etc.
        todo!("Transform MediaItem to StreamChunk")
    }
}
