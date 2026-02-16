//! Transparent Radicle service layer.
//!
//! This module provides direct access to Radicle's node, storage, and identity
//! management. It intentionally exposes Radicle's native types and patterns,
//! serving as a thin, ergonomic wrapper around the underlying P2P infrastructure.
//!
//! For high-level device pairing concepts specific to Foundframe, see `device.rs`.

use std::net::SocketAddr;
use std::path::PathBuf;

use radicle::Node;
use radicle::identity::RepoId;
use radicle::node::{Alias, Handle, NodeId};
use radicle::profile::{self, Profile};
use radicle::storage::{ReadStorage, RepositoryInfo, refs::RefsAt};

pub use radicle::node::policy::{FollowPolicy, Policy, Scope, SeedPolicy};
pub use radicle::node::{self, Event};
pub use radicle::node::{Address, ConnectOptions, ConnectResult, Session, State};
pub use radicle::storage::RefUpdate;
pub use radicle_node::crypto::ssh::keystore::Keystore;
pub use radicle_node::node::device::Device;
pub use radicle_node::runtime::Runtime;

use crate::error::{Error, Result};

/// Options for running a Radicle node.
#[derive(Debug, Clone)]
pub struct NodeOptions {
  /// Path to Radicle home directory (sets RAD_HOME).
  pub home: Option<PathBuf>,
  pub config: Option<PathBuf>,
  pub secret: Option<PathBuf>,
  pub listen: Vec<SocketAddr>,
  pub force: bool,
  pub passphrase: Option<String>,
  /// Node alias (name).
  pub alias: Option<String>,
}

impl Default for NodeOptions {
  fn default() -> Self {
    Self {
      home: None,
      config: None,
      secret: None,
      listen: Vec::new(),
      force: false,
      passphrase: None,
      alias: None,
    }
  }
}

impl NodeOptions {
  pub fn new() -> Self {
    Self::default()
  }

  pub fn home(mut self, path: impl Into<PathBuf>) -> Self {
    self.home = Some(path.into());
    self
  }

  pub fn config(mut self, path: impl Into<PathBuf>) -> Self {
    self.config = Some(path.into());
    self
  }

  pub fn secret(mut self, path: impl Into<PathBuf>) -> Self {
    self.secret = Some(path.into());
    self
  }

  pub fn listen(mut self, addr: SocketAddr) -> Self {
    self.listen.push(addr);
    self
  }

  pub fn force(mut self, force: bool) -> Self {
    self.force = force;
    self
  }

  pub fn passphrase(mut self, pass: impl Into<String>) -> Self {
    self.passphrase = Some(pass.into());
    self
  }

  pub fn alias(mut self, alias: impl Into<String>) -> Self {
    self.alias = Some(alias.into());
    self
  }
}

/// Run a Radicle node with the given options.
///
/// This function handles initialization of the Radicle home directory if needed,
/// including generating keys and configuration.
pub fn run_node(options: NodeOptions) -> Result<Runtime> {
  use radicle::profile::env::RAD_HOME;

  // Set RAD_HOME env var if specified
  // SAFETY: This is called during initialization before any threads that read RAD_HOME are spawned.
  // The env var is only set once at startup.
  if let Some(ref home_path) = options.home {
    let home_path = home_path.canonicalize().unwrap_or_else(|_| home_path.clone());
    unsafe {
      std::env::set_var(RAD_HOME, &home_path);
    }
  }

  // Check if we need to initialize the profile
  let home = profile::home()?;
  let config_path = home.config();

  // If config doesn't exist, we need to initialize
  let profile = if !config_path.exists() {
    init_profile(&home, &options)?
  } else {
    // Load existing profile
    Profile::load().map_err(|e| Error::Other(format!("Failed to load profile: {e}")))?
  };

  // Now get home again (in case it was created)
  let home = profile::home()?;

  // Load config
  let config_path = options.config.unwrap_or_else(|| home.config());
  let mut config = profile::Config::load(&config_path)
    .map_err(|e| Error::Other(format!("Failed to load config: {e}")))?;

  // Override alias if specified
  if let Some(ref alias) = options.alias {
    config.node.alias = Alias::new(alias);
  }

  let secret_path = options
    .secret
    .or_else(|| config.node.secret.clone())
    .unwrap_or_else(|| home.keys().join("radicle"));

  let keystore = Keystore::from_secret_path(&secret_path);

  use zeroize::Zeroizing;
  let passphrase = options.passphrase.map(Zeroizing::new);

  let secret_key = keystore
    .secret_key(passphrase)
    .map_err(|e| Error::Other(format!("Failed to load secret key: {e}")))?
    .ok_or_else(|| Error::Other(format!("Secret key not found at {}", secret_path.display())))?;

  // Verify fingerprint if it exists
  if let Some(fp) = radicle_node::fingerprint::Fingerprint::read(&home)? {
    if fp.verify(&secret_key) != radicle_node::fingerprint::FingerprintVerification::Match {
      return Err(Error::Other(
        "Fingerprint mismatch - secret key does not match expected fingerprint".into(),
      ));
    }
  } else {
    radicle_node::fingerprint::Fingerprint::init(&home, &secret_key)?;
  }

  use radicle_node::crypto::ssh::keystore::MemorySigner;
  let signer = Device::from(MemorySigner::from_secret(secret_key));

  // Add preferred seeds as persistent peers
  config.node.connect.extend(config.preferred_seeds.clone());

  let listen = if !options.listen.is_empty() {
    options.listen.clone()
  } else {
    config.node.listen.clone()
  };

  if options.force {
    std::fs::remove_file(home.socket()).ok();
  }

  // Check if there's a stale socket from a previous crashed/killed node
  // If we can connect to it, a real node is running; if not, remove the stale socket
  let socket_path = home.socket();
  if socket_path.exists() {
    let node = Node::new(&socket_path);
    if node.is_running() {
      // Another node is actually running - don't remove socket
      ::log::info!("Another node is already running on this socket");
    } else {
      // Socket exists but node is not running - stale socket
      ::log::info!("Removing stale control socket: {:?}", socket_path);
      std::fs::remove_file(&socket_path).ok();
    }
  }

  // Set up signals channel
  let (notify, signals) = crossbeam_channel::bounded(1);
  radicle_signals::install(notify)
    .map_err(|e| Error::Other(format!("Failed to install signal handler: {e}")))?;

  // Suppress unused warning
  let _ = profile;

  Runtime::init(home, config.node, listen, signals, signer)
    .map_err(|e| Error::Other(format!("Failed to initialize runtime: {e}")))
}

