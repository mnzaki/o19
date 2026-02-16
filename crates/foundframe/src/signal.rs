//! Signal/Event system for Foundframe.
//!
//! Provides a pub/sub mechanism for components to communicate asynchronously.
//! Used for:
//! - PKB entry lifecycle events
//! - Device pairing status changes
//! - Sync completion notifications
//! - UI updates
//!
//! # Example
//!
//! ```
//! use foundframe::signal::{EventBus, PkbEvent};
//!
//! let bus = EventBus::new();
//!
//! // Subscribe to events
//! let rx = bus.subscribe::<PkbEvent>();
//!
//! // Emit events
//! bus.emit(PkbEvent::EntryCreated { directory: "notes".into(), entry_id });
//!
//! // Receive events
//! if let Ok(event) = rx.try_recv() {
//!     println!("PKB event: {:?}", event);
//! }
//! ```

use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crossbeam_channel::{Receiver, Sender, unbounded};

use crate::pkb::{DirectoryId, EntryId};

/// Central event bus for Foundframe.
#[derive(Debug, Clone)]
pub struct EventBus {
  /// Type-erased senders for each event type.
  inner: Arc<Mutex<HashMap<TypeId, Box<dyn Any + Send>>>>,
}

impl EventBus {
  /// Create a new event bus.
  pub fn new() -> Self {
    Self {
      inner: Arc::new(Mutex::new(HashMap::new())),
    }
  }

  /// Subscribe to events of a specific type.
  ///
  /// Returns a receiver that will receive all future events of type `T`.
  pub fn subscribe<T: Event + 'static>(&self) -> Receiver<T> {
    let mut inner = self.inner.lock().unwrap();
    let type_id = TypeId::of::<T>();

    // Get or create the sender list for this type
    let senders: &mut Vec<Sender<T>> = inner
      .entry(type_id)
      .or_insert_with(|| Box::new(Vec::<Sender<T>>::new()))
      .downcast_mut()
      .expect("type mismatch in event bus");

    let (tx, rx) = unbounded();
    senders.push(tx);
    rx
  }

  /// Emit an event to all subscribers.
  pub fn emit<T: Event + 'static>(&self, event: T) {
    let mut inner = self.inner.lock().unwrap();
    let type_id = TypeId::of::<T>();

    if let Some(senders) = inner.get_mut(&type_id) {
      let senders: &mut Vec<Sender<T>> =
        senders.downcast_mut().expect("type mismatch in event bus");

      // Remove disconnected senders
      senders.retain(|tx| tx.send(event.clone()).is_ok());
    }
  }

  /// Emit an event without blocking.
  ///
  /// Silently drops events for disconnected subscribers.
  pub fn try_emit<T: Event + Clone + 'static>(&self, event: T) {
    let inner = self.inner.lock().unwrap();
    let type_id = TypeId::of::<T>();

    if let Some(senders) = inner.get(&type_id) {
      let senders: &Vec<Sender<T>> = senders.downcast_ref().expect("type mismatch in event bus");

      for tx in senders {
        // Ignore send errors (subscriber may have dropped)
        let _ = tx.try_send(event.clone());
      }
    }
  }
}

impl Default for EventBus {
  fn default() -> Self {
    Self::new()
  }
}

/// Trait for events that can be emitted on the event bus.
pub trait Event: Clone + Send + std::fmt::Debug {}

// Blanket implementation for all suitable types
impl<T> Event for T where T: Clone + Send + std::fmt::Debug {}

//===========================================================================
// PKB Events
//===========================================================================

/// Events emitted by the PKB system.
#[derive(Debug, Clone)]
pub enum PkbEvent {
  /// A new entry was created locally.
  EntryCreated {
    /// The directory containing the entry.
    directory: DirectoryId,
    /// The entry ID.
    entry_id: EntryId,
    /// Path to the entry file (relative to directory root).
    path: std::path::PathBuf,
  },

  /// An entry was pulled from a remote device.
  EntryPulled {
    /// The directory containing the entry.
    directory: DirectoryId,
    /// The entry ID.
    entry_id: EntryId,
    /// Path to the entry file.
    path: std::path::PathBuf,
    /// Which device the entry came from.
    source_device: String,
  },

  /// An entry was created locally OR pulled from remote.
  ///
  /// This is a convenience event for components that don't care about
  /// the distinction between local creation and remote sync.
  EntryCreatedOrPulled {
    /// The directory containing the entry.
    directory: DirectoryId,
    /// The entry ID.
    entry_id: EntryId,
    /// Path to the entry file.
    path: std::path::PathBuf,
    /// Whether this came from a remote device.
    from_remote: bool,
    /// If from remote, which device (None if local).
    source_device: Option<String>,
  },

