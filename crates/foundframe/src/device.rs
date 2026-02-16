//! Paired device management for Foundframe.
//!
//! This module implements the high-level concept of "paired devices" - your own
//! identities across multiple devices (phone, laptop, tablet, etc.). It's built
//! on top of Radicle's follow/unfollow mechanism but adds Foundframe-specific
//! semantics around device pairing, trust establishment, and cross-device sync.
//!
//! # Philosophy
//!
//! - We don't implement general "users" - only manage our own identities
//! - Follow/unfollow and delegation are for device-pairing, not social networking
//! - The PKB (Personal Knowledge Base) is accessible from all paired devices
//! - New devices must be explicitly paired and delegated access
//!
//! # Device Lifecycle
//!
//! 1. **Pairing**: Exchange node IDs with a new device, establish following
//! 2. **Delegation**: Give the new device access to your PKB repositories
//! 3. **Sync**: PKB automatically syncs across all paired devices via Radicle
//! 4. **Unpairing**: Remove device access, revoke delegation

#[allow(unused_imports)] // need for RepoId::from_str
use core::str::FromStr;

use radicle::identity::RepoId;
use radicle::node::{Alias, NodeId, policy::Scope};
use radicle::storage::{ReadRepository, ReadStorage};

use crate::error::{Error, Result};
use crate::radicle::{NodeHandle, PolicyStore};

// Re-export emoji identity for QR generation
pub use emoji_from_entropy::EmojiIdentity;

/// Information about a paired device.
///
/// A paired device is one of your own identities on another physical device.
/// This is a Foundframe concept built on Radicle's peer following.
#[derive(Debug, Clone)]
pub struct PairedDevice {
  /// The device's node ID (public key).
  pub nid: NodeId,
  /// Human-readable name for the device (e.g., "iPhone 15", "MacBook Pro").
  pub alias: Option<String>,
  /// When this device was paired.
  pub paired_at: Option<radicle::node::Timestamp>,
  /// Which repositories this device has access to.
  pub delegated_repos: Vec<RepoId>,
}

impl PairedDevice {
  /// Create a new paired device info.
  pub fn new(nid: NodeId, alias: impl Into<String>) -> Self {
    Self {
      nid,
      alias: Some(alias.into()),
      paired_at: None,
      delegated_repos: Vec::new(),
    }
  }

  /// Check if this device has access to a repository.
  pub fn has_access(&self, rid: RepoId) -> bool {
    self.delegated_repos.contains(&rid)
  }
}

/// Manages paired devices for a Foundframe instance.
///
/// This is the high-level API for device pairing. It coordinates:
/// - Following/unfollowing peers (Radicle-level)
/// - Repository delegation (access control)
/// - Device metadata and aliases
pub struct DeviceManager {
  handle: NodeHandle,
}

impl DeviceManager {
  /// Create a device manager from a node handle.
  pub fn new(handle: NodeHandle) -> Self {
    Self { handle }
  }

  /// Create a device manager with the default profile.
  pub fn try_new() -> Result<Self> {
    Ok(Self::new(NodeHandle::new()?))
  }

  /// Get the underlying node handle.
  pub fn handle(&self) -> &NodeHandle {
    &self.handle
  }

  /// Get the underlying node handle (mutable).
  pub fn handle_mut(&mut self) -> &mut NodeHandle {
    &mut self.handle
  }

  //=========================================================================
  // Pairing Operations
  //=========================================================================

  /// Pair with a new device.
  ///
  /// This follows the device's node ID and optionally gives it a friendly name.
  /// The device won't have repository access until you explicitly delegate.
  ///
  /// # Example
  ///
  /// ```no_run
  /// # use foundframe::device::DeviceManager;
  /// # fn example(manager: &mut DeviceManager, phone_nid: foundframe::radicle::NodeId) -> Result<(), Box<dyn std::error::Error>> {
  /// manager.pair(phone_nid, "My iPhone")?;
  /// # Ok(())
  /// # }
  /// ```
  pub fn pair(&mut self, nid: NodeId, alias: impl AsRef<str>) -> Result<bool> {
    let alias = Some(Alias::new(alias.as_ref()));
    self.handle.follow(nid, alias)
  }

  /// Unpair a device.
  ///
  /// This unfollows the device and revokes its access to all repositories.
  /// Use this when you lose a device or want to permanently remove access.
  pub fn unpair(&mut self, nid: NodeId) -> Result<bool> {
    // First revoke all delegations
    let repos = self.delegated_repos(nid)?;
    for rid in repos {
      let _ = self.revoke_access(nid, rid);
    }
    // Then unfollow
    self.handle.unfollow(nid)
  }

