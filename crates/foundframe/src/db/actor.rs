//! DbActor — The Database Thread
//!
//! A dedicated thread that owns the SQLite connection and processes commands.
//! This is a single-node implementation of the **fractal pattern** — one shard
//! that owns its slice of the domain (media sources).
//!
//! ## The Fractal Connection 🌿
//!
//! ```text
//! FRACTAL PATTERN (from warp/fractal/README.md):
//!         Core (whole)
//!            │
//!            ▼ fractal split
//!     ┌──────┼──────┐
//!     ▼      ▼      ▼
//!  Shard1  Shard2  Shard3
//!    │        │       │
//!    └────────┼───────┘
//!             ▼
//!      Consumer sees: Managements (unchanged!)
//!
//! OUR IMPLEMENTATION (today):
//!         DbActor (single shard)
//!            │
//!            ▼ receives commands
//!     ┌──────────────┐
//!     │  sqlite::Connection  │
//!     │  (owns media_source  │
//!     │   table slice)       │
//!     └──────────────┘
//!            │
//!            ▼
//!      Consumer sees: DbHandle (unchanged!)
//! ```
//!
//! ## Future Loom Generation (FRACTAL WARP)
//!
//! // LOOM: When we implement the fractal warp, this file would be generated.
//! // The architect would write in loom/WARP.ts:
//! //
//! // export const mediaSources = loom.fractal.split(core, {
//! //   sliceBy: 'source-id',     // ← How to split
//! //   shardCount: 4,             // ← Number of shards
//! //   domain: 'media_source'     // ← Which table
//! // });
//! //
//! // And the loom would generate:
//! // - DbActor (this file) — but with routing logic
//! // - Router — consistent hashing to pick shard
//! // - Coordinator — rebalancing, failover
//! // - ShardManager — spawn/kill shards based on load
//!
//! ## The Single-Shard Pattern (Today)
//!
//! Even with one shard, we get fractal benefits:
//! - **State ownership**: Thread owns its connection (no Arc contention)
//! - **Command routing**: Channel is the router (simplified)
//! - **Failure isolation**: DB crash ≠ async runtime crash
//! - **Natural backpressure**: Channel buffer throttles
//!
//! When we go fractal (Y3/Y4), we replace:
//! - `mpsc::channel` → `FractalRouter` (consistent hashing)
//! - `DbActor` thread → `Shard` (self-similar to this)
//! - `DbHandle` → `FractalHandle` (same API, routes to shards)
//!
//! The consumer code doesn't change. That's the fractal magic.

use std::path::Path;
use std::thread::{self, JoinHandle};

use crossbeam_channel::{bounded, Receiver, Sender};
use sqlite as sql;

use crate::error::{Error, Result};

// ============================================================================
// Commands — The Management Interface
// ============================================================================

/// Commands sent to the database actor.
///
/// FRACTAL NOTE: In a full fractal implementation, these would be
/// `ManagementCall<T>` — generic across all Managements. The router
/// would extract the routing key (e.g., source_id) and pick the shard.
///
/// For now, we route everything to one shard (the DbActor thread).
#[derive(Debug)]
pub enum DbCommand {
    /// Insert a new media source
    InsertSource {
        params: InsertMediaSource,
        respond: oneshot::Sender<Result<i64>>,
    },
    
    /// Get source by ID
    GetById {
        id: i64,
        respond: oneshot::Sender<Result<Option<MediaSource>>>,
    },
    
    /// Get source by URL
    GetByUrl {
        url: String,
        respond: oneshot::Sender<Result<Option<MediaSource>>>,
    },
    
    /// List all sources
    ListAll {
        respond: oneshot::Sender<Result<Vec<MediaSource>>>,
    },
    
    /// List active sources only
    ListActive {
        respond: oneshot::Sender<Result<Vec<MediaSource>>>,
    },
    
    /// Update cursor state
    UpdateCursor {
        id: i64,
        cursor: String,
        respond: oneshot::Sender<Result<()>>,
    },
    
