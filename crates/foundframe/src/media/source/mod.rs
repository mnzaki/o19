//! Media Source System - Unified Push & Pull with DB Persistence
//!
//! A modular system for ingesting media from external sources.
//! Supports both pull (poll) and push (webhook/event) patterns.
//!
//! All source state is persisted to the database, enabling recovery
//! after restart and inspection of source health.
//!
//! # Architecture
//!
//! ```text
//!                    ┌─────────────────┐
//!  ┌──────────┐      │  Media Source   │      ┌──────────┐
//!  │  Pull    │─────▶│    Registry     │◀─────│   Push   │
//!  │ (Poll)   │      │                 │      │(Webhook) │
//!  └──────────┘      └────────┬────────┘      └──────────┘
//!           ▲                 │                 ▲
//!           │                 ▼                 │
//!           │      ┌─────────────────────┐      │
//!           └──────┤   Database (DB)     │──────┘
//!                  │  - source configs   │
//!                  │  - cursors (state)  │
//!                  │  - health metrics   │
//!                  └──────────┬──────────┘
//!                             │
//!                  ┌──────────▼──────────┐
//!                  │  IngestionChannel   │ (in-memory)
//!                  └──────────┬──────────┘
//!                             │
//!                  ┌──────────▼──────────┐
//!                  │         PKB         │
//!                  └─────────────────────┘
//! ```
//!
//! # Module Structure
//!
//! - `types`: Core data types (configs, MediaItem, health status)
//! - `adapter`: SourceAdapter trait definition
//! - `channel`: IngestionChannel for batch processing
//! - `adapters`: Concrete adapter implementations

use std::collections::HashMap;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;

use crate::db::{DbHandle, MediaSource as MediaSourceRow};
use crate::error::{Error, Result};
use crate::pkb::PkbService;

// Submodules
pub mod adapter;
pub mod adapters;
pub mod channel;
pub mod types;

// Re-exports
pub use adapter::{SourceAdapter, SourceConfig, deserialize_config};
pub use channel::IngestionChannel;
pub use types::*;

use adapter::SourceConfig as SourceConfigTrait;

/// Handle for an active pull task
struct PullTaskHandle {
    /// Tokio task handle for the polling loop
    _handle: tokio::task::JoinHandle<()>,
    /// Token to signal cancellation
    cancel: CancellationToken,
}

/// Handle for an active push endpoint
struct PushEndpointHandle {
    /// Endpoint ID (adapter-specific)
    endpoint_id: String,
    /// Token to signal shutdown
    _cancel: CancellationToken,
}

/// Central registry for all media sources (push and pull).
///
/// Sources are persisted in the database (`media_source` table).
/// The registry loads active sources on startup and manages their
/// lifecycle (polling tasks, webhook endpoints).
pub struct MediaSourceRegistry {
    /// Database handle (actor-based, thread-safe)
    db: DbHandle,
    
    /// The PKB service for ingesting discovered media
    pkb: Arc<PkbService>,
    
    /// Active polling tasks for pull sources (in-memory only)
    /// Key: source_id (from DB)
    pull_tasks: HashMap<i64, PullTaskHandle>,
    
    /// Active push endpoints (in-memory only)
    /// Key: source_id (from DB)
    push_endpoints: HashMap<i64, PushEndpointHandle>,
    
    /// Source type adapters (schemes -> adapters)
    adapters: HashMap<String, Arc<dyn SourceAdapter>>,
    
    /// Shared ingestion channel for all sources
    channel: Arc<IngestionChannel>,
}

impl MediaSourceRegistry {
    /// Create a new registry and restore active sources from DB.
    pub async fn new(db: DbHandle, pkb: Arc<PkbService>) -> Result<Self> {
        let channel = Arc::new(IngestionChannel::new(pkb.clone()));
        
        let mut registry = Self {
            db,
            pkb,
            pull_tasks: HashMap::new(),
            push_endpoints: HashMap::new(),
            adapters: HashMap::new(),
            channel: channel.clone(),
        };
        
        // Register default adapters
        registry.register_adapter("file", Arc::new(adapters::LocalDirAdapter));
        
        // Restore active sources from database
        registry.restore_active_sources().await?;
        
        Ok(registry)
    }
    
