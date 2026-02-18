//! PKB Service implementation.

use std::path::Path;

use radicle::git;
use radicle::git::fmt::RefString;
use radicle::identity::doc::Visibility;
use radicle::identity::project::ProjectName;
use radicle::node::policy::Scope;

use crate::device::{DeviceManager, PairedDevice};
use crate::error::{Error, Result};
use crate::radicle::NodeHandle;
use crate::signal::{EventBus, PkbEvent};

use super::{
  chunk::{EntryId, StreamChunk},
  directory::{Directory, DirectoryEntry, DirectoryMeta, DirectoryRegistry, PkbBase},
  entry::Entry,
  merge::MergeResult,
  now_timestamp,
};

/// The main PKB service.
///
/// Coordinates between local git repos, Radicle storage, and device pairing.
pub struct PkbService {
  /// Base directory for all PKB storage.
  base: PkbBase,
  /// Handle to the Radicle node.
  node: NodeHandle,
  /// Device manager for accessing paired devices.
  devices: DeviceManager,
  /// Event bus for emitting PKB events.
  events: EventBus,
}

impl PkbService {
  /// Create a new PKB service.
  pub fn new(
    base_path: impl AsRef<Path>,
    node: NodeHandle,
    devices: DeviceManager,
  ) -> Result<Self> {
    let base = PkbBase::open_or_create(base_path)?;

    Ok(Self {
      base,
      node,
      devices,
      events: EventBus::new(),
    })
  }

  /// Create a new PKB service with a custom event bus.
  pub fn with_event_bus(
    base_path: impl AsRef<Path>,
    node: NodeHandle,
    devices: DeviceManager,
    events: EventBus,
  ) -> Result<Self> {
    let base = PkbBase::open_or_create(base_path)?;

    Ok(Self {
      base,
      node,
      devices,
      events,
    })
  }

  /// Get a reference to the event bus.
  pub fn events(&self) -> &EventBus {
    &self.events
  }

  //=========================================================================
  // Directory Management
  //=========================================================================

  /// Create a new directory.
  ///
  /// # Validation
  /// - `name`: Must be filesystem-safe, unique
  /// - `description`: Must be at least 16 characters
  pub fn create_directory(
    &mut self,
    name: impl AsRef<str>,
    description: impl AsRef<str>,
    emoji: Option<String>,
    color: Option<String>,
  ) -> Result<Directory> {
    let name = name.as_ref();
    let description = description.as_ref();

    // Validate name
    PkbBase::validate_name(name)?;

    // Validate description length
    if description.len() < 16 {
      return Err(Error::Other(format!(
        "Description must be at least 16 characters, got {}",
        description.len()
      )));
    }

    // Check if directory already exists
    if self.base.has_directory(name) {
      return Err(Error::Other(format!("Directory '{}' already exists", name)));
    }

    // Create the local git repo
    let dir_path = self.base.directory_path(name);
    std::fs::create_dir_all(&dir_path)?;

    let git_repo = git::raw::Repository::init(&dir_path)?;

    // Create initial commit with .pkb.meta.json
    let meta = DirectoryMeta {
      name: name.to_string(),
      description: description.to_string(),
      emoji: emoji.clone(),
      color: color.clone(),
      created_at: now_timestamp(),
    };
    let meta_json = serde_json::to_string_pretty(&meta)?;

    let meta_path = dir_path.join(".pkb.meta.json");
    std::fs::write(&meta_path, meta_json)?;

    // Create initial commit
    let sig = git::raw::Signature::now("PKB", "pkb@localhost")?;
    let tree_id = {
      let mut index = git_repo.index()?;
      index.add_path(std::path::Path::new(".pkb.meta.json"))?;
      index.write_tree()?
    };
    let tree = git_repo.find_tree(tree_id)?;
    git_repo.commit(
      Some("HEAD"),
      &sig,
      &sig,
      "Initialize PKB directory",
      &tree,
      &[],
    )?;

    // Initialize as Radicle repo
    let profile = self.node.profile();
    let project_name = ProjectName::try_from(name)?;
    let visibility = Visibility::default(); // Private by default

    // Create the Radicle project
    let (rid, _doc, _signed_refs) = radicle::rad::init(
      &git_repo,
      project_name,
      description,
      git::BranchName::try_from("main").map_err(|_| Error::Other("Invalid branch name".into()))?,
      visibility,
      profile
        .signer()
        .map_err(|e| Error::Other(e.to_string()))?
        .as_ref(),
      profile.storage.clone(),
    )
    .map_err(|e| Error::Other(format!("Failed to initialize Radicle project: {e}")))?;

    // Seed the repo so it's available to the network
    self.node.seed(rid, Scope::Followed)?;

    // Add all paired devices as remotes
    self.sync_device_remotes(name)?;

    // Update registry
    let mut registry = self.load_registry()?;
    registry.add(DirectoryEntry {
      name: name.to_string(),
      description: description.to_string(),
      emoji,
      color,
      rid,
      created_at: now_timestamp(),
    });
    self.save_registry(&registry)?;

    Ok(Directory {
      name: name.to_string(),
      path: dir_path,
      rid,
      meta,
    })
  }

