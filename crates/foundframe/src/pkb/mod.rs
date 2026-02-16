//! Personal Knowledge Base (PKB) management.
//!
//! The PKB is a collection of git repositories, each representing a "Directory"
//! of knowledge (notes, screenshots, memes, etc.). Each directory is synced
//! across all paired devices using Radicle's P2P infrastructure.
//!
//! # Architecture
//!
//! ```
//! $BASE_DIR/
//! ├── directories/
//! │   ├── notes/           # Git repo - notes directory
//! │   ├── screenshots/     # Git repo - screenshots directory
//! │   └── memes/           # Git repo - memes directory
//! └── meta/
//!     └── directories.json # Registry of all directories
//! ```
//!
//! # Device Synchronization
//!
//! Each PKB directory has all paired devices configured as git remotes:
//! - Remote name: `{device_alias}_{short_nid}` (e.g., "iphone_8f3a2b")
//! - Remote URL: `rad://{rid}?{nid}` (Radicle URL with namespace)
//!
//! # History Strategy
//!
//! PKB directories use a **history-less** merge strategy. Each device's branch
//! is independent - they don't share common ancestors. This is intentional:
//! - Each device creates its own commits independently
//! - No complex merge conflicts from divergent histories
//! - Content is merged by simple file presence/absence with latest-wins

pub mod chunk;
pub mod directory;
pub mod entry;
pub mod merge;
pub mod service;

pub use chunk::{ChunkId, EntryId, MediaLink, StreamChunk};
pub use directory::{Directory, DirectoryId, DirectoryMeta, DirectoryRegistry};
pub use entry::{Entry, EntryMeta};
pub use merge::{MergeResult, MergeStrategy};
pub use service::PkbService;

/// Timestamp helper - current time in seconds since epoch.
pub(crate) fn now_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