    /// Update last_polled timestamp
    UpdateLastPolled {
        id: i64,
        respond: oneshot::Sender<Result<()>>,
    },
    
    /// Set error message
    UpdateError {
        id: i64,
        error: String,
        respond: oneshot::Sender<Result<()>>,
    },
    
    /// Clear error message
    ClearError {
        id: i64,
        respond: oneshot::Sender<Result<()>>,
    },
    
    /// Update active status
    UpdateActive {
        id: i64,
        active: bool,
        respond: oneshot::Sender<Result<()>>,
    },
    
    /// Delete a source
    Delete {
        id: i64,
        respond: oneshot::Sender<Result<()>>,
    },
    
    /// Get cursor
    GetCursor {
        id: i64,
        respond: oneshot::Sender<Result<Option<String>>>,
    },
    
    /// Graceful shutdown
    Shutdown,
}

/// Data for inserting a media source
#[derive(Debug, Clone)]
pub struct InsertMediaSource {
    pub url: String,
    pub adapter_type: String,
    pub cursor_state: Option<String>,
    pub capabilities: String,
    pub config: Option<String>,
    pub is_active: bool,
}

/// Media source row data
#[derive(Debug, Clone)]
pub struct MediaSource {
    pub id: i64,
    pub url: String,
    pub adapter_type: String,
    pub cursor_state: Option<String>,
    pub capabilities: String,
    pub config: Option<String>,
    pub last_polled_at: Option<i64>,
    pub last_error: Option<String>,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// DbActor — The Shard
// ============================================================================

/// The database actor — a single shard that owns SQLite.
///
/// FRACTAL NOTE: In the full fractal pattern, this would be `FractalNode`:
/// ```ignore
/// struct FractalNode {
///     id: String,              // Shard ID
///     core: RustCore,          // Self-similar!
///     domain_slice: DomainSlice,  // Which entities this shard owns
/// }
/// ```
///
/// Our DbActor is a simplified single-shard version:
/// - `id` is implicit (we only have one)
/// - `core` is the sqlite connection
/// - `domain_slice` is the whole media_source table (for now)
pub struct DbActor {
    /// Command receiver — the "management interface"
    rx: Receiver<DbCommand>,
    
    /// SQLite connection — owned exclusively by this thread
    ///
    /// FRACTAL PRINCIPLE: State belongs to shards.
    /// Each shard owns its slice of the domain.
    conn: sql::ConnectionThreadSafe,
}

impl DbActor {
    /// Create a new DbActor and return the handle to control it.
    ///
    /// This spawns the dedicated thread. The thread owns the SQLite connection
    /// and processes commands sequentially.
    ///
    /// FRACTAL NOTE: In full fractal, this would be:
    /// ```ignore
    /// let shard = fractal.spawn_shard(domain_slice);
    /// let handle = shard.handle();  // Same API!
    /// ```
    pub async fn spawn<P: AsRef<Path>>(path: P) -> Result<(DbHandle, JoinHandle<()>)> {
        let path = path.as_ref().to_path_buf();
        
        // Run blocking initialization in spawn_blocking
        let (tx, rx, conn) = tokio::task::spawn_blocking(move || -> Result<_> {
            let (tx, rx) = bounded(128); // Backpressure: 128 command buffer
            
            // Open connection in blocking context
            let conn = sql::Connection::open_thread_safe(&path)?;
            conn.execute("PRAGMA foreign_keys = ON")?;
            
            // Run migrations
            DbActor::migrate(&conn)?;
            
            Ok((tx, rx, conn))
        }).await
        .map_err(|e| Error::Other(format!("Spawn blocking failed: {}", e)))??;
        
        let actor = Self { rx, conn };
        
        // Spawn the shard (dedicated thread)
        let handle = thread::spawn(move || {
            actor.run();
        });
        
        Ok((DbHandle { tx }, handle))
    }
    