  /// List all directories.
  pub fn list_directories(&self) -> Result<Vec<Directory>> {
    let registry = self.load_registry()?;
    let mut dirs = Vec::new();

    for (name, entry) in registry.directories {
      let path = self.base.directory_path(&name);
      let meta = DirectoryMeta {
        name: entry.name,
        description: entry.description,
        emoji: entry.emoji,
        color: entry.color,
        created_at: entry.created_at,
      };
      dirs.push(Directory {
        name,
        path,
        rid: entry.rid,
        meta,
      });
    }

    Ok(dirs)
  }

  /// Get a specific directory by name.
  pub fn get_directory(&self, name: &str) -> Result<Option<Directory>> {
    let registry = self.load_registry()?;

    match registry.get(name) {
      Some(entry) => {
        let path = self.base.directory_path(name);
        let meta = DirectoryMeta {
          name: entry.name.clone(),
          description: entry.description.clone(),
          emoji: entry.emoji.clone(),
          color: entry.color.clone(),
          created_at: entry.created_at,
        };
        Ok(Some(Directory {
          name: name.to_string(),
          path,
          rid: entry.rid,
          meta,
        }))
      }
      None => Ok(None),
    }
  }

  /// Delete a directory and its contents.
  pub fn delete_directory(&mut self, name: &str) -> Result<()> {
    // Unseed from Radicle
    if let Some(dir) = self.get_directory(name)? {
      self.node.unseed(dir.rid)?;
    }

    // Remove local repo
    let path = self.base.directory_path(name);
    if path.exists() {
      std::fs::remove_dir_all(&path)?;
    }

    // Update registry
    let mut registry = self.load_registry()?;
    registry.remove(name);
    self.save_registry(&registry)?;

    Ok(())
  }

  //=========================================================================
  // Device Synchronization
  //=========================================================================

  /// Ensure all paired devices are configured as remotes for a directory.
  pub fn sync_device_remotes(&mut self, directory: &str) -> Result<()> {
    let dir = self
      .get_directory(directory)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", directory)))?;

    let git_repo = git::raw::Repository::open(&dir.path)?;
    let paired = self.devices.list()?;

    for device in paired {
      self.add_device_remote_internal(&dir, &git_repo, &device)?;
    }

    Ok(())
  }

  /// Add a specific device as a remote to a directory.
  pub fn add_device_remote(
    &mut self,
    directory: &str,
    device_nid: radicle::node::NodeId,
  ) -> Result<()> {
    let dir = self
      .get_directory(directory)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", directory)))?;

    let git_repo = git::raw::Repository::open(&dir.path)?;

    // Get device info
    let device = self
      .devices
      .get(device_nid)?
      .ok_or_else(|| Error::Other(format!("Device {} not found", device_nid)))?;

    self.add_device_remote_internal(&dir, &git_repo, &device)
  }