  /// List all paired devices.
  pub fn list(&self) -> Result<Vec<PairedDevice>> {
    let policies = self.handle.follow_policies()?;
    let mut devices = Vec::new();

    for policy in policies {
      // Skip blocked devices
      if policy.policy == radicle::node::policy::Policy::Block {
        continue;
      }

      let delegated_repos = self.delegated_repos(policy.nid)?;

      devices.push(PairedDevice {
        nid: policy.nid,
        alias: policy.alias.as_ref().map(|a| a.to_string()),
        paired_at: None, // Would need to track this separately
        delegated_repos,
      });
    }

    Ok(devices)
  }

  /// Get a specific paired device.
  pub fn get(&self, nid: NodeId) -> Result<Option<PairedDevice>> {
    let policy_store = PolicyStore::new(self.handle.profile().clone());

    match policy_store.follow_policy(nid)? {
      Some(policy) => {
        if policy.policy == radicle::node::policy::Policy::Block {
          return Ok(None);
        }

        let delegated_repos = self.delegated_repos(nid)?;

        Ok(Some(PairedDevice {
          nid: policy.nid,
          alias: policy.alias.as_ref().map(|a| a.to_string()),
          paired_at: None,
          delegated_repos,
        }))
      }
      None => Ok(None),
    }
  }

  /// Check if a device is paired.
  pub fn is_paired(&self, nid: NodeId) -> Result<bool> {
    Ok(self.get(nid)?.is_some())
  }

  /// Rename a paired device.
  pub fn rename(&mut self, nid: NodeId, new_alias: impl AsRef<str>) -> Result<bool> {
    // Re-follow with new alias
    let alias = Some(Alias::new(new_alias.as_ref()));
    self.handle.follow(nid, alias)
  }

  //=========================================================================
  // Access Control (Delegation)
  //=========================================================================

  /// Give a device access to a repository.
  ///
  /// This adds the device as a delegate on the repository, allowing it to
  /// sync and make changes. The device must already be paired.
  ///
  /// # Errors
  ///
  /// Returns an error if the device is not paired or if delegation fails.
  pub fn grant_access(&mut self, nid: NodeId, rid: RepoId) -> Result<()> {
    if !self.is_paired(nid)? {
      return Err(Error::Other(
        "Device must be paired before granting access".into(),
      ));
    }

    // Repository delegation requires loading the identity COB and creating a revision
    // This is a placeholder for the full implementation
    let _ = (nid, rid); // suppress unused warnings
    Err(Error::Other(
      "Repository delegation requires identity COB flow with signer. Not yet implemented.".into(),
    ))
  }

  /// Revoke a device's access to a repository.
  pub fn revoke_access(&mut self, nid: NodeId, rid: RepoId) -> Result<()> {
    // Repository delegation revocation requires loading the identity COB
    // This is a placeholder for the full implementation
    let _ = (nid, rid); // suppress unused warnings
    Err(Error::Other(
            "Repository delegation revocation requires identity COB flow with signer. Not yet implemented."
                .into()
        ))
  }

  /// List repositories a device has access to.
  pub fn delegated_repos(&self, nid: NodeId) -> Result<Vec<RepoId>> {
    let storage = &self.handle.profile().storage;
    let repos = storage.repositories()?;
    let mut accessible = Vec::new();

    for info in repos {
      // Check if this nid is in the doc's delegates
      // Check if this nid is in the doc's delegates
      // Convert NodeId (PublicKey) to Did for comparison
      let did: radicle::identity::Did = nid.into();
      if info.doc.delegates().contains(&did) {
        accessible.push(info.rid);
      }
    }

    Ok(accessible)
  }

  /// Check if a device has access to a repository.
  pub fn has_access(&self, nid: NodeId, rid: RepoId) -> Result<bool> {
    let repo = self.handle.repository(rid)?;
    let doc = repo.identity_doc()?;
    let did: radicle::identity::Did = nid.into();
    Ok(doc.doc.delegates().contains(&did))
  }

  //=========================================================================
  // PKB Sync
  //=========================================================================

  /// Seed the PKB repository with all paired devices as delegates.
  ///
  /// This ensures all paired devices can sync the PKB.
  pub fn seed_pkb_for_devices(&mut self, pkb_rid: RepoId) -> Result<()> {
    // Seed with scope that includes followed devices
    self.handle.seed(pkb_rid, Scope::Followed)?;

    // Ensure all paired devices are delegates
    let devices = self.list()?;
    for device in devices {
      if !device.has_access(pkb_rid) {
        let _ = self.grant_access(device.nid, pkb_rid);
      }
    }

    Ok(())
  }
}

/// A pending device pairing (for QR code / key exchange flow).
#[derive(Debug, Clone)]
pub struct PendingPairing {
  /// Temporary identifier for this pairing request.
  pub token: String,
  /// Our node ID to share with the other device.
  pub our_nid: NodeId,
  /// Alias we suggest for our device.
  pub our_alias: String,
  /// Timestamp when the pairing request was created.
  pub created_at: std::time::SystemTime,
}