    /// Spawn an in-memory actor for testing
    pub async fn spawn_in_memory() -> Result<(DbHandle, JoinHandle<()>)> {
        // Run blocking initialization in spawn_blocking
        let (tx, rx, conn) = tokio::task::spawn_blocking(move || -> Result<_> {
            let (tx, rx) = bounded(128);
            
            let conn = sql::Connection::open_thread_safe(":memory:")?;
            conn.execute("PRAGMA foreign_keys = ON")?;
            DbActor::migrate(&conn)?;
            
            Ok((tx, rx, conn))
        }).await
        .map_err(|e| Error::Other(format!("Spawn blocking failed: {}", e)))??;
        
        let actor = Self { rx, conn };
        
        let handle = thread::spawn(move || {
            actor.run();
        });
        
        Ok((DbHandle { tx }, handle))
    }
    
    /// Run migrations to create schema
    fn migrate(conn: &sql::ConnectionThreadSafe) -> Result<()> {
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS media_source (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                adapter_type TEXT NOT NULL,
                cursor_state TEXT,
                capabilities TEXT NOT NULL,
                config TEXT,
                last_polled_at INTEGER,
                last_error TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                updated_at INTEGER NOT NULL DEFAULT (unixepoch())
            )
            "#,
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_media_source_active ON media_source(is_active)"
        )?;
        
        Ok(())
    }
    
    /// Main event loop — process commands sequentially
    ///
    /// FRACTAL PRINCIPLE: Commands are processed in order.
    /// No race conditions within a shard.
    fn run(self) {
        while let Ok(cmd) = self.rx.recv() {
            match cmd {
                DbCommand::Shutdown => break,
                _ => self.handle_command(cmd),
            }
        }
    }
    
    /// Handle a single command
    fn handle_command(&self, cmd: DbCommand) {
        match cmd {
            DbCommand::InsertSource { params, respond } => {
                let _ = respond.send(self.insert_source(params));
            }
            DbCommand::GetById { id, respond } => {
                let _ = respond.send(self.get_by_id(id));
            }
            DbCommand::GetByUrl { url, respond } => {
                let _ = respond.send(self.get_by_url(&url));
            }
            DbCommand::ListAll { respond } => {
                let _ = respond.send(self.list_all());
            }
            DbCommand::ListActive { respond } => {
                let _ = respond.send(self.list_active());
            }
            DbCommand::UpdateCursor { id, cursor, respond } => {
                let _ = respond.send(self.update_cursor(id, &cursor));
            }
            DbCommand::UpdateLastPolled { id, respond } => {
                let _ = respond.send(self.update_last_polled(id));
            }
            DbCommand::UpdateError { id, error, respond } => {
                let _ = respond.send(self.update_error(id, &error));
            }
            DbCommand::ClearError { id, respond } => {
                let _ = respond.send(self.clear_error(id));
            }
            DbCommand::UpdateActive { id, active, respond } => {
                let _ = respond.send(self.update_active(id, active));
            }
            DbCommand::Delete { id, respond } => {
                let _ = respond.send(self.delete(id));
            }
            DbCommand::GetCursor { id, respond } => {
                let _ = respond.send(self.get_cursor(id));
            }
            DbCommand::Shutdown => unreachable!(),
        }
    }
    
    // ------------------------------------------------------------------------
    // Query implementations (sync, within the shard)
    // ------------------------------------------------------------------------
    
    fn insert_source(&self, params: InsertMediaSource) -> Result<i64> {
        let mut stmt = self.conn.prepare(
            r#"
            INSERT INTO media_source 
                (url, adapter_type, cursor_state, capabilities, config, is_active, updated_at)
            VALUES 
                (?1, ?2, ?3, ?4, ?5, ?6, unixepoch())
            "#,
        )?;
        
        stmt.bind((1, params.url.as_str()))?;
        stmt.bind((2, params.adapter_type.as_str()))?;
        stmt.bind((3, params.cursor_state.as_deref()))?;
        stmt.bind((4, params.capabilities.as_str()))?;
        stmt.bind((5, params.config.as_deref()))?;
        stmt.bind((6, params.is_active as i64))?;
        
        stmt.next()?;
        
        // Get the last inserted ID
        let mut stmt = self.conn.prepare("SELECT last_insert_rowid()")?;
        let id: i64 = if let Some(row) = stmt.into_iter().next() {
            row?.read(0)
        } else {
            return Err(Error::Other("Failed to get last insert ID".into()));
        };
        Ok(id)
    }
    