  /// Remove a device remote from a directory.
  pub fn remove_device_remote(
    &mut self,
    directory: &str,
    device_nid: radicle::node::NodeId,
  ) -> Result<()> {
    let dir = self
      .get_directory(directory)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", directory)))?;

    let git_repo = git::raw::Repository::open(&dir.path)?;

    // Build remote name
    let short_nid = &device_nid.to_string()[..6];
    let remote_name = format!("device_{}", short_nid);

    // Remove remote if it exists
    if git_repo.find_remote(&remote_name).is_ok() {
      git_repo.remote_delete(&remote_name)?;
    }

    Ok(())
  }

  /// Add a single device as a remote to a directory.
  fn add_device_remote_internal(
    &self,
    dir: &Directory,
    git_repo: &git::raw::Repository,
    device: &PairedDevice,
  ) -> Result<()> {
    let alias = device.alias.as_deref().unwrap_or("device");
    let short_nid = &device.nid.to_string()[..6];
    let remote_name = format!("{}_{}", alias, short_nid);
    // Convert remote name to RefString using try_from
    let remote_name = RefString::try_from(remote_name.as_str())
      .map_err(|_| Error::Other(format!("Invalid remote name: {}", remote_name)))?;

    // Build Radicle URL with namespace
    let remote_url = radicle::git::Url::from(dir.rid).with_namespace(device.nid);

    // Remove existing remote if present
    if git_repo.find_remote(&remote_name).is_ok() {
      git_repo.remote_delete(&remote_name).ok();
    }

    // Configure the remote
    radicle::git::configure_remote(git_repo, &remote_name, &remote_url, &remote_url)?;

    Ok(())
  }

  /// Sync a directory with all paired devices.
  ///
  /// Fetches from all remotes and merges their content using
  /// the history-less latest-wins merge strategy.
  pub fn sync_directory(&mut self, name: &str) -> Result<MergeResult> {
    let dir = self
      .get_directory(name)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", name)))?;

    // Emit sync started event
    self.events.emit(PkbEvent::SyncStarted {
      directory: name.to_string(),
    });

    let git_repo = git::raw::Repository::open(&dir.path)?;

    // Fetch from all remotes
    let mut fetched_from = Vec::new();
    for remote_name in git_repo.remotes()?.iter().flatten() {
      if remote_name == "rad" {
        continue;
      }

      let mut remote = git_repo.find_remote(remote_name)?;
      match remote.fetch::<&str>(&[], None, None) {
        Ok(_) => fetched_from.push(remote_name.to_string()),
        Err(e) => log::warn!("Failed to fetch from {}: {}", remote_name, e),
      }
    }

    // Merge using history-less strategy
    let merge_result = super::merge::MergeStrategy::merge_all_remotes(&git_repo)?;

    // Emit events for pulled entries (from the 'added' list in merge_result)
    for path in &merge_result.added {
      // Compute entry ID from the file content
      let full_path = dir.path.join(path);
      if let Ok(content) = std::fs::read(&full_path) {
        let hash = blake3::hash(&content);
        let entry_id = EntryId::new(hash.into());

        // Determine source device from merge info (simplified - use first fetched remote)
        let source_device = fetched_from
          .first()
          .cloned()
          .unwrap_or_else(|| "unknown".into());

        // Emit EntryPulled event
        self.events.emit(PkbEvent::EntryPulled {
          directory: name.to_string(),
          entry_id,
          path: path.clone(),
          source_device: source_device.clone(),
        });

        // Emit EntryCreatedOrPulled event
        self.events.emit(PkbEvent::EntryCreatedOrPulled {
          directory: name.to_string(),
          entry_id,
          path: path.clone(),
          from_remote: true,
          source_device: Some(source_device),
        });
      }
    }

    // Emit sync completed event
    self.events.emit(PkbEvent::SyncCompleted {
      directory: name.to_string(),
      entries_pulled: merge_result.added.len(),
      entries_pushed: 0, // TODO: Track pushed entries
    });

    // Push our changes back
    self.announce_refs(dir.rid)?;

    Ok(merge_result)
  }