/// Initialize a new Radicle profile.
///
/// This creates the home directory structure, generates keys, and creates config.
fn init_profile(home: &radicle::profile::Home, options: &NodeOptions) -> Result<Profile> {
  use radicle::crypto::ssh::Passphrase;
  use radicle::node::Alias;

  // Get alias from options or use a default
  // Note: Alias::new panics on invalid input, but we assume valid aliases are passed
  let alias = options
    .alias
    .as_ref()
    .map(|a| Alias::new(a))
    .unwrap_or_else(|| Alias::new("foundframe"));

  // Get passphrase
  let passphrase: Option<Passphrase> = options
    .passphrase
    .as_ref()
    .map(|p| p.clone().into());

  // Initialize the profile (creates keys, config, storage)
  let profile = Profile::init(
    home.clone(),
    alias,
    passphrase,
    radicle::profile::env::seed(),
  )
  .map_err(|e| Error::Other(format!("Failed to initialize profile: {e}")))?;

  Ok(profile)
}

/// Handle to a running Radicle node for repository and peer management.
pub struct NodeHandle {
  profile: Profile,
  node: Node,
}

impl NodeHandle {
  /// Create a handle from the default profile.
  pub fn new() -> Result<Self> {
    let profile =
      Profile::load().map_err(|e| Error::Other(format!("Failed to load profile: {e}")))?;
    let node = Node::new(profile.socket());
    Ok(Self { profile, node })
  }

  /// Create a handle from a specific profile.
  pub fn with_profile(profile: Profile) -> Self {
    let node = Node::new(profile.socket());
    Self { profile, node }
  }

  /// Get the profile.
  pub fn profile(&self) -> &Profile {
    &self.profile
  }

  /// Get the underlying node client.
  pub fn node(&self) -> &Node {
    &self.node
  }

  /// Get the underlying node client (mutable).
  pub fn node_mut(&mut self) -> &mut Node {
    &mut self.node
  }

  /// Get the local node ID.
  pub fn local_id(&mut self) -> Result<NodeId> {
    Ok(self.node.nid()?)
  }

  /// Check if the node is running.
  pub fn is_running(&mut self) -> bool {
    self.node.is_running()
  }

  /// Shut down the node gracefully.
  ///
  /// This consumes the handle and signals the node to shut down.
  pub fn shutdown(self) -> Result<()> {
    use radicle::node::Handle;
    self.node.shutdown()
      .map_err(|e| Error::Other(format!("Failed to shutdown node: {e}")))
  }

  //=========================================================================
  // Repository Operations
  //=========================================================================

  /// List all repositories in local storage.
  pub fn repositories(&self) -> Result<Vec<RepositoryInfo>> {
    Ok(self.profile.storage.repositories()?)
  }

  /// Check if a repository exists locally.
  pub fn has_repository(&self, rid: RepoId) -> bool {
    self.profile.storage.repository(rid).is_ok()
  }

  /// Get a repository handle.
  pub fn repository(&self, rid: RepoId) -> Result<radicle::storage::git::Repository> {
    Ok(self.profile.storage.repository(rid)?)
  }

  //=========================================================================
  // Seeding
  //=========================================================================

  /// Start seeding a repository.
  pub fn seed(&mut self, rid: RepoId, scope: Scope) -> Result<bool> {
    Ok(self.profile.seed(rid, scope, &mut self.node)?)
  }