    /// Register a source type adapter.
    pub fn register_adapter(&mut self, scheme: &str, adapter: Arc<dyn SourceAdapter>) {
        self.adapters.insert(scheme.to_string(), adapter);
    }
    
    /// Register a pull-based source (we poll it).
    pub async fn register_pull(
        &mut self,
        url: &str,
        config: PullConfig,
    ) -> Result<i64> {
        let scheme = parse_scheme(url)?;
        
        let adapter = self.adapters.get(&scheme)
            .ok_or_else(|| Error::Other(format!("No adapter for scheme: {}", scheme)))?;
        
        if !adapter.capabilities().contains(&SourceCapability::Pull) {
            return Err(Error::Other(format!(
                "Source {} does not support pull mode", scheme
            )));
        }
        
        // Validate the source is accessible before persisting
        let pull_config = adapter.create_pull_config(url, config)?;
        adapter.validate_pull(&pull_config).await?;
        
        // Serialize config to JSON for DB storage
        let config_json = pull_config.serialize_json()?;
        let capabilities_json = serde_json::to_string(&adapter.capabilities())
            .map_err(|e| Error::Other(format!("Failed to serialize capabilities: {}", e)))?;
        
        // Insert into database
        let source_id = self.db.insert_source(crate::db::InsertMediaSource {
            url: url.to_string(),
            adapter_type: scheme,
            cursor_state: None,
            capabilities: capabilities_json,
            config: Some(config_json),
            is_active: true,
        }).await?;
        
        // Start polling task
        self.start_pull_task(source_id, url, adapter.clone(), pull_config).await?;
        
        Ok(source_id)
    }
    
    /// Register a push-based source (it sends to us).
    pub async fn register_push(
        &mut self,
        url: &str,
        config: PushConfig,
    ) -> Result<i64> {
        let scheme = parse_scheme(url)?;
        
        let adapter = self.adapters.get(&scheme)
            .ok_or_else(|| Error::Other(format!("No adapter for scheme: {}", scheme)))?;
        
        if !adapter.capabilities().contains(&SourceCapability::Push) {
            return Err(Error::Other(format!(
                "Source {} does not support push mode", scheme
            )));
        }
        
        let push_config = adapter.create_push_config(url, config)?;
        let config_json = push_config.serialize_json()?;
        let capabilities_json = serde_json::to_string(&adapter.capabilities())
            .map_err(|e| Error::Other(format!("Failed to serialize capabilities: {}", e)))?;
        
        // Insert as inactive first (endpoint not ready)
        let source_id = self.db.insert_source(crate::db::InsertMediaSource {
            url: url.to_string(),
            adapter_type: scheme.clone(),
            cursor_state: None,
            capabilities: capabilities_json,
            config: Some(config_json),
            is_active: false, // Will activate after endpoint setup
        }).await?;
        
        // Setup push endpoint
        let endpoint_id = adapter.setup_push_endpoint(&push_config).await?;
        
        // Update to active
        self.db.update_active(source_id, true).await?;
        
        // Register callback and store handle
        let channel = self.channel.clone();
        let db = self.db.clone();
        let source_id_for_cb = source_id;
        
        adapter.on_push_event(&endpoint_id, Box::new(move |items| {
            let channel = channel.clone();
            let db = db.clone();
            let source_id = source_id_for_cb;
            
            tokio::spawn(async move {
                match channel.ingest_batch(items).await {
                    Ok(_result) => {
                        let _ = db.update_last_polled(source_id).await;
                    }
                    Err(e) => {
                        let _ = db.update_error(source_id, &e.to_string()).await;
                    }
                }
            });
        }));
        
        let cancel = CancellationToken::new();
        self.push_endpoints.insert(source_id, PushEndpointHandle {
            endpoint_id,
            _cancel: cancel,
        });
        
        Ok(source_id)
    }
    