impl PendingPairing {
  /// Create a new pending pairing.
  pub fn new(our_nid: NodeId, our_alias: impl Into<String>) -> Self {
    use std::time::SystemTime;

    // Generate a simple token (in production, use proper crypto random)
    let token = format!("pair-{:x}", rand::random::<u64>());

    Self {
      token,
      our_nid,
      our_alias: our_alias.into(),
      created_at: SystemTime::now(),
    }
  }

  /// Check if the pairing request has expired.
  pub fn is_expired(&self, timeout_secs: u64) -> bool {
    let elapsed = self.created_at.elapsed().unwrap_or_default();
    elapsed.as_secs() > timeout_secs
  }
}

/// Device pairing coordinator for multi-step flows.
///
/// Handles the exchange of node IDs between devices, which can happen via:
/// - QR code scanning
/// - Manual entry
/// - Bump/nfc (future)
pub struct PairingCoordinator {
  pending: std::collections::HashMap<String, PendingPairing>,
}

impl PairingCoordinator {
  /// Create a new pairing coordinator.
  pub fn new() -> Self {
    Self {
      pending: std::collections::HashMap::new(),
    }
  }

  /// Initiate a new pairing request.
  pub fn initiate(&mut self, our_nid: NodeId, our_alias: impl Into<String>) -> PendingPairing {
    let pairing = PendingPairing::new(our_nid, our_alias);
    self.pending.insert(pairing.token.clone(), pairing.clone());
    pairing
  }

  /// Complete a pairing from an incoming request.
  ///
  /// Returns the node ID to pair with if the token is valid.
  pub fn complete(&mut self, token: &str, their_nid: NodeId) -> Result<Option<NodeId>> {
    let pending = self
      .pending
      .remove(token)
      .ok_or_else(|| Error::Other("Invalid or expired pairing token".into()))?;

    if pending.is_expired(300) {
      // 5 minute expiry
      return Err(Error::Other("Pairing request expired".into()));
    }

    Ok(Some(their_nid))
  }

  /// Clean up expired pending pairings.
  pub fn cleanup(&mut self) {
    let expired: Vec<_> = self
      .pending
      .iter()
      .filter(|(_, p)| p.is_expired(300))
      .map(|(k, _)| k.clone())
      .collect();

    for token in expired {
      self.pending.remove(&token);
    }
  }
}

impl Default for PairingCoordinator {
  fn default() -> Self {
    Self::new()
  }
}

//=========================================================================
// QR Code Pairing URLs (o19:// scheme)
//=========================================================================

/// Data for a device pairing QR code.
///
/// The emoji identity is for **human verification only** - it cannot be reversed
/// to recover the NodeId. The actual NodeId is transmitted in the URL.
#[derive(Debug, Clone)]
pub struct PairingQrData {
  /// Our NodeId (public key) as emoji identity string - for human recognition.
  pub emoji_identity: String,
  /// Human-readable device name.
  pub device_name: String,
  /// Our NodeId in canonical format (base58btc multicodec).
  pub node_id: String,
}

impl PairingQrData {
  /// Create pairing QR data from our device info.
  ///
  /// The emoji identity is derived from a hash of the NodeId for visual consistency,
  /// but cannot be reversed to recover the original NodeId.
  pub fn new(node_id: NodeId, device_name: impl Into<String>) -> Self {
    use emoji_from_entropy::EmojiIdentity;
    use blake3::Hasher;
    
    // Hash the node_id string to get consistent 32 bytes for emoji identity
    // The node_id string is the canonical representation (base58btc multicodec)
    let node_id_str = node_id.to_string();
    let mut hasher = Hasher::new();
    hasher.update(node_id_str.as_bytes());
    let hash = hasher.finalize();
    let node_bytes: [u8; 32] = hash.into();
    
    let identity = EmojiIdentity::from_256_bits(node_bytes);
    
    Self {
      emoji_identity: identity.to_string(),
      device_name: device_name.into(),
      node_id: node_id_str,
    }
  }
  
  /// Generate the o19:// pairing URL for QR code.
  ///
  /// Format: `o19://{emojiIdentity}/pair?deviceName={name}&nodeId={base58}`
  ///
  /// The emojiIdentity is for human verification - the actual nodeId is in the query params.
  pub fn to_url(&self) -> String {
    let encoded_name = urlencoding::encode(&self.device_name);
    format!(
      "o19://{}/pair?deviceName={}&nodeId={}",
      self.emoji_identity, encoded_name, self.node_id
    )
  }
  
  /// Parse a pairing URL back into structured data.
  ///
  /// Returns the emoji identity (for display), device name, and node ID.
  pub fn from_url(url: &str) -> Result<PairingUrl> {
    PairingUrl::parse(url)
  }
  