  //=========================================================================
  // Content Ingestion
  //=========================================================================

  /// Ingest a StreamChunk into a directory.
  pub fn ingest_chunk(
    &mut self,
    chunk: StreamChunk,
    directory: &str,
    path: &Path,
  ) -> Result<EntryId> {
    let dir = self
      .get_directory(directory)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", directory)))?;

    // Ensure path is relative
    let path = if path.is_absolute() {
      path.strip_prefix(&dir.path).unwrap_or(path)
    } else {
      path
    };

    // Ingest the chunk
    let entry_id = chunk.ingest(&dir.path, path)?;

    // Commit the changes
    self.commit_changes(&dir, path, &format!("Add entry: {:?}", entry_id))?;

    // Emit events
    let entry_path = path.to_path_buf();
    let created_event = PkbEvent::EntryCreated {
      directory: directory.to_string(),
      entry_id,
      path: entry_path.clone(),
    };
    let created_or_pulled_event = PkbEvent::EntryCreatedOrPulled {
      directory: directory.to_string(),
      entry_id,
      path: entry_path,
      from_remote: false,
      source_device: None,
    };
    self.events.emit(created_event);
    self.events.emit(created_or_pulled_event);

    // Announce to network
    self.announce_refs(dir.rid)?;

    Ok(entry_id)
  }

  /// Read an entry from a directory.
  pub fn read_entry(&self, directory: &str, entry_id: EntryId) -> Result<Option<Entry>> {
    // Find entry by ID (would need to scan directory)
    // For now, placeholder
    let _ = (directory, entry_id);
    Ok(None)
  }

  /// Update an existing entry.
  pub fn update_entry(
    &mut self,
    directory: &str,
    _entry_id: EntryId,
    content: &[u8],
  ) -> Result<()> {
    let dir = self
      .get_directory(directory)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", directory)))?;

    // Would need to find entry by ID first
    let _ = (dir, content);
    Ok(())
  }

  /// Delete an entry from a directory.
  pub fn delete_entry(&mut self, directory: &str, _entry_id: EntryId) -> Result<()> {
    let dir = self
      .get_directory(directory)?
      .ok_or_else(|| Error::Other(format!("Directory '{}' not found", directory)))?;

    // Would need to find entry by ID first
    let _ = dir;
    Ok(())
  }

  //=========================================================================
  // Internal Helpers
  //=========================================================================

  /// Commit changes to the directory's git repo.
  fn commit_changes(&self, dir: &Directory, relative_path: &Path, message: &str) -> Result<()> {
    let git_repo = git::raw::Repository::open(&dir.path)?;
    let sig = git::raw::Signature::now("PKB", "pkb@localhost")?;

    let mut index = git_repo.index()?;
    index.add_path(relative_path)?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = git_repo.find_tree(tree_id)?;
    let parent = git_repo.head()?.peel_to_commit()?;

    git_repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])?;

    Ok(())
  }

  /// Announce directory refs to the Radicle network.
  fn announce_refs(&mut self, rid: radicle::identity::RepoId) -> Result<()> {
    self.node.announce_refs(rid)?;
    Ok(())
  }

  fn load_registry(&self) -> Result<DirectoryRegistry> {
    DirectoryRegistry::load(&self.base.registry_path())
  }

  fn save_registry(&self, registry: &DirectoryRegistry) -> Result<()> {
    registry.save(&self.base.registry_path())
  }
}
