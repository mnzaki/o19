use std::sync::Mutex;
use std::thread;

use tracing::{debug, error, info};
use tracing_subscriber::{EnvFilter, prelude::*};

pub mod device;
pub mod error;
pub mod pkb;
pub mod preview;
pub mod signal;

// TheStream™ and entity modules
pub mod bookmark;
pub mod conversation;
pub mod media;
pub mod person;
pub mod post;
pub mod thestream;

pub mod log;

pub use error::{Error, Result};

use pkb::radicle;

/// Configuration for initializing Foundframe.
#[derive(Debug, Clone)]
pub struct InitOptions {
  /// Path to Radicle home directory (where node config, keys, and storage live).
  pub radicle_home: std::path::PathBuf,
  /// Optional base path for PKB checkouts. If None, no working directory checkouts are maintained.
  pub pkb_base: Option<std::path::PathBuf>,
  /// Node alias (human-readable name for this node).
  pub node_alias: String,
  /// Optional passphrase for encrypting the node's secret key.
  pub passphrase: Option<String>,
  /// Listen address for the node (defaults to 0.0.0.0:6776 if not specified).
  pub listen: Option<std::net::SocketAddr>,
}

impl InitOptions {
  /// Create new init options with required fields.
  pub fn new(radicle_home: impl Into<std::path::PathBuf>, node_alias: impl Into<String>) -> Self {
    Self {
      radicle_home: radicle_home.into(),
      pkb_base: None,
      node_alias: node_alias.into(),
      passphrase: None,
      listen: None,
    }
  }

  /// Set the PKB base path.
  pub fn pkb_base(mut self, path: impl Into<std::path::PathBuf>) -> Self {
    self.pkb_base = Some(path.into());
    self
  }

  /// Set no PKB base path (for mobile scenarios where checkout isn't maintained).
  pub fn no_pkb_base(mut self) -> Self {
    self.pkb_base = None;
    self
  }

  /// Set the passphrase.
  pub fn passphrase(mut self, pass: impl Into<String>) -> Self {
    self.passphrase = Some(pass.into());
    self
  }

  /// Set the listen address.
  pub fn listen(mut self, addr: std::net::SocketAddr) -> Self {
    self.listen = Some(addr);
    self
  }
}

/// Foundframe holds the runtime components.
pub struct Foundframe {
  /// Handle to the runtime thread for joining on shutdown.
  runtime_thread: Option<std::thread::JoinHandle<()>>,

  /// Handle to the Radicle node for operations.
  node_handle: radicle::NodeHandle,

  /// Event bus for internal communication.
  events: signal::EventBus,

  /// PKB base path (if configured).
  pkb_base: Option<std::path::PathBuf>,

  /// TheStream instance (lazily initialized).
  thestream: Mutex<Option<thestream::TheStream>>,
}

impl Foundframe {
  /// Get a reference to the event bus.
  pub fn events(&self) -> &signal::EventBus {
    &self.events
  }

  /// Get a clone of the event bus.
  pub fn events_clone(&self) -> signal::EventBus {
    self.events.clone()
  }

  /// Get a reference to the node handle.
  pub fn node(&self) -> &radicle::NodeHandle {
    &self.node_handle
  }

  /// Get the PKB base path (if configured).
  pub fn pkb_base(&self) -> Option<&std::path::Path> {
    self.pkb_base.as_deref()
  }

  /// Create a PKB service using this Foundframe's node and event bus.
  ///
  /// If `pkb_base` was not configured during init, this returns an error.
  pub fn create_pkb_service(&self) -> Result<pkb::PkbService> {
    let pkb_path = self
      .pkb_base
      .as_ref()
      .ok_or_else(|| Error::Other("PKB base path not configured".into()))?;
    std::fs::create_dir_all(&pkb_path)?;

    // Create a new node handle for the device manager
    // (NodeHandle doesn't implement Clone, but creating a new one is cheap)
    let node_handle_for_devices = radicle::NodeHandle::new()?;
    let device_manager = device::DeviceManager::new(node_handle_for_devices);

    // Create another node handle for the PKB service
    let node_handle_for_pkb = radicle::NodeHandle::new()?;

    pkb::PkbService::with_event_bus(
      &pkb_path,
      node_handle_for_pkb,
      device_manager,
      self.events.clone(),
    )
  }

  /// Execute a function with TheStream (lazily initialized on first call).
  ///
  /// This provides access to content creation operations like adding posts,
  /// bookmarks, media links, etc.
  ///
  /// # Example
  /// ```
  /// let entry = foundframe.with_thestream(|stream| {
  ///   stream.add_post("Hello world", None)
  /// })?;
  /// ```
  ///
  /// # Errors
  /// Returns an error if PKB base path was not configured during initialization,
  /// or if the provided function returns an error.
  pub fn with_thestream<T, E, F>(&self, f: F) -> std::result::Result<T, E>
  where
    F: FnOnce(&thestream::TheStream) -> std::result::Result<T, E>,
    E: From<Error>,
  {
    let mut guard = self.thestream.lock().unwrap();

    if guard.is_none() {
      // Initialize TheStream lazily
      let pkb = self.create_pkb_service().map_err(|e| E::from(e))?;
      let device_pubkey = [0u8; 32]; // TODO: Get from KERI when available
      let stream = thestream::TheStream::with_pubkey(pkb, self.events.clone(), device_pubkey);
      *guard = Some(stream);
    }

    let stream = guard
      .as_ref()
      .ok_or_else(|| E::from(Error::Other("Failed to initialize TheStream".into())))?;

    f(stream)
  }