  /// An entry was updated.
  EntryUpdated {
    /// The directory containing the entry.
    directory: DirectoryId,
    /// The entry ID.
    entry_id: EntryId,
    /// Path to the entry file.
    path: std::path::PathBuf,
  },

  /// An entry was deleted.
  EntryDeleted {
    /// The directory containing the entry.
    directory: DirectoryId,
    /// The entry ID.
    entry_id: EntryId,
  },

  /// Directory sync started.
  SyncStarted {
    /// The directory being synced.
    directory: DirectoryId,
  },

  /// Directory sync completed.
  SyncCompleted {
    /// The directory that was synced.
    directory: DirectoryId,
    /// Number of entries pulled.
    entries_pulled: usize,
    /// Number of entries pushed.
    entries_pushed: usize,
  },

  /// Directory sync failed.
  SyncFailed {
    /// The directory that failed to sync.
    directory: DirectoryId,
    /// Error message.
    error: String,
  },
}

impl PkbEvent {
  /// Create an `EntryCreatedOrPulled` event from an `EntryCreated` event.
  pub fn from_created(event: &PkbEvent) -> Option<Self> {
    match event {
      PkbEvent::EntryCreated {
        directory,
        entry_id,
        path,
      } => Some(PkbEvent::EntryCreatedOrPulled {
        directory: directory.clone(),
        entry_id: *entry_id,
        path: path.clone(),
        from_remote: false,
        source_device: None,
      }),
      _ => None,
    }
  }

  /// Create an `EntryCreatedOrPulled` event from an `EntryPulled` event.
  pub fn from_pulled(event: &PkbEvent) -> Option<Self> {
    match event {
      PkbEvent::EntryPulled {
        directory,
        entry_id,
        path,
        source_device,
      } => Some(PkbEvent::EntryCreatedOrPulled {
        directory: directory.clone(),
        entry_id: *entry_id,
        path: path.clone(),
        from_remote: true,
        source_device: Some(source_device.clone()),
      }),
      _ => None,
    }
  }
}

//===========================================================================
// Device Events
//===========================================================================

/// Events emitted by the device pairing system.
#[derive(Debug, Clone)]
pub enum DeviceEvent {
  /// A new device was paired.
  DevicePaired {
    /// The device node ID.
    nid: radicle::node::NodeId,
    /// The device alias (name).
    alias: Option<String>,
  },

  /// A device was unpaired.
  DeviceUnpaired {
    /// The device node ID.
    nid: radicle::node::NodeId,
  },

  /// Device connection status changed.
  DeviceConnectionChanged {
    /// The device node ID.
    nid: radicle::node::NodeId,
    /// New connection state.
    connected: bool,
  },
}

//===========================================================================
// Node Events
//===========================================================================

/// Events emitted by the Radicle node.
#[derive(Debug, Clone)]
pub enum NodeEvent {
  /// Node started.
  NodeStarted,

  /// Node stopped.
  NodeStopped,

  /// Connected to a peer.
  PeerConnected {
    /// The peer's node ID.
    nid: radicle::node::NodeId,
  },

  /// Disconnected from a peer.
  PeerDisconnected {
    /// The peer's node ID.
    nid: radicle::node::NodeId,
  },
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_event_bus() {
    let bus = EventBus::new();
    let rx = bus.subscribe::<PkbEvent>();

    use crate::pkb::ChunkId;
    let event = PkbEvent::EntryCreated {
      directory: "notes".into(),
      entry_id: ChunkId([0u8; 32]),
      path: "test.js.md".into(),
    };

    bus.emit(event.clone());

    let received = rx.try_recv().unwrap();
    match received {
      PkbEvent::EntryCreated { directory, .. } => {
        assert_eq!(directory, "notes");
      }
      _ => panic!("wrong event type"),
    }
  }

  #[test]
  fn test_pkb_event_conversions() {
    use crate::pkb::ChunkId;
    let created = PkbEvent::EntryCreated {
      directory: "notes".into(),
      entry_id: ChunkId([0u8; 32]),
      path: "test.js.md".into(),
    };

    let converted = PkbEvent::from_created(&created).unwrap();
    match converted {
      PkbEvent::EntryCreatedOrPulled { from_remote, .. } => {
        assert!(!from_remote);
      }
      _ => panic!("wrong conversion"),
    }

    let pulled = PkbEvent::EntryPulled {
      directory: "notes".into(),
      entry_id: ChunkId([0u8; 32]),
      path: "test.js.md".into(),
      source_device: "iphone".into(),
    };

    let converted = PkbEvent::from_pulled(&pulled).unwrap();
    match converted {
      PkbEvent::EntryCreatedOrPulled {
        from_remote,
        source_device,
        ..
      } => {
        assert!(from_remote);
        assert_eq!(source_device, Some("iphone".into()));
      }
      _ => panic!("wrong conversion"),
    }
  }
}
