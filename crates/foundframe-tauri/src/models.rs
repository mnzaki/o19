//! Models for o19-foundframe-tauri
//!
//! This module re-exports generated models from spire and adds custom types.

// Re-export all generated models from spire
pub use crate::spire::models::*;

use serde::{Deserialize, Serialize};

// ============================================================================
// Custom Types (not generated)
// ============================================================================

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