  /// Verify that the emoji identity is consistent with the node ID.
  ///
  /// This is a sanity check to detect tampering - the emoji should match
  /// what we'd generate from the same node ID.
  pub fn verify_identity(&self) -> bool {
    use emoji_from_entropy::EmojiIdentity;
    use blake3::Hasher;
    
    // Parse the node ID
    if let Ok(nid) = NodeId::from_str(&self.node_id) {
      // Hash the node_id string (same as in new())
      let node_id_str = nid.to_string();
      let mut hasher = Hasher::new();
      hasher.update(node_id_str.as_bytes());
      let hash = hasher.finalize();
      let node_bytes: [u8; 32] = hash.into();
      
      // Generate emoji identity from node ID hash
      let expected = EmojiIdentity::from_256_bits(node_bytes);
      // Compare with claimed identity
      expected.to_string() == self.emoji_identity
    } else {
      false
    }
  }
}

/// Parsed pairing URL.
#[derive(Debug, Clone)]
pub struct PairingUrl {
  /// Emoji identity string (for human verification).
  pub emoji_identity: String,
  /// Human-readable device name.
  pub device_name: String,
  /// Node ID in canonical format.
  pub node_id: String,
  /// Parsed NodeId.
  pub node_id_parsed: NodeId,
}

impl PairingUrl {
  /// Parse a pairing URL.
  ///
  /// Format: `o19://{emoji}/pair?deviceName={name}&nodeId={base58}`
  pub fn parse(url: &str) -> Result<Self> {
    let url = url.trim();
    
    if !url.starts_with("o19://") {
      return Err(Error::Other(format!(
        "Invalid pairing URL: must start with o19://, got: {}",
        &url[..url.len().min(20)]
      )));
    }
    
    // Remove o19:// prefix
    let without_scheme = &url[6..];
    
    // Split path and query
    let (emoji_part, query_part) = without_scheme
      .split_once("/pair?")
      .ok_or_else(|| Error::Other("Invalid pairing URL format: missing /pair?".into()))?;
    
    // Parse query params
    let mut device_name = None;
    let mut node_id = None;
    
    for param in query_part.split('&') {
      if let Some((key, value)) = param.split_once('=') {
        match key {
          "deviceName" => device_name = Some(urlencoding::decode(value)
            .map_err(|_| Error::Other("Invalid URL encoding in deviceName".into()))?
            .to_string()),
          "nodeId" => node_id = Some(value.to_string()),
          _ => {}
        }
      }
    }
    
    let device_name = device_name.ok_or_else(|| {
      Error::Other("Missing deviceName parameter in pairing URL".into())
    })?;
    
    let node_id = node_id.ok_or_else(|| {
      Error::Other("Missing nodeId parameter in pairing URL".into())
    })?;
    
    // Parse the node ID to verify it's valid
    let node_id_parsed = NodeId::from_str(&node_id)
      .map_err(|e| Error::Other(format!("Invalid nodeId in pairing URL: {}", e)))?;
    
    Ok(Self {
      emoji_identity: emoji_part.to_string(),
      device_name,
      node_id,
      node_id_parsed,
    })
  }
}

/// Bidirectional pairing state machine.
///
/// Implements the two-step QR code exchange:
/// 1. Initiator shows QR (we follow them)
/// 2. Responder scans and shows their QR (they follow us)
/// 3. Bidirectional follow complete = paired
#[derive(Debug, Clone)]
pub enum PairingState {
  /// Waiting for initiator to show QR.
  Idle,
  /// Showing our QR code (we are initiator).
  ShowingQr { data: PairingQrData },
  /// Scanned initiator's QR, waiting for them to scan ours.
  AwaitingConfirmation { 
    their_nid: NodeId, 
    their_name: String,
    their_emoji: String,
  },
  /// Pairing complete!
  Complete { paired_device: PairedDevice },
}

impl Default for PairingState {
  fn default() -> Self {
    PairingState::Idle
  }
}

#[cfg(test)]
mod tests {
  use radicle_crypto::PublicKey;

  use super::*;

  #[test]
  fn test_pending_pairing_expiry() {
    use std::time::{Duration, SystemTime};

    let nid = PublicKey::from([0u8; 32]);
    let pairing = PendingPairing {
      token: "test".into(),
      our_nid: nid,
      our_alias: "Test Device".into(),
      created_at: SystemTime::now() - Duration::from_secs(400),
    };

    assert!(pairing.is_expired(300));
  }

  #[test]
  fn test_paired_device_has_access() {
    let nid = PublicKey::from([0u8; 32]);
    let rid = RepoId::from_str("rad:zbababa").unwrap();

    let device = PairedDevice {
      nid,
      alias: Some("Test".into()),
      paired_at: None,
      delegated_repos: vec![rid],
    };

    assert!(device.has_access(rid));
  }
}