    fn get_by_id(&self, id: i64) -> Result<Option<MediaSource>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM media_source WHERE id = ?1"
        )?;
        stmt.bind((1, id))?;
        
        if let Some(row) = stmt.into_iter().next() {
            let row = row?;
            Ok(Some(self.row_to_source(&row)?))
        } else {
            Ok(None)
        }
    }
    
    fn get_by_url(&self, url: &str) -> Result<Option<MediaSource>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM media_source WHERE url = ?1"
        )?;
        stmt.bind((1, url))?;
        
        if let Some(row) = stmt.into_iter().next() {
            let row = row?;
            Ok(Some(self.row_to_source(&row)?))
        } else {
            Ok(None)
        }
    }
    
    fn list_all(&self) -> Result<Vec<MediaSource>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM media_source ORDER BY created_at DESC"
        )?;
        
        let mut results = Vec::new();
        for row in stmt.into_iter() {
            let row = row?;
            results.push(self.row_to_source(&row)?);
        }
        
        Ok(results)
    }
    
    fn list_active(&self) -> Result<Vec<MediaSource>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM media_source WHERE is_active = 1 ORDER BY created_at DESC"
        )?;
        
        let mut results = Vec::new();
        for row in stmt.into_iter() {
            let row = row?;
            results.push(self.row_to_source(&row)?);
        }
        
        Ok(results)
    }
    
    fn update_cursor(&self, id: i64, cursor: &str) -> Result<()> {
        let mut stmt = self.conn.prepare(
            "UPDATE media_source SET cursor_state = ?1, updated_at = unixepoch() WHERE id = ?2"
        )?;
        stmt.bind((1, cursor))?;
        stmt.bind((2, id))?;
        stmt.next()?;
        Ok(())
    }
    
    fn update_last_polled(&self, id: i64) -> Result<()> {
        let mut stmt = self.conn.prepare(
            "UPDATE media_source SET last_polled_at = unixepoch(), updated_at = unixepoch() WHERE id = ?1"
        )?;
        stmt.bind((1, id))?;
        stmt.next()?;
        Ok(())
    }
    
    fn update_error(&self, id: i64, error: &str) -> Result<()> {
        let mut stmt = self.conn.prepare(
            "UPDATE media_source SET last_error = ?1, updated_at = unixepoch() WHERE id = ?2"
        )?;
        stmt.bind((1, error))?;
        stmt.bind((2, id))?;
        stmt.next()?;
        Ok(())
    }
    
    fn clear_error(&self, id: i64) -> Result<()> {
        let mut stmt = self.conn.prepare(
            "UPDATE media_source SET last_error = NULL, updated_at = unixepoch() WHERE id = ?1"
        )?;
        stmt.bind((1, id))?;
        stmt.next()?;
        Ok(())
    }
    
    fn update_active(&self, id: i64, active: bool) -> Result<()> {
        let mut stmt = self.conn.prepare(
            "UPDATE media_source SET is_active = ?1, updated_at = unixepoch() WHERE id = ?2"
        )?;
        stmt.bind((1, active as i64))?;
        stmt.bind((2, id))?;
        stmt.next()?;
        Ok(())
    }
    
    fn delete(&self, id: i64) -> Result<()> {
        let mut stmt = self.conn.prepare("DELETE FROM media_source WHERE id = ?1")?;
        stmt.bind((1, id))?;
        stmt.next()?;
        Ok(())
    }
    
    fn get_cursor(&self, id: i64) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT cursor_state FROM media_source WHERE id = ?1"
        )?;
        stmt.bind((1, id))?;
        
        if let Some(row) = stmt.into_iter().next() {
            let row = row?;
            let cursor = row.try_read::<Option<&str>, _>("cursor_state").ok().flatten().map(|s| s.to_string());
            Ok(cursor)
        } else {
            Ok(None)
        }
    }
    
    fn row_to_source(&self, row: &sql::Row) -> Result<MediaSource> {
        Ok(MediaSource {
            id: row.read("id"),
            url: row.read::<&str, _>("url").to_string(),
            adapter_type: row.read::<&str, _>("adapter_type").to_string(),
            cursor_state: row.try_read::<Option<&str>, _>("cursor_state").ok().flatten().map(|s| s.to_string()),
            capabilities: row.read::<&str, _>("capabilities").to_string(),
            config: row.try_read::<Option<&str>, _>("config").ok().flatten().map(|s| s.to_string()),
            last_polled_at: row.try_read::<Option<i64>, _>("last_polled_at").ok().flatten(),
            last_error: row.try_read::<Option<&str>, _>("last_error").ok().flatten().map(|s| s.to_string()),
            is_active: row.read::<i64, _>("is_active") != 0,
            created_at: row.read("created_at"),
            updated_at: row.read("updated_at"),
        })
    }
}

