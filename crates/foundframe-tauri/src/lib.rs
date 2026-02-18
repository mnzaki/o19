//! o19-foundframe-tauri: Platform-agnostic Tauri layer.
//!
//! This plugin is glue. It contains no domain logic - all operations are
//! delegated to the Platform implementation:
//! - Desktop: Direct foundframe integration
//! - Android: Binder IPC to RemoteFoundframe service
//! - iOS: Not implemented (stub)
//!
//! # Architecture
//!
//! ```text
//! Frontend (Svelte/Drizzle)
//!     ↓ Tauri commands
//! o19-foundframe-tauri
//!     ↓ Platform trait
//! ┌─────────────┬─────────────┬─────────────┐
//! │   Desktop   │   Android   │    iOS      │
//! │  (direct)   │  (Binder)   │  (stub)     │
//! └─────────────┴─────────────┴─────────────┘
//! ```

use std::path::PathBuf;
use std::sync::Arc;

use tauri::{
  Emitter, Manager, Runtime,
  plugin::{Builder, TauriPlugin},
};
use tracing::{debug, error, info};

use o19_foundframe::signal::EventBus;
use o19_foundframe::thestream::TheStream;

pub use models::*;
pub use platform::{PairedDeviceInfo, PairingQrResponse, Platform, ScannedPairingData};

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;
mod platform;
pub mod sql_proxy;

pub use error::{Error, Result};

/// Extension trait for accessing plugin state.
pub trait O19Extension<R: Runtime> {
  /// Access the platform implementation.
  fn platform(&self) -> &dyn Platform;

  /// Access the event bus.
  fn events(&self) -> &EventBus;

  /// Access the database.
  fn db(&self) -> &foundframe_to_sql::Database;

  /// Access TheStream for adding content.
  fn stream(&self) -> &TheStream;

  /// Get the database path.
  fn db_path(&self) -> PathBuf;
}

impl<R: Runtime, T: Manager<R>> O19Extension<R> for T {
  fn platform(&self) -> &dyn Platform {
    &*self.state::<AppState>().inner().platform
  }

  fn events(&self) -> &EventBus {
    &self.state::<AppState>().inner().events
  }

  fn db(&self) -> &foundframe_to_sql::Database {
    &self.state::<AppState>().inner().db
  }

  fn stream(&self) -> &TheStream {
    self.state::<AppState>().inner().platform.stream()
  }

  fn db_path(&self) -> PathBuf {
    self.state::<AppState>().inner().db_path.clone()
  }
}

/// Application state managed by the plugin.
pub struct AppState {
  /// Platform-specific implementation.
  platform: Arc<dyn Platform>,

  /// Event bus for component communication.
  events: EventBus,

  /// Database connection.
  db: foundframe_to_sql::Database,

  /// Database path for SQL proxy.
  db_path: PathBuf,

  /// Handle to keep SQL adapter listener alive.
  #[allow(dead_code)]
  _sql_listener: foundframe_to_sql::ListenerHandle,
}

/// Initialize the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("o19-foundframe-tauri")
    .invoke_handler(tauri::generate_handler![
      commands::ping,
      commands::run_sql,
      commands::add_text_note,
      commands::add_post,
      commands::add_bookmark,
      commands::add_media_link,
      commands::add_person,
      commands::add_conversation,
      commands::subscribe_stream_events,
      commands::url_preview_json,
      commands::html_preview_json,
      commands::media_preview_json,
      commands::convert_jpeg_to_webp,
      commands::compress_webp_to_size,
      commands::request_permissions,
      // Camera commands
      commands::start_camera,
      commands::stop_camera,
      commands::capture_photo,
      commands::set_camera_mode,
      commands::is_camera_active,
      commands::request_camera_permissions,
      commands::check_camera_permissions,
      // Device pairing commands
      commands::generate_pairing_qr,
      commands::parse_pairing_url,
      commands::confirm_pairing,
      commands::check_followers_and_pair,
      commands::list_paired_devices,
      commands::unpair_device,
      // Service status
      commands::check_service_status,
      commands::start_service,
    ])
    .setup(|app, api| {
      // Initialize logging first
      o19_foundframe::setup_logging();

      info!("Initializing o19-foundframe-tauri plugin...");

      // Register Android plugin (noop on desktop)
      #[cfg(target_os = "android")]
      let plugin_handle = {
        info!("Registering ApiPlugin for Android...");
        api.register_android_plugin("ty.circulari.o19.ff", "ApiPlugin")?
      };
      #[cfg(not(target_os = "android"))]
      let plugin_handle = ();

      // Initialize platform implementation
      #[cfg(mobile)]
      let platform = mobile::init(app, api, plugin_handle)?;
      #[cfg(desktop)]
      let platform = desktop::init(app, api)?;

      let app_data_dir = app.path().app_data_dir()?;
      let db_path = app_data_dir.join("deardiary.db");
      info!("Database path: {:?}", db_path);

      // Initialize database (same on all platforms)
      let db = foundframe_to_sql::Database::open(&db_path)?;
      let sql_adapter =
        foundframe_to_sql::StreamToSql::new(db.clone(), platform.event_bus().clone());
      sql_adapter.migrate()?;
      info!("Database migrations complete");

      // Start SQL adapter listening to events
      let sql_listener = sql_adapter.start();
      info!("SQL adapter started");

      // Clone event bus before moving platform
      let events = platform.event_bus().clone();

      // Set up event forwarding to frontend
      setup_event_forwarding(app, &events)?;

      // Manage all state
      app.manage(AppState {
        platform: Arc::new(platform),
        events,
        db,
        db_path: db_path.clone(),
        _sql_listener: sql_listener,
      });

      info!("o19-foundframe-tauri plugin initialized successfully");
      Ok(())
    })
    .on_event(|app: &tauri::AppHandle<R>, event| {
      if let tauri::RunEvent::Exit = event {
        info!("Received Exit event, shutting down...");

        if let Some(state) = app.try_state::<AppState>() {
          if let Err(e) = state.platform.shutdown() {
            error!("Error during platform shutdown: {}", e);
          } else {
            info!("Platform shut down successfully");
          }
        }
      }
    })
    .build()
}

/// Set up forwarding of events to the frontend via Tauri events.
fn setup_event_forwarding<R: Runtime>(app: &tauri::AppHandle<R>, events: &EventBus) -> Result<()> {
  use o19_foundframe::thestream::TheStreamEvent;

  let rx = events.subscribe::<TheStreamEvent>();
  let app_handle = app.clone();

  std::thread::spawn(move || {
    while let Ok(event) = rx.recv() {
      let event_type = match &event {
        TheStreamEvent::ChunkAdded { .. } => "chunk-added",
        TheStreamEvent::EntryPulled { .. } => "entry-pulled",
        TheStreamEvent::ChunkUpdated { .. } => "chunk-updated",
        TheStreamEvent::ChunkRemoved { .. } => "chunk-removed",
        TheStreamEvent::SyncStarted { .. } => "sync-started",
        TheStreamEvent::SyncCompleted { .. } => "sync-completed",
        TheStreamEvent::SyncFailed { .. } => "sync-failed",
      };

      if let Err(e) = app_handle.emit(event_type, event) {
        error!("Failed to emit stream event to frontend: {}", e);
      }
    }
  });

  debug!("Event forwarding to frontend set up");
  Ok(())
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
    Ok(_) => println!("o19-foundframe-tauri: Rustls Platform Verifier initialized"),
    Err(e) => println!("o19-foundframe-tauri: Failed to init verifier: {}", e),
  }
}
