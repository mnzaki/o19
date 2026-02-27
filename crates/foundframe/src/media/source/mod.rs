//! Media Source Registry — Manages external media sources.
//!
//! TEMPORARILY STUBBED for DbActor refactoring.
//!
//! The registry needs granular update operations (update_last_polled, update_error, 
//! update_active) that aren't in the generated MediaSourceDb trait. This requires
//! spire-loom template enhancement to support field-specific updates.
//!
//! TODO: Restore full implementation after spire-loom generates:
//! - Internal field update methods on DbHandle, OR
//! - A way to execute raw SQL through DbHandle for domain operations

use std::collections::HashMap;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;

use crate::db::{DbHandle, MediaSourceData, MediaSourceDb};
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
    _handle: tokio::task::JoinHandle<()>,
    cancel: CancellationToken,
}

/// Handle for an active push endpoint
struct PushEndpointHandle {
    endpoint_id: String,
    _cancel: CancellationToken,
}

/// Central registry for all media sources (push and pull).
///
/// STUB: Minimal implementation restored after spire-loom generates
/// field-specific update methods.
pub struct MediaSourceRegistry {
    db: DbHandle,
    pkb: Arc<PkbService>,
    pull_tasks: HashMap<i64, PullTaskHandle>,
    push_endpoints: HashMap<i64, PushEndpointHandle>,
    adapters: HashMap<String, Arc<dyn SourceAdapter>>,
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
        
        // TODO: Restore active sources after spire-loom generates field updates
        // registry.restore_active_sources().await?;
        
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
        let capabilities = serde_json::to_value(&adapter.capabilities())
            .map_err(|e| Error::Other(format!("Failed to serialize capabilities: {}", e)))?;
        
        // Insert into database using generated trait
        let data = MediaSourceData {
            id: 0,
            url: url.to_string(),
            adapter_type: scheme,
            cursor_state: None,
            capabilities,
            config: Some(serde_json::from_str(&config_json).unwrap_or_default()),
            last_polled_at: None,
            last_error: None,
            is_active: true,
            created_at: 0,
            updated_at: 0,
        };
        
        let source_id = self.db.insert_mediasource(data).await?;
        
        // TODO: Start polling task after field updates available
        // self.start_pull_task(source_id, url, adapter.clone(), pull_config).await?;
        
        Ok(source_id)
    }
    
    /// Register a push-based source (it sends to us).
    pub async fn register_push(
        &mut self,
        _url: &str,
        _config: PushConfig,
    ) -> Result<i64> {
        // TODO: Restore after spire-loom generates field-specific updates
        // Need update_active, update_last_polled, update_error
        Err(Error::Other("Push sources temporarily disabled pending spire-loom updates".into()))
    }
    
    /// Unregister a source and stop its task/endpoint.
    pub async fn unregister(&mut self, source_id: i64) -> Result<()> {
        // Stop any active task
        if let Some(handle) = self.pull_tasks.remove(&source_id) {
            handle.cancel.cancel();
        }
        if let Some(handle) = self.push_endpoints.remove(&source_id) {
            // TODO: Teardown push endpoint
            let _ = handle;
        }
        
        // Delete from database
        self.db.delete_mediasource(source_id).await?;
        
        Ok(())
    }
    
    /// List all registered sources.
    pub async fn list_sources(&self) -> Result<Vec<MediaSourceData>> {
        use crate::db::MediaSourceFilter;
        self.db.list_mediasources(None, None, MediaSourceFilter::new()).await
    }
    
    /// Get a specific source by ID.
    pub async fn get_source(&self, source_id: i64) -> Result<Option<MediaSourceData>> {
        self.db.get_mediasource_by_id(source_id).await
    }
    
    /// Poll a source immediately (manual trigger).
    pub async fn poll_now(&self, _source_id: i64) -> Result<PollResult> {
        // TODO: Restore after field updates available
        Err(Error::Other("Manual polling temporarily disabled pending spire-loom updates".into()))
    }
    
    /// Get health status for all sources.
    pub async fn health_check(&self) -> Vec<SourceHealthEntry> {
        // TODO: Implement health check after field updates available
        Vec::new()
    }
    
    // ========================================================================
    // Internal Methods (TODO: Restore after spire-loom field updates)
    // ========================================================================
    
    /*
    async fn restore_active_sources(&mut self) -> Result<()> {
        // Needs: list_active() or filter by isActive
        let sources = self.db.list_mediasources(None, None).await?;
        for source in sources {
            if source.is_active {
                // Restore the source...
            }
        }
        Ok(())
    }
    
    async fn start_pull_task(&mut self, source_id: i64, ...) -> Result<()> {
        // Needs: update_last_polled, update_error
        // ...
    }
    
    async fn do_pull(&self, source: &MediaSourceData) -> Result<PollResult> {
        // Needs: get_cursor, update_cursor, update_last_polled, update_error
        // ...
    }
    */
}

/// Parse the scheme from a URL (e.g., "file:///foo" -> "file").
fn parse_scheme(url: &str) -> Result<String> {
    url.split("://")
        .next()
        .map(|s| s.to_string())
        .ok_or_else(|| Error::Other(format!("Invalid URL (no scheme): {}", url)))
}

/// Trait for accessing the media source registry from the main Foundframe.
pub trait FoundframeMediaSources {
    async fn media_sources(&self) -> Result<&MediaSourceRegistry>;
    async fn list_media_sources(&self) -> Result<Vec<MediaSourceData>>;
}
