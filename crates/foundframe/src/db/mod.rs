pub use streamEntry_trait::StreamEntryDb;
pub use streamEntry_data::StreamEntryData;
pub use mediaSource_trait::MediaSourceDb;
pub use mediaSource_data::MediaSourceData;
pub use bookmark_data::BookmarkData;
pub use bookmark_trait::BookmarkDb;
pub use conversation_data::ConversationData;
pub use conversation_trait::ConversationDb;
pub use media_data::MediaData;
pub use media_trait::MediaDb;
pub use mediasource_data::MediaSourceData;
pub use mediasource_trait::MediaSourceDb;
pub use person_data::PersonData;
pub use person_trait::PersonDb;
pub use post_data::PostData;
pub use post_trait::PostDb;
pub use streamentry_data::StreamEntryData;
pub use streamentry_trait::StreamEntryDb;
pub use view_data::ViewData;

/// Database layer — SQLite via Actor Model
///
/// The database is accessed through a dedicated thread (DbActor) that owns
/// the SQLite connection. This provides:
/// - **Failure isolation**: DB crash ≠ async runtime crash
/// - **Clear ownership**: One thread owns one connection
/// - **Natural backpressure**: Channel buffer throttles requests
/// - **Fractal readiness**: Same pattern scales to sharded architecture
///
/// See `actor.rs` for the full fractal discussion and implementation.
pub use view_trait::ViewDb;
pub mod oneshot;

#[path = "../../spire/src/db/entities/streamEntry_trait.gen.rs"]
pub mod streamEntry_trait;
#[path = "../../spire/src/db/entities/streamEntry_data.gen.rs"]
pub mod streamEntry_data;
#[path = "../../spire/src/db/entities/mediaSource_trait.gen.rs"]
pub mod mediaSource_trait;
#[path = "../../spire/src/db/entities/mediaSource_data.gen.rs"]
pub mod mediaSource_data;
pub mod actor;
#[path = "../../spire/src/db/entities/bookmark_data.gen.rs"]
pub mod bookmark_data;
#[path = "../../spire/src/db/entities/bookmark_trait.gen.rs"]
pub mod bookmark_trait;
#[path = "../../spire/src/db/entities/conversation_data.gen.rs"]
pub mod conversation_data;
#[path = "../../spire/src/db/entities/conversation_trait.gen.rs"]
pub mod conversation_trait;
pub mod indexer;
#[path = "../../spire/src/db/entities/media_data.gen.rs"]
pub mod media_data;
#[path = "../../spire/src/db/entities/media_trait.gen.rs"]
pub mod media_trait;
#[path = "../../spire/src/db/entities/mediasource_data.gen.rs"]
pub mod mediasource_data;
#[path = "../../spire/src/db/entities/mediasource_trait.gen.rs"]
pub mod mediasource_trait;
#[path = "../../spire/src/db/entities/person_data.gen.rs"]
pub mod person_data;
#[path = "../../spire/src/db/entities/person_trait.gen.rs"]
pub mod person_trait;
#[path = "../../spire/src/db/entities/post_data.gen.rs"]
pub mod post_data;
#[path = "../../spire/src/db/entities/post_trait.gen.rs"]
pub mod post_trait;
#[path = "../../spire/src/db/entities/streamentry_data.gen.rs"]
pub mod streamentry_data;
#[path = "../../spire/src/db/entities/streamentry_trait.gen.rs"]
pub mod streamentry_trait;
#[path = "../../spire/src/db/entities/view_data.gen.rs"]
pub mod view_data;
#[path = "../../spire/src/db/entities/view_trait.gen.rs"]
pub mod view_trait;

// Re-export all entity filters and idens from commands
pub use actor::*;

// DbHandle is defined in handle.gen.rs which is included by actor.rs
pub use actor::handle::DbHandle;

pub use indexer::start_indexer;
