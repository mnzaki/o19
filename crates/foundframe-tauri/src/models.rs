use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
  pub region: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertJpegToWebpArgs {
  pub jpeg: Vec<u8>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressWebpToSizeArgs {
  pub webp: Vec<u8>,
  pub max_size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPermissionStatus {
  pub status: String, // "prompt" | "denied" | "granted"
}

/// Result of adding an entry to TheStream.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEntryResult {
  /// Database ID (may be null if not yet persisted).
  pub id: Option<i64>,
  /// When the entry was seen (timestamp in milliseconds).
  pub seen_at: u64,
  /// PKB URL reference to the content.
  pub reference: String,
}

// ============================================================================
// Device Pairing Response Types
// ============================================================================

#[derive(Debug, Clone, serde::Serialize)]
pub struct PairingQrResponse {
  /// The full o19:// URL to encode in QR.
  pub url: String,
  /// Emoji identity string for display.
  pub emoji_identity: String,
  /// Node ID in hex format.
  pub node_id_hex: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScannedPairingData {
  /// The emoji identity from the QR code.
  pub emoji_identity: String,
  /// Human-readable device name.
  pub device_name: String,
  /// Node ID in hex format (for verification).
  pub node_id_hex: String,
  /// Full node ID string.
  pub node_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PairedDeviceInfo {
  /// Node ID of the paired device.
  pub node_id: String,
  /// Friendly name/alias.
  pub alias: String,
  /// Whether pairing is confirmed.
  pub paired: bool,
}
