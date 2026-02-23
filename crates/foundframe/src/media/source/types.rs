//! Media Source Types
//!
//! Core data types for the media source system:
//! - Configuration structs (PullConfig, PushConfig)
//! - Media items and locations
//! - Health status and poll results

use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

// ============================================================================
// Configuration Types
// ============================================================================

/// Configuration for pull-based sources
#[derive(Clone)]
pub struct PullConfig {
    /// How often to poll
    pub interval: Duration,
    /// Timeout for each poll operation
    pub timeout: Duration,
    /// Max items to fetch per poll
    pub batch_size: usize,
    
    /// Maximum system load (1-min average) before pausing polls.
    /// 
    /* TODO DISCUSS: System load units are platform-specific:
     * - Linux/Unix: 1-min load average (from /proc/loadavg)
     *   - 1.0 = 1 process waiting on CPU (per CPU core)
     *   - 4.0 on 4-core = fully saturated
     * - Windows: No direct equivalent. Options:
     *   a) Processor Queue Length (number of threads waiting)
     *   b) CPU % utilization (simpler but less precise)
     *   c) Use sysinfo crate's load_average() which returns 0 on Windows
     *      (would need fallback strategy)
     * - macOS: Same as Linux (Unix-based)
     * 
     * SPIRAL: Cross-platform strategy needed:
     *   Option A: Abstract LoadUnit enum { UnixLoad(f64), WindowsQueue(u32), CpuPercent(u8) }
     *   Option B: Always use CPU % (portable but less accurate for IO-bound)
     *   Option C: Use sysinfo + graceful degradation (Windows = disable load limiting)
     *   
     * Recommendation: Start with Option C (sysinfo), add platform-specific
     * backends as needed. Document that load limiting is "best effort".
     */
    pub max_system_load: f64,
    
    /// Maximum concurrent poll operations across all sources.
    /// This limits parallelism to prevent overwhelming the system.
    pub max_concurrent_polls: usize,
    
    /// Backoff multiplier when load is high.
    /// Each retry waits `interval * backoff^n` until max_delay.
    pub load_backoff_multiplier: f64,
    
    /// Maximum delay when backing off due to load.
    pub max_backoff_delay: Duration,
}

impl Default for PullConfig {
    fn default() -> Self {
        Self {
            interval: Duration::from_secs(300), // 5 minutes
            timeout: Duration::from_secs(30),
            batch_size: 100,
            max_system_load: 2.0, // 2x CPU cores (conservative)
            max_concurrent_polls: 3, // Don't swamp the system
            load_backoff_multiplier: 2.0,
            max_backoff_delay: Duration::from_secs(3600), // 1 hour max
        }
    }
}

/// Configuration for push-based sources
#[derive(Clone)]
pub struct PushConfig {
    /// Secret for webhook validation (HMAC signature)
    pub secret: Option<String>,
    /// Filter rules for incoming events
    pub filters: Vec<EventFilter>,
}

/// Filter for push events
#[derive(Clone)]
pub struct EventFilter {
    /// Field to filter on (e.g., "content_type", "source")
    pub field: String,
    /// Match operator
    pub op: FilterOp,
    /// Value to match
    pub value: String,
}

/// Filter operators
#[derive(Clone)]
pub enum FilterOp {
    Equals,
    Contains,
    StartsWith,
    Regex,
}

// ============================================================================
// Result Types
// ============================================================================

/// Result of a manual poll
pub struct PollResult {
    pub items_found: usize,
    pub items_new: usize,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

/// Health status of a source
pub enum SourceHealth {
    Healthy,
    Degraded { reason: String },
    Unhealthy { error: String },
    Unknown,
}

/// Health entry with source metadata
pub struct SourceHealthEntry {
    pub source_id: i64,
    pub url: String,
    pub health: SourceHealth,
}

// ============================================================================
// Media Item Types
// ============================================================================

/// A media item discovered by a source.
///
/// This is the common format that all sources produce.
/// The IngestionChannel normalizes these into PKB StreamChunks.
#[derive(Debug, Clone)]
pub struct MediaItem {
    /// Unique ID from the source (used for deduplication)
    pub source_id: String,
    
    /// Source URL that produced this item
    pub source_url: String,
    
    /// When this item was discovered by us
    pub discovered_at: chrono::DateTime<chrono::Utc>,
    
    /// When the item was created/modified at the source (if available)
    pub source_modified_at: Option<chrono::DateTime<chrono::Utc>>,
    
    /// Content type (MIME type)
    pub content_type: String,
    
    /// Either a URL or local path
    pub location: MediaLocation,
    
    /// File size if known
    pub size_bytes: Option<u64>,
    
    /// Content hash if available (for deduplication)
    pub content_hash: Option<String>,
    
    /// Metadata from the source
    pub metadata: serde_json::Value,
}

/// Location of media content
#[derive(Debug, Clone)]
pub enum MediaLocation {
    /// URL that can be fetched
    Url(String),
    /// Local filesystem path
    LocalPath(PathBuf),
    /// Content is inline (small items)
    Inline(Vec<u8>),
}

/// Result of batch ingestion
pub struct BatchResult {
    pub processed: usize,
    pub skipped_duplicate: usize,
    pub failed: Vec<(String, String)>, // (source_id, error)
}

// ============================================================================
// Capabilities
// ============================================================================

/// Capabilities a source adapter can have
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SourceCapability {
    /// Can be polled (pull)
    Pull,
    /// Can receive push events
    Push,
    /// Supports real-time streaming (WebSocket, SSE)
    Stream,
}

/// Output from a poll operation
pub struct PollOutput {
    /// Items discovered
    pub items: Vec<MediaItem>,
    /// Cursor for resuming next poll (serialized state)
    pub next_cursor: Option<String>,
    /// Whether there are more items available now
    pub has_more: bool,
}

/// Configuration for registering a new source
pub enum SourceRegistration {
    Pull(PullConfig),
    Push(PushConfig),
}
