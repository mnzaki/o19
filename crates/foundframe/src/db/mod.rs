//! Database layer — SQLite via Actor Model
//!
//! The database is accessed through a dedicated thread (DbActor) that owns
//! the SQLite connection. This provides:
//! - **Failure isolation**: DB crash ≠ async runtime crash
//! - **Clear ownership**: One thread owns one connection
//! - **Natural backpressure**: Channel buffer throttles requests
//! - **Fractal readiness**: Same pattern scales to sharded architecture
//!
//! See `actor.rs` for the full fractal discussion and implementation.

pub mod actor;
pub mod indexer;

pub use actor::{DbActor, DbCommand, DbHandle, InsertMediaSource, MediaSource};

pub use indexer::start_indexer;