    /// Unregister a source (stop polling or close webhook).
    pub async fn unregister(&mut self, source_id: i64) -> Result<()> {
        let source = self.db.get_by_id(source_id).await?
            .ok_or_else(|| Error::Other(format!("Source not found: {}", source_id)))?;
        
        let capabilities: Vec<SourceCapability> = serde_json::from_str(&source.capabilities)
            .map_err(|e| Error::Other(format!("Invalid capabilities JSON: {}", e)))?;
        
        if capabilities.contains(&SourceCapability::Pull) {
            if let Some(handle) = self.pull_tasks.remove(&source_id) {
                handle.cancel.cancel();
            }
        }
        
        if capabilities.contains(&SourceCapability::Push) {
            if let Some(handle) = self.push_endpoints.remove(&source_id) {
                let adapter = self.adapters.get(&source.adapter_type)
                    .ok_or_else(|| Error::Other(format!("Adapter not found: {}", source.adapter_type)))?;
                adapter.teardown_push_endpoint(&handle.endpoint_id).await?;
            }
        }
        
        self.db.update_active(source_id, false).await?;
        Ok(())
    }
    
    /// Trigger manual poll of a pull source (for testing/forced sync).
    pub async fn poll_now(&self, source_id: i64) -> Result<PollResult> {
        let source = self.db.get_by_id(source_id).await?
            .ok_or_else(|| Error::Other(format!("Source not found: {}", source_id)))?;
        
        if !source.is_active {
            return Err(Error::Other("Source is not active".into()));
        }
        
        let adapter = self.adapters.get(&source.adapter_type)
            .ok_or_else(|| Error::Other(format!("Adapter not found: {}", source.adapter_type)))?;
        
        let config = deserialize_config(source.config.as_deref())?;
        
        let start = std::time::Instant::now();
        let output = adapter.poll(&config, source.cursor_state.as_deref()).await?;
        let duration_ms = start.elapsed().as_millis() as u64;
        
        if let Some(cursor) = &output.next_cursor {
            self.db.update_cursor(source_id, cursor).await?;
        }
        self.db.update_last_polled(source_id).await?;
        
        let items_found = output.items.len();
        let result = self.channel.ingest_batch(output.items).await?;
        
        Ok(PollResult {
            items_found,
            items_new: result.processed,
            errors: result.failed.into_iter().map(|(_, e)| e).collect(),
            duration_ms,
        })
    }
    
    /// Get health status of all sources from database.
    pub async fn health_check(&self) -> Result<Vec<SourceHealthEntry>> {
        let rows = self.db.list_active().await?;
        
        let mut healths = Vec::new();
        for row in rows {
            let health = if let Some(error) = &row.last_error {
                SourceHealth::Unhealthy { error: error.clone() }
            } else if is_stale(&row) {
                SourceHealth::Degraded { 
                    reason: format!("Last poll: {:?}", row.last_polled_at) 
                }
            } else {
                SourceHealth::Healthy
            };
            
            healths.push(SourceHealthEntry {
                source_id: row.id,
                url: row.url,
                health,
            });
        }
        
        Ok(healths)
    }
    
    /// List all sources from database.
    pub async fn list_sources(&self) -> Result<Vec<MediaSourceRow>> {
        self.db.list_all().await
    }
    
    /// Get a specific source by ID.
    pub async fn get_source(&self, source_id: i64) -> Result<Option<MediaSourceRow>> {
        self.db.get_by_id(source_id).await
    }
    
    // ------------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------------
    
