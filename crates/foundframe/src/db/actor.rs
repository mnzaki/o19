//! DbActor — The Database Thread
//!
//! A dedicated thread that owns the SQLite connection and processes commands.
//! This is a single-node implementation of the **fractal pattern**.

// Re-export everything from generated implementation
#[path = "../../spire/src/db/actor_impl.gen.rs"]
mod actor_impl;
pub use actor_impl::*;

// Re-export commands and handle from their generated modules
#[path = "../../spire/src/db/commands.gen.rs"]
pub mod commands;
pub use commands::DbCommand;

// Re-export all entity filters and idens
pub use commands::*;

#[path = "../../spire/src/db/handle.gen.rs"]
pub mod handle;
pub use handle::DbHandle;
