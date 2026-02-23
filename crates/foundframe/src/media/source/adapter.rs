//! Source Adapter Trait
//!
//! The `SourceAdapter` trait defines the interface for all media source types.
//! Each adapter (local directory, webhook, RSS, etc.) implements this trait.

use async_trait::async_trait;

use crate::error::Result;

use super::types::{MediaItem, PollOutput, PullConfig, PushConfig, SourceCapability};

/// Adapter for a specific source type (e.g., localdir, webhook, rss).
///
/// This is the extension point for new source types. Each adapter
/// knows how to handle a specific URL scheme in one or more modes.
#[async_trait]
pub trait SourceAdapter: Send + Sync {
    /// Returns the capabilities this adapter supports.
    fn capabilities(&self) -> Vec<SourceCapability>;
    
    // ------------------------------------------------------------------------
    // Pull Mode
    // ------------------------------------------------------------------------
    
    /// Create pull-specific configuration.
    fn create_pull_config(&self, url: &str, config: PullConfig) -> Result<Box<dyn SourceConfig>>;
    
    /// Validate that a pull source is accessible.
    async fn validate_pull(&self, config: &Box<dyn SourceConfig>) -> Result<()>;
    
    /// Poll the source for new items.
    ///
    /// The cursor is the serialized state from the last poll (opaque to adapter).
    async fn poll(
        &self,
        config: &Box<dyn SourceConfig>,
        cursor: Option<&str>,
    ) -> Result<PollOutput>;
    
    // ------------------------------------------------------------------------
    // Push Mode
    // ------------------------------------------------------------------------
    
    /// Create push-specific configuration.
    fn create_push_config(&self, url: &str, config: PushConfig) -> Result<Box<dyn SourceConfig>>;
    
    /// Setup a push endpoint (webhook, subscription, etc.).
    ///
    /// Returns an endpoint ID that can be used to teardown later.
    async fn setup_push_endpoint(&self, config: &Box<dyn SourceConfig>) -> Result<String>;
    
    /// Teardown a push endpoint.
    async fn teardown_push_endpoint(&self, endpoint_id: &str) -> Result<()>;
    
    /// Register a callback for push events.
    ///
    /// The adapter calls this when it receives data from the external system.
    /// Using Box<dyn Fn> instead of generics for dyn compatibility.
    fn on_push_event(
        &self, 
        endpoint_id: &str, 
        callback: Box<dyn Fn(Vec<MediaItem>) + Send + 'static>
    );
}

/// Type-erased source configuration (adapter-specific)
pub trait SourceConfig: Send + Sync + std::any::Any {
    fn as_any(&self) -> &dyn std::any::Any;
    /// Serialize to JSON for DB storage
    fn serialize_json(&self) -> Result<String>;
}

/// Deserialize config from JSON (adapter must know the type)
pub fn deserialize_config(_json: Option<&str>) -> Result<Box<dyn SourceConfig>> {
    // SPIRAL: This is where we'd need type info from the adapter
    // For now, adapters will need to deserialize their own configs
    todo!("Deserialization requires adapter-specific type knowledge")
}