  /// Get TheStream reference if already initialized.
  ///
  /// This is a lower-level API that doesn't initialize TheStream.
  /// Use `with_thestream` for lazy initialization.
  pub fn thestream_if_initialized(
    &self,
  ) -> Option<std::sync::MutexGuard<'_, Option<thestream::TheStream>>> {
    self.thestream.lock().ok()
  }
}

/// Initialize the Foundframe runtime.
///
/// This starts the Radicle node in a background thread and sets up event forwarding.
/// The returned Foundframe holds handles to all components.
///
/// The optional `on_runtime_exit` callback is called when the Radicle runtime stops
/// (e.g., due to SIGINT). This can be used to trigger application exit.
pub fn init(
  options: InitOptions,
  on_runtime_exit: Option<Box<dyn FnOnce() + Send>>,
) -> Result<Foundframe> {
  info!("Initializing Foundframe...");
  info!("  Radicle home: {:?}", options.radicle_home);
  info!("  PKB base: {:?}", options.pkb_base);
  info!("  Node alias: {}", options.node_alias);

  // Build node options
  let listen = options
    .listen
    .unwrap_or_else(|| "0.0.0.0:6776".parse().expect("valid socket addr"));

  let node_options = radicle::NodeOptions::new()
    .home(&options.radicle_home)
    .alias(&options.node_alias)
    .listen(listen);

  let node_options = if let Some(pass) = options.passphrase {
    node_options.passphrase(pass)
  } else {
    node_options
  };

  // Create the runtime (doesn't start it yet)
  // This will also handle profile initialization if needed
  let runtime = radicle::run_node(node_options)?;

  // Set up event forwarding before starting the runtime
  let events = signal::EventBus::new();
  setup_radicle_event_forwarding(&runtime, &events)?;

  // Start the runtime in a background thread
  let runtime_thread = std::thread::spawn(move || {
    info!("Starting Radicle node runtime...");
    let result = runtime.run();

    match result {
      Ok(()) => {
        info!("Radicle node runtime stopped cleanly");

        // Only exit the app on clean shutdown (e.g., from SIGINT/SIGTERM)
        // Don't exit if the runtime crashed - let the app handle that
        if let Some(callback) = on_runtime_exit {
          ::log::info!("Triggering runtime exit callback...");
          callback();
        }
      }
      Err(e) => {
        error!("Radicle runtime crashed: {}", e);
        // Don't call the exit callback on crash - the app should stay running
        // so the user can see the error or try to recover
      }
    }
  });

  // Give the runtime a moment to start
  std::thread::sleep(std::time::Duration::from_millis(100));

  // Create a handle for operations (connects to the running node)
  let node_handle = radicle::NodeHandle::new()?;

  info!("Foundframe initialized successfully");

  Ok(Foundframe {
    runtime_thread: Some(runtime_thread),
    node_handle,
    events,
    pkb_base: options.pkb_base,
    thestream: Mutex::new(None),
  })
}

impl Foundframe {
  /// Shut down the Foundframe runtime gracefully.
  ///
  /// This waits for the runtime thread to finish (with a timeout).
  /// If the runtime doesn't exit within the timeout, we proceed anyway
  /// to avoid hanging the process.
  pub fn shutdown(mut self) -> Result<()> {
    use std::time::Duration;

    ::log::info!("Shutting down Foundframe...");

    // Drop the node handle to close any connections
    drop(self.node_handle);

    // Wait for the runtime thread to finish, but with a timeout
    if let Some(thread) = self.runtime_thread.take() {
      ::log::info!("Waiting for runtime thread to finish (max 3s)...");

      // Use a channel-based timeout approach since JoinHandle::join() doesn't have timeout
      let (tx, rx) = std::sync::mpsc::channel();
      std::thread::spawn(move || {
        let _ = tx.send(thread.join());
      });

      match rx.recv_timeout(Duration::from_secs(3)) {
        Ok(Ok(())) => ::log::info!("Runtime thread finished cleanly"),
        Ok(Err(_)) => ::log::warn!("Runtime thread panicked"),
        Err(_) => {
          ::log::error!("Runtime thread did not finish in time - forcing exit");
          // Force exit the process - this is a last resort when the runtime is stuck
          // The OS will clean up all threads and resources
          std::process::exit(0);
        }
      }
    }

    ::log::info!("Foundframe shutdown complete");
    Ok(())
  }
}

