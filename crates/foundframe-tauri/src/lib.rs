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

//use foundframe_to_sql::ListenerHandle;
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
#[path = "../spire/src/desktop_mainline_bridge.rs"]
pub mod desktop_mainline_bridge;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;
mod platform;
//pub mod sql_proxy;

pub use error::{Error, Result};

/// Extension trait for accessing plugin state.
pub trait O19Extension<R: Runtime> {
  /// Access the platform implementation.
  fn platform(&self) -> &dyn Platform;

  /// Access the event bus.
  fn events(&self) -> &EventBus;

  /// Access the database.
  //fn db(&self) -> &foundframe_to_sql::Database;

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

  //fn db(&self) -> &foundframe_to_sql::Database {
  //  &self.state::<AppState>().inner().db
  //}

  fn db_path(&self) -> PathBuf {
    self.state::<AppState>().inner().db_path.clone()
  }

  fn stream(&self) -> &TheStream {
    &self.state::<AppState>().inner().platform.stream()
  }
}

/// Application state for foundframe-specific items.
pub struct AppState {
  /// Platform-specific implementation.
  pub platform: Arc<dyn Platform>,

  /// Event bus for component communication (foundframe-specific).
  pub events: EventBus,

  /// Database connection (manually managed, not generated).
  //pub db: foundframe_to_sql::Database,
  pub db_path: PathBuf,
  //// sql_listener to keep it alive
  //_sql_listener: ListenerHandle,
}

/// Initialize the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("o19-foundframe-tauri")
    .invoke_handler(tauri::generate_handler![
      // User commands (kept in src/commands.rs)
      commands::ping,
      //commands::run_sql,
      commands::subscribe_stream_events,
      commands::url_preview_json,
      commands::html_preview_json,
      commands::media_preview_json,
      commands::convert_jpeg_to_webp,
      commands::compress_webp_to_size,
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
      commands::check_followers_and_pair,
      // Service status
      commands::check_service_status,
      commands::start_service,
      /* SPIRE_COMMANDS_START */
      // Bookmark commands
      crate::spire::commands::bookmark_add_bookmark,
      crate::spire::commands::bookmark_get_bookmark,
      crate::spire::commands::bookmark_list_bookmarks,
      crate::spire::commands::bookmark_delete_bookmark,
      // Device commands
      crate::spire::commands::device_generate_pairing_code,
      crate::spire::commands::device_confirm_pairing,
      crate::spire::commands::device_unpair_device,
      crate::spire::commands::device_list_paired_devices,
      crate::spire::commands::device_follow_device,
      crate::spire::commands::device_unfollow_device,
      crate::spire::commands::device_list_followers,
      crate::spire::commands::device_is_following,
      // Media commands
      crate::spire::commands::media_add_media_link,
      crate::spire::commands::media_add_media_file,
      crate::spire::commands::media_get_media,
      crate::spire::commands::media_list_media,
      crate::spire::commands::media_delete_media,
      // Person commands
      crate::spire::commands::person_add_person,
      crate::spire::commands::person_get_person_by_handle,
      crate::spire::commands::person_list_people,
      crate::spire::commands::person_update_person,
      crate::spire::commands::person_delete_person,
      // Post commands
      crate::spire::commands::post_add_post,
      crate::spire::commands::post_get_post,
      crate::spire::commands::post_list_posts,
      crate::spire::commands::post_update_post,
      crate::spire::commands::post_delete_post,
      // Conversation commands
      crate::spire::commands::conversation_add_conversation,
      crate::spire::commands::conversation_get_conversation,
      crate::spire::commands::conversation_list_conversations,
      crate::spire::commands::conversation_update_conversation,
      crate::spire::commands::conversation_delete_conversation,
      crate::spire::commands::conversation_add_participant,
      crate::spire::commands::conversation_remove_participant,
      crate::spire::commands::conversation_list_participants,
      crate::spire::commands::conversation_add_conversation_media,
      crate::spire::commands::conversation_remove_conversation_media,
      crate::spire::commands::conversation_list_conversation_media,
      /* SPIRE_COMMANDS_END */
    ])
    .setup(|app, api| {
      o19_foundframe::setup_logging();

      // Initialize foundframe (we own the creation)
      let app_data_dir = app.path().app_data_dir()?;
      let radicle_home = app_data_dir.join(".foundframe.radicle");

      let init_options = o19_foundframe::InitOptions::new(&radicle_home, "foundframe")
        .pkb_base(PathBuf::from("pkb"));

      // Clone for the exit callback
      let exit_handle = app.clone();
      let on_runtime_exit = Some(Box::new(move || {
        tracing::info!("Radicle runtime exited, shutting down via Tauri...");
        exit_handle.exit(0);
      }) as Box<dyn FnOnce() + Send>);

      let foundframe = o19_foundframe::init(init_options, on_runtime_exit)
        .map_err(|e| Error::Other(format!("Failed to initialize foundframe: {e}")))?;

      info!("Foundframe initialized successfully");

      // Create platform using src/desktop.rs (which implements src/platform.rs::Platform)
      #[cfg(desktop)]
      let platform = std::sync::Arc::new(desktop::DesktopPlatform::from_foundframe(app.clone(), foundframe)?)
        as std::sync::Arc<dyn Platform>;
      #[cfg(mobile)]
      let platform = std::sync::Arc::new(mobile::init(app, api, None)?) as std::sync::Arc<dyn Platform>;

      // Initialize foundframe-specific state
      let db_path = app_data_dir.join("deardiary.db");
      info!("Database path: {:?}", db_path);

      // Clone event bus before moving platform
      let events = platform.event_bus().clone();
      // Set up event forwarding to frontend
      setup_event_forwarding(app, &events)?;

      app.manage(AppState {
        platform,
        events,
        db_path: db_path.clone(),
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
pub fn setup_event_forwarding<R: Runtime>(
  app: &tauri::AppHandle<R>,
  events: &EventBus,
) -> Result<()> {
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

#[path = "../spire/src/lib.rs"]
pub mod spire;