    async fn restore_active_sources(&mut self) -> Result<()> {
        let active_sources = self.db.list_active().await?;
        
        for source in active_sources {
            let adapter = match self.adapters.get(&source.adapter_type) {
                Some(a) => a.clone(),
                None => {
                    let _ = self.db.update_error(
                        source.id, 
                        &format!("Adapter '{}' not available", source.adapter_type)
                    ).await;
                    continue;
                }
            };
            
            let capabilities: Vec<SourceCapability> = match serde_json::from_str(&source.capabilities) {
                Ok(c) => c,
                Err(e) => {
                    let _ = self.db.update_error(source.id, &e.to_string()).await;
                    continue;
                }
            };
            
            if capabilities.contains(&SourceCapability::Pull) {
                let config = match deserialize_config(source.config.as_deref()) {
                    Ok(c) => c,
                    Err(e) => {
                        let _ = self.db.update_error(source.id, &e.to_string()).await;
                        continue;
                    }
                };
                
                if let Err(e) = self.start_pull_task(source.id, &source.url, adapter, config).await {
                    let _ = self.db.update_error(source.id, &e.to_string()).await;
                }
            }
            
            if capabilities.contains(&SourceCapability::Push) {
                let _ = self.db.update_error(
                    source.id,
                    "Push source requires re-registration after restart"
                ).await;
            }
        }
        
        Ok(())
    }
    
    async fn start_pull_task(
        &mut self,
        source_id: i64,
        _url: &str,
        adapter: Arc<dyn SourceAdapter>,
        config: Box<dyn SourceConfig>,
    ) -> Result<()> {
        let channel = self.channel.clone();
        let db = self.db.clone();
        let cancel = CancellationToken::new();
        let cancel_clone = cancel.clone();
        
        let interval = std::time::Duration::from_secs(300);
        
        let handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(interval);
            
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        let cursor = match db.get_cursor(source_id).await {
                            Ok(c) => c,
                            Err(e) => {
                                let _ = db.update_error(source_id, &e.to_string()).await;
                                continue;
                            }
                        };
                        
                        match adapter.poll(&config, cursor.as_deref()).await {
                            Ok(output) => {
                                if !output.items.is_empty() {
                                    match channel.ingest_batch(output.items).await {
                                        Ok(_) => {
                                            if let Some(new_cursor) = output.next_cursor {
                                                let _ = db.update_cursor(source_id, &new_cursor).await;
                                            }
                                            let _ = db.update_last_polled(source_id).await;
                                            let _ = db.clear_error(source_id).await;
                                        }
                                        Err(e) => {
                                            let _ = db.update_error(source_id, &e.to_string()).await;
                                        }
                                    }
                                } else {
                                    let _ = db.update_last_polled(source_id).await;
                                }
                            }
                            Err(e) => {
                                let _ = db.update_error(source_id, &e.to_string()).await;
                            }
                        }
                    }
                    _ = cancel_clone.cancelled() => {
                        break;
                    }
                }
            }
        });
        
        self.pull_tasks.insert(source_id, PullTaskHandle {
            _handle: handle,
            cancel,
        });
        
        Ok(())
    }
}

/// Check if a source is stale (hasn't polled recently)
fn is_stale(source: &MediaSourceRow) -> bool {
    if let Some(last_polled) = source.last_polled_at {
        let elapsed = chrono::Utc::now().timestamp_millis() - last_polled;
        elapsed > 10 * 60 * 1000 // 10 minutes
    } else {
        true
    }
}

/// Parse URL scheme
fn parse_scheme(url: &str) -> Result<String> {
    url.split("://")
        .next()
        .map(|s| s.to_lowercase())
        .ok_or_else(|| Error::Other(format!("Invalid URL (no scheme): {}", url)))
}

/// Extension trait for Foundframe to expose media source registry.
#[async_trait::async_trait]
pub trait FoundframeMediaSources {
    /// Get or create the media source registry.
    async fn media_sources(&self) -> Result<&MediaSourceRegistry>;
    
    /// Register a new media source.
    async fn register_media_source(&self, url: &str, config: SourceRegistration) -> Result<i64>;
    
    /// List all media sources.
    async fn list_media_sources(&self) -> Result<Vec<MediaSourceRow>>;
}