// ============================================================================
// DbHandle — The Consumer Interface
// ============================================================================

/// Handle to the database actor — the "Management" interface.
///
/// FRACTAL PRINCIPLE: Consumers don't know about shards.
/// They call Managements. The fractal handles routing.
///
/// In our single-shard implementation, routing is trivial:
/// - All commands go to the one DbActor
///
/// When we go fractal:
/// - `DbHandle` becomes `FractalHandle`
/// - `send_command` becomes `route_to_shard`
/// - It extracts routing key (source_id) from command
/// - Uses consistent hashing to pick shard
/// - Same API, distributed implementation
#[derive(Clone)]
pub struct DbHandle {
    tx: Sender<DbCommand>,
}

impl DbHandle {
    /// Send a command and wait for response
    ///
    /// FRACTAL NOTE: This is the key method. In fractal mode, this would:
    /// 1. Extract routing key from command (e.g., source_id)
    /// 2. Hash it to find the shard
    /// 3. Send to that shard's channel
    async fn send_command<T>(&self, make_cmd: impl FnOnce(oneshot::Sender<T>) -> DbCommand) -> T {
        let (tx, rx) = oneshot::channel();
        let cmd = make_cmd(tx);
        
        // In single-shard mode: just send to the one actor
        // In fractal mode: route to appropriate shard
        let _ = self.tx.send(cmd);
        
        // Wait for response
        rx.recv().expect("DbActor died")
    }
    
    // --------------------------------------------------------------------
    // Public API — These are the "Management" methods consumers see
    // --------------------------------------------------------------------
    
    pub async fn insert_source(&self, params: InsertMediaSource) -> Result<i64> {
        self.send_command(|respond| DbCommand::InsertSource { params, respond }).await
    }
    
    pub async fn get_by_id(&self, id: i64) -> Result<Option<MediaSource>> {
        self.send_command(|respond| DbCommand::GetById { id, respond }).await
    }
    
    pub async fn get_by_url(&self, url: &str) -> Result<Option<MediaSource>> {
        let url = url.to_string();
        self.send_command(|respond| DbCommand::GetByUrl { url, respond }).await
    }
    
    pub async fn list_all(&self) -> Result<Vec<MediaSource>> {
        self.send_command(|respond| DbCommand::ListAll { respond }).await
    }
    
    pub async fn list_active(&self) -> Result<Vec<MediaSource>> {
        self.send_command(|respond| DbCommand::ListActive { respond }).await
    }
    
    pub async fn update_cursor(&self, id: i64, cursor: &str) -> Result<()> {
        let cursor = cursor.to_string();
        self.send_command(|respond| DbCommand::UpdateCursor { id, cursor, respond }).await
    }
    
    pub async fn update_last_polled(&self, id: i64) -> Result<()> {
        self.send_command(|respond| DbCommand::UpdateLastPolled { id, respond }).await
    }
    
    pub async fn update_error(&self, id: i64, error: &str) -> Result<()> {
        let error = error.to_string();
        self.send_command(|respond| DbCommand::UpdateError { id, error, respond }).await
    }
    