  /// Stop seeding a repository.
  pub fn unseed(&mut self, rid: RepoId) -> Result<bool> {
    Ok(self.profile.unseed(rid, &mut self.node)?)
  }

  /// Get all seed policies.
  pub fn seed_policies(&self) -> Result<Vec<SeedPolicy>> {
    let store = self.profile.policies()?;
    let mut policies = Vec::new();
    for policy in store.seed_policies()? {
      policies.push(policy?);
    }
    Ok(policies)
  }

  /// Check if seeding a repository.
  pub fn is_seeding(&self, rid: RepoId) -> Result<bool> {
    let store = self.profile.policies()?;
    Ok(store.is_seeding(&rid)?)
  }

  //=========================================================================
  // Following (Tracking Peers)
  //=========================================================================

  /// Follow a peer (subscribe to their updates).
  pub fn follow(&mut self, nid: NodeId, alias: Option<Alias>) -> Result<bool> {
    match self.node.follow(nid, alias.clone()) {
      Ok(updated) => Ok(updated),
      Err(e) if e.is_connection_err() => {
        let mut config = self.profile.policies_mut()?;
        Ok(config.follow(&nid, alias.as_ref())?)
      }
      Err(e) => Err(e.into()),
    }
  }

  /// Unfollow a peer.
  pub fn unfollow(&mut self, nid: NodeId) -> Result<bool> {
    match self.node.unfollow(nid) {
      Ok(updated) => Ok(updated),
      Err(e) if e.is_connection_err() => {
        let mut config = self.profile.policies_mut()?;
        Ok(config.unfollow(&nid)?)
      }
      Err(e) => Err(e.into()),
    }
  }

  /// Get all follow policies.
  pub fn follow_policies(&self) -> Result<Vec<FollowPolicy>> {
    let store = self.profile.policies()?;
    let mut policies = Vec::new();
    for policy in store.follow_policies()? {
      policies.push(policy?);
    }
    Ok(policies)
  }

  //=========================================================================
  // Peering
  //=========================================================================

  /// Connect to a peer.
  pub fn connect(&mut self, nid: NodeId, addr: Address) -> Result<ConnectResult> {
    Ok(self.node.connect(nid, addr, ConnectOptions::default())?)
  }

  /// Disconnect from a peer.
  pub fn disconnect(&mut self, nid: NodeId) -> Result<()> {
    Ok(self.node.disconnect(nid)?)
  }

  /// Get active sessions.
  pub fn sessions(&self) -> Result<Vec<Session>> {
    Ok(self.node.sessions()?)
  }

  /// Get a specific session.
  pub fn session(&self, nid: NodeId) -> Result<Option<Session>> {
    Ok(self.node.session(nid)?)
  }

  //=========================================================================
  // Announcements
  //=========================================================================

  /// Announce repository refs to the network.
  pub fn announce_refs(&mut self, rid: RepoId) -> Result<RefsAt> {
    let local_id = self.local_id()?;
    Ok(self.node.announce_refs_for(rid, [local_id])?)
  }

  /// Announce local inventory.
  pub fn announce_inventory(&mut self) -> Result<()> {
    Ok(self.node.announce_inventory()?)
  }
}

/// Low-level policy operations (direct DB access, works when node is offline).
pub struct PolicyStore {
  profile: Profile,
}

impl PolicyStore {
  pub fn new(profile: Profile) -> Self {
    Self { profile }
  }

  /// Get seed policy for a repository.
  pub fn seed_policy(&self, rid: RepoId) -> Result<Option<SeedPolicy>> {
    let store = self.profile.policies()?;
    // seed_policy returns Result<SeedPolicy>, convert to Option
    match store.seed_policy(&rid) {
      Ok(policy) => Ok(Some(policy)),
      Err(_) => Ok(None),
    }
  }

  /// Set seed policy directly in DB.
  pub fn set_seed_policy(&self, rid: RepoId, _policy: Policy, scope: Scope) -> Result<bool> {
    let mut store = self.profile.policies_mut()?;
    Ok(store.seed(&rid, scope)?)
  }

  /// Get follow policy for a node.
  pub fn follow_policy(&self, nid: NodeId) -> Result<Option<FollowPolicy>> {
    let store = self.profile.policies()?;
    Ok(store.follow_policy(&nid)?)
  }

  /// Set follow policy directly in DB.
  pub fn set_follow_policy(
    &self,
    nid: NodeId,
    policy: Policy,
    alias: Option<&Alias>,
  ) -> Result<bool> {
    let mut store = self.profile.policies_mut()?;
    match policy {
      Policy::Allow => Ok(store.follow(&nid, alias)?),
      Policy::Block => Ok(store.unfollow(&nid)?),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_node_options_builder() {
    let opts = NodeOptions::new()
      .listen("0.0.0.0:8776".parse().unwrap())
      .force(true);

    assert_eq!(opts.listen.len(), 1);
    assert!(opts.force);
  }
}
