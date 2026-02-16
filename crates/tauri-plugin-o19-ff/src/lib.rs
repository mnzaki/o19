//! tauri-plugin-o19-ff: The thinnest possible Tauri layer.
//!
//! This plugin is glue. It contains no domain logic, no business rules, no decisions.
//! It only wires together components that do:
//!
//! - `o19_foundframe`: The domain layer (PKB, TheStream™, events)
//! - `foundframe_to_sql`: The database adapter (event listener → SQLite)
//!
//! # Architecture
//!
//! ```text
//! Frontend (Svelte/Drizzle)
//!     ↓ SQL queries
//! tauri-plugin-o19-ff (this crate)
//!     ↓ EventBus
//! o19_foundframe::TheStream™
//!     ↓ converts
//! TheStreamEvent
//!     ↓
//! foundframe_to_sql
//!     ↓
//! SQLite
//! ```
//!
//! # Philosophy
//!
//! > "The plugin is the foreigner; the domain is native."
//!
//! This layer exists only because Tauri requires it. All meaningful code lives
//! in foundframe crates. This plugin is the thinnest possible wrapper that
//! bridges Tauri's world to our domain.

use std::sync::Arc;

use tauri::{
  Manager, Runtime,
  plugin::{Builder, TauriPlugin},
};
use tracing::info;

use o19_foundframe::signal::EventBus;

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;
pub mod sql_proxy;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Platform;
#[cfg(mobile)]
use mobile::Platform;

/// Extension trait for accessing plugin state.
pub trait O19Extension<R: Runtime> {
  /// Access the platform-specific implementation.
  fn platform(&self) -> &Platform<R>;

  /// Access the event bus.
  fn events(&self) -> &EventBus;

  /// Access the database.
  fn db(&self) -> &foundframe_to_sql::Database;
}

impl<R: Runtime, T: Manager<R>> O19Extension<R> for T {
  fn platform(&self) -> &Platform<R> {
    &self.state::<AppState<R>>().inner().platform
  }

  fn events(&self) -> &EventBus {
    &self.state::<AppState<R>>().inner().events
  }

  fn db(&self) -> &foundframe_to_sql::Database {
    &self.state::<AppState<R>>().inner().db
  }
}

/// Application state managed by the plugin.
pub struct AppState<R: Runtime> {
  /// Platform-specific functionality.
  #[allow(dead_code)]
  platform: Arc<Platform<R>>,

  /// Event bus for component communication.
  events: EventBus,

  /// Database connection.
  db: foundframe_to_sql::Database,

  /// Handle to keep TheStream listener alive.
  #[allow(dead_code)]
  _stream_listener: o19_foundframe::thestream::ListenerHandle,

  /// Handle to keep SQL adapter listener alive.
  #[allow(dead_code)]
  _sql_listener: foundframe_to_sql::ListenerHandle,
}

/// Initialize the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("o19-ff")
    .invoke_handler(tauri::generate_handler![
      commands::ping,
      commands::run_sql,
      commands::url_preview_json,
      commands::html_preview_json,
      commands::media_preview_json,
      commands::convert_jpeg_to_webp,
      commands::compress_webp_to_size,
      commands::request_permissions
    ])
    .setup(|app, api| {
      info!("Initializing o19-ff plugin...");

      // Initialize platform layer
      #[cfg(mobile)]
      let platform = mobile::init(app, api)?;
      #[cfg(desktop)]
      let platform = desktop::init(app, api)?;

      // Set up paths
      let app_data_dir = app.path().app_data_dir()?;
      let pkb_path = app_data_dir.join("pkb");
      let db_path = app_data_dir.join("deardiary.db");

      info!("PKB path: {:?}", pkb_path);
      info!("Database path: {:?}", db_path);

      // Create shared event bus
      let events = EventBus::new();

      // Initialize database and run migrations
      let db = foundframe_to_sql::Database::open(&db_path)?;
      let sql_adapter = foundframe_to_sql::StreamToSql::new(db.clone(), events.clone());
      sql_adapter.migrate()?;
      info!("Database migrations complete");

      // Start SQL adapter listening to TheStream events
      let sql_listener = sql_adapter.start();
      info!("SQL adapter started");

      // TODO: Initialize foundframe PKB service properly
      // This requires setting up the Radicle node, device pairing, etc.
      // For now, we create a minimal TheStream that only emits local events

      // Create a dummy PkbService for now - this will be replaced
      // when we have proper device initialization
      // let pkb = o19_foundframe::pkb::PkbService::new(...)?;

      // For now, TheStream is not fully initialized
      // TODO: Once PkbService is ready:
      // let stream = TheStream::with_pubkey(pkb, events.clone(), device_pubkey);
      // let stream_listener = stream.start_listening();

      // Placeholder listener that does nothing
      let stream_listener = o19_foundframe::thestream::ListenerHandle {
        _handle: std::thread::spawn(|| {}),
      };
      info!("TheStream placeholder initialized");

      // Manage all state
      app.manage(AppState::<R> {
        platform: Arc::new(platform),
        events,
        db,
        _stream_listener: stream_listener,
        _sql_listener: sql_listener,
      });

      info!("o19-ff plugin initialized successfully");
      Ok(())
    })
    .build()
}

// Android JNI initialization
#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JClass, JObject};

#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
pub extern "system" fn Java_ty_circulari_o19_ffi_initRustlsPlatformVerifier(
  mut env: JNIEnv,
  _class: JClass,
  context: JObject,
) {
  match rustls_platform_verifier::android::init_hosted(&mut env, context) {
    Ok(_) => println!("o19-ff: Rustls Platform Verifier initialized"),
    Err(e) => println!("o19-ff: Failed to init verifier: {}", e),
  }
}