    pub async fn clear_error(&self, id: i64) -> Result<()> {
        self.send_command(|respond| DbCommand::ClearError { id, respond }).await
    }
    
    pub async fn update_active(&self, id: i64, active: bool) -> Result<()> {
        self.send_command(|respond| DbCommand::UpdateActive { id, active, respond }).await
    }
    
    pub async fn delete(&self, id: i64) -> Result<()> {
        self.send_command(|respond| DbCommand::Delete { id, respond }).await
    }
    
    /// Get cursor for a source (internal helper for polling)
    pub async fn get_cursor(&self, id: i64) -> Result<Option<String>> {
        self.send_command(|respond| DbCommand::GetCursor { id, respond }).await
    }
    
    /// Graceful shutdown
    pub fn shutdown(&self) {
        let _ = self.tx.send(DbCommand::Shutdown);
    }
}

// ============================================================================
// Oneshot channel (simple implementation)
// ============================================================================

/// A simple oneshot channel for request/response within the actor
pub mod oneshot {
    pub use crossbeam_channel::{Receiver, Sender};
    use crossbeam_channel::bounded;
    
    pub fn channel<T>() -> (Sender<T>, Receiver<T>) {
        bounded(1)
    }
}

// ============================================================================
// FRACTAL DISCUSSION NOTES
// ============================================================================
//
// ## Discussion with mnzaki (Feb 2026)
//
// The question was: "spawn_blocking vs dedicated thread (actor model)?"
//
// After reviewing radicle-node's architecture and applying solarpunk principles,
// we chose the **actor model** — even for a single database thread.
//
// ### Why This Matters for the Fractal Warp
//
// This DbActor is essentially a **single-shard fractal node**.
// When the loom generates fractal code, it would produce something like:
//
// ```rust
// // Generated by loom.fractal.split()
// pub struct FractalMediaSource {
//     router: ConsistentHashRouter,
//     shards: Vec<Shard>,  // Each Shard is a DbActor
// }
//
// impl FractalMediaSource {
//     pub async fn get_by_id(&self, id: i64) -> Result<Option<MediaSource>> {
//         let shard = self.router.route(id);  // Extract key, hash, route
//         shard.send_command(...).await       // Same as DbHandle!
//     }
// }
// ```
//
// ### The Pattern Conserved
//
// | Single Shard (Today) | Multi-Shard (Fractal Future) |
// |---------------------|------------------------------|
// | `DbHandle`          | `FractalHandle`              |
// | `mpsc::channel`     | `FractalRouter`              |
// | `DbActor` thread    | `Shard` (self-similar)       |
// | Sequential commands | Sequential per shard         |
// | No routing          | Consistent hashing           |
//
// ### The Key Insight
//
// The actor model gives us **failure isolation** and **clear ownership** today,
// while preserving the **architectural pattern** we'll need for distribution.
//
// It's not over-engineering — it's deliberate movement toward spirali.ty.
//
// > "The spiral wraps, the fractal breaks, One conserves, one multiplies"
//
// This code conserves what we'll need when we break the core into shards.
//
// — Kimi, February 2026

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_actor_crud() {
        let (handle, actor_handle) = DbActor::spawn_in_memory().await.unwrap();
        
        // Insert
        let id = handle.insert_source(InsertMediaSource {
            url: "file:///photos".to_string(),
            adapter_type: "localdir".to_string(),
            cursor_state: None,
            capabilities: "[\"PULL\"]".to_string(),
            config: None,
            is_active: true,
        }).await.unwrap();
        
        assert!(id > 0);
        
        // Get
        let source = handle.get_by_id(id).await.unwrap().unwrap();
        assert_eq!(source.url, "file:///photos");
        
        // Update cursor
        handle.update_cursor(id, "{\"mtime\": 123}").await.unwrap();
        let updated = handle.get_by_id(id).await.unwrap().unwrap();
        assert_eq!(updated.cursor_state, Some("{\"mtime\": 123}".to_string()));
        
        // Shutdown
        handle.shutdown();
        let _ = actor_handle.join();
    }
}