/// Set up forwarding of Radicle events to the foundframe event bus.
fn setup_radicle_event_forwarding(
  runtime: &radicle::Runtime,
  events: &signal::EventBus,
) -> Result<()> {
  // Subscribe to Radicle events via the runtime handle
  let radicle_events = runtime.handle.events();
  let events = events.clone();

  // Spawn a thread to listen for Radicle events and convert them
  thread::spawn(move || {
    info!("Radicle event listener started");

    while let Ok(event) = radicle_events.recv() {
      debug!("Received Radicle event: {:?}", event);

      // Convert Radicle events to foundframe events
      match convert_radicle_event(event) {
        Some(ff_event) => {
          events.emit(ff_event);
        }
        None => {
          // Event type not relevant for foundframe
          debug!("Radicle event ignored (not relevant for foundframe)");
        }
      }
    }

    info!("Radicle event listener stopped");
  });

  Ok(())
}

/// Convert a Radicle event to a foundframe event.
///
/// Returns None if the event type is not relevant for foundframe.
fn convert_radicle_event(event: crate::radicle::Event) -> Option<signal::PkbEvent> {
  use crate::radicle::Event;

  match event {
    Event::RefsFetched {
      remote,
      rid,
      updated,
    } => {
      // Remote refs were fetched - this is like a "pull" in PKB terms
      debug!("Refs fetched from {} for repo {:?}", remote, rid);

      // For each updated ref, emit an entry pulled event
      for ref_update in updated {
        use crate::radicle::RefUpdate;

        // Extract the ref name from the appropriate variant
        let name = match &ref_update {
          RefUpdate::Updated { name, .. } => name,
          RefUpdate::Created { name, .. } => name,
          RefUpdate::Deleted { name, .. } => name,
          RefUpdate::Skipped { name, .. } => name,
        };

        // TODO: Map this to actual PKB directory/entry
        // For now, emit a generic event
        return Some(signal::PkbEvent::EntryPulled {
          directory: rid.to_string(),
          entry_id: pkb::EntryId::new([0u8; 32]), // TODO: Compute from ref_update
          path: std::path::PathBuf::from(name.as_bstr().to_string()),
          source_device: remote.to_string(),
        });
      }
      None
    }

    Event::RefsSynced { remote, rid, at } => {
      // Our refs were synced to a remote
      debug!("Refs synced to {} for repo {:?} at {}", remote, rid, at);
      None // We don't need to emit an event for this
    }

    Event::LocalRefsAnnounced {
      rid,
      refs,
      timestamp,
    } => {
      // Local user pushed refs - this is like a "local entry created"
      debug!("Local refs announced for repo {:?} at {:?}", rid, timestamp);

      // TODO: Map to PKB entry created
      // For now, emit a generic event
      Some(signal::PkbEvent::EntryCreated {
        directory: rid.to_string(),
        entry_id: pkb::EntryId::new([0u8; 32]), // TODO: Compute from refs
        path: std::path::PathBuf::from("local"),
      })
    }

    Event::PeerConnected { nid } => {
      debug!("Peer connected: {}", nid);
      // Could emit a device connection event
      None
    }

    Event::PeerDisconnected { nid, reason } => {
      debug!("Peer disconnected: {} ({})", nid, reason);
      // Could emit a device disconnection event
      None
    }

    Event::SeedDiscovered { rid, nid } => {
      info!("New seed discovered: repo {:?} on node {}", rid, nid);
      None
    }

    Event::SeedDropped { rid, nid } => {
      info!("Seed dropped: repo {:?} on node {}", rid, nid);
      None
    }

    Event::InventoryAnnounced {
      nid,
      inventory,
      timestamp,
    } => {
      debug!(
        "Inventory from {} at {:?}: {} repos",
        nid,
        timestamp,
        inventory.len()
      );
      None
    }

    Event::RefsAnnounced {
      nid,
      rid,
      refs,
      timestamp,
    } => {
      debug!(
        "Refs announced by {} for repo {:?} at {:?}",
        nid, rid, timestamp
      );
      // This is similar to RefsFetched but from announcement
      None
    }

    Event::NodeAnnounced {
      nid,
      alias,
      timestamp,
      features,
      addresses,
    } => {
      info!(
        "Node announced: {} (alias: {:?}) at {:?}",
        nid, alias, timestamp
      );
      debug!("  Features: {:?}, Addresses: {:?}", features, addresses);
      None
    }

    Event::UploadPack(up) => {
      debug!("Upload pack event: {:?}", up);
      None
    }

    Event::CanonicalRefUpdated {
      rid,
      refname,
      target,
    } => {
      info!(
        "Canonical ref updated for {:?}: {} -> {}",
        rid, refname, target
      );
      None
    }

    _ => {
      // Non-exhaustive: ignore unknown events
      None
    }
  }
}

pub fn setup_logging() {
  // Set up tracing subscriber for our crates
  tracing_subscriber::registry()
    .with(tracing_subscriber::fmt::layer().with_writer(std::io::stderr))
    .with(EnvFilter::try_new("info").unwrap_or_else(|_| EnvFilter::from_default_env()))
    .try_init()
    .ok();

  // Also set the log crate's max level for radicle and other dependencies
  // that use the log crate instead of tracing
  // Note: using ::log to refer to the external crate, not our log module
  ::log::set_max_level(::log::LevelFilter::Info);
}
