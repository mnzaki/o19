//! History-less merge strategy for PKB directories.
//!
//! PKB directories use a **history-less** merge strategy. Each device's branch
//! is independent - they don't share common ancestors. This is intentional:
//! - Each device creates its own commits independently
//! - No complex merge conflicts from divergent histories
//! - Content is merged by simple file presence/absence with latest-wins
//!
//! # Merge Strategy
//!
//! 1. **File existence**: If a file exists on any device, it exists in merged result
//! 2. **Deletion**: If a file was deleted on any device, it's deleted in merged result
//! 3. **Conflict resolution**: For files modified on multiple devices:
//!    - Compare file modification timestamps
//!    - Latest timestamp wins
//!    - If timestamps are equal, compare content hash (deterministic tie-breaker)

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use radicle::git;
use radicle::git::Oid;

use crate::error::{Error, Result};

/// Result of a merge operation.
#[derive(Debug, Clone, Default)]
pub struct MergeResult {
  /// Files that were added (new on some remote).
  pub added: Vec<PathBuf>,
  /// Files that were updated (newer version on remote).
  pub updated: Vec<PathBuf>,
  /// Files that were deleted (deleted on some remote).
  pub deleted: Vec<PathBuf>,
  /// Files with conflicts that were auto-resolved.
  pub resolved_conflicts: Vec<(PathBuf, ConflictResolution)>,
  /// Remotes that were merged.
  pub merged_remotes: Vec<String>,
}

impl MergeResult {
  /// Check if the merge resulted in any changes.
  pub fn has_changes(&self) -> bool {
    !self.added.is_empty()
      || !self.updated.is_empty()
      || !self.deleted.is_empty()
      || !self.resolved_conflicts.is_empty()
  }

  /// Total number of changes.
  pub fn total_changes(&self) -> usize {
    self.added.len() + self.updated.len() + self.deleted.len() + self.resolved_conflicts.len()
  }
}

/// How a conflict was resolved.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConflictResolution {
  /// Used the local version (local was newer).
  LocalWins,
  /// Used the remote version (remote was newer).
  RemoteWins,
  /// Used a specific device's version.
  DeviceWins { device: String },
}

/// Merge strategy for PKB directories.
pub struct MergeStrategy;

impl MergeStrategy {
  /// Perform a history-less merge of all remote branches.
  ///
  /// This fetches all refs from all remotes and merges them into the
  /// current working directory using latest-wins semantics.
  pub fn merge_all_remotes(git_repo: &git::raw::Repository) -> Result<MergeResult> {
    let mut result = MergeResult::default();

    // Get all remotes (excluding 'rad' which is the local Radicle remote)
    let remotes: Vec<String> = git_repo
      .remotes()?
      .iter()
      .flatten()
      .filter(|r| *r != "rad")
      .map(|s| s.to_string())
      .collect();

    // Collect file states from all remotes
    let mut file_states: HashMap<PathBuf, Vec<FileState>> = HashMap::new();

    for remote_name in &remotes {
      let states = Self::collect_remote_file_states(git_repo, remote_name)?;
      for (path, state) in states {
        file_states.entry(path).or_default().push(FileState {
          remote: remote_name.clone(),
          state,
        });
      }
      result.merged_remotes.push(remote_name.clone());
    }

    // Collect local file states
    let local_states = Self::collect_local_file_states(git_repo)?;

    // Resolve each file
    for (path, remote_states) in file_states {
      let local_state = local_states.get(&path).cloned();

      match Self::resolve_file(&path, local_state, &remote_states)? {
        FileAction::KeepLocal => {
          // No change needed
        }
        FileAction::Add(content) => {
          Self::write_file(git_repo, &path, &content)?;
          result.added.push(path.clone());
        }
        FileAction::Update(content, resolution) => {
          Self::write_file(git_repo, &path, &content)?;
          result.updated.push(path.clone());
          if resolution != ConflictResolution::LocalWins {
            result.resolved_conflicts.push((path, resolution));
          }
        }
        FileAction::Delete => {
          Self::delete_file(git_repo, &path)?;
          result.deleted.push(path);
        }
      }
    }

    Ok(result)
  }

  /// Collect file states from a remote.
  fn collect_remote_file_states(
    _git_repo: &git::raw::Repository,
    _remote_name: &str,
  ) -> Result<HashMap<PathBuf, FileVersion>> {
    // TODO: Implement tree walking to collect file states from remote refs
    // For now, return empty (sync will be no-op)
    Ok(HashMap::new())
  }

  /// Collect local file states from the working directory.
  fn collect_local_file_states(
    git_repo: &git::raw::Repository,
  ) -> Result<HashMap<PathBuf, FileVersion>> {
    let mut states = HashMap::new();
    let workdir = git_repo
      .workdir()
      .ok_or_else(|| Error::Other("No working directory".into()))?;

    // Walk the working directory
    for entry in walkdir::WalkDir::new(workdir)
      .follow_links(false)
      .into_iter()
      .filter_map(|e| e.ok())
    {
      if !entry.file_type().is_file() {
        continue;
      }

      let path = entry.path();
      let relative_path = path.strip_prefix(workdir).unwrap_or(path);

      // Skip .git and .pkb.meta.json
      if relative_path.starts_with(".git")
        || relative_path.file_name() == Some(std::ffi::OsStr::new(".pkb.meta.json"))
      {
        continue;
      }

      // Get file metadata
      if let Ok(metadata) = std::fs::metadata(path) {
        let modified = metadata
          .modified()
          .ok()
          .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
          .map(|d| d.as_secs() as i64)
          .unwrap_or(0);

        states.insert(
          relative_path.to_path_buf(),
          FileVersion {
            oid: None, // Not tracked in git yet
            timestamp: modified,
            size: metadata.len() as usize,
          },
        );
      }
    }

    Ok(states)
  }

  /// Resolve what action to take for a file.
  fn resolve_file(
    path: &Path,
    local: Option<FileVersion>,
    remotes: &[FileState],
  ) -> Result<FileAction> {
    if remotes.is_empty() {
      // No remote has this file - keep local if it exists
      return Ok(FileAction::KeepLocal);
    }

    // Find the newest remote version
    let newest_remote = remotes
      .iter()
      .max_by_key(|r| r.state.timestamp)
      .expect("non-empty remotes");

    match local {
      None => {
        // File doesn't exist locally - add it
        Ok(FileAction::Add(newest_remote.state.clone()))
      }
      Some(local_state) => {
        // Compare timestamps
        if newest_remote.state.timestamp > local_state.timestamp {
          // Remote is newer - update
          Ok(FileAction::Update(
            newest_remote.state.clone(),
            ConflictResolution::RemoteWins,
          ))
        } else if newest_remote.state.timestamp < local_state.timestamp {
          // Local is newer - keep local
          Ok(FileAction::KeepLocal)
        } else {
          // Timestamps equal - use content hash as tie-breaker
          // This is deterministic across all devices
          let use_remote = match (&newest_remote.state.oid, &local_state.oid) {
            (Some(r), Some(l)) => r > l,
            (Some(_), None) => true,
            (None, Some(_)) => false,
            (None, None) => false,
          };
          if use_remote {
            Ok(FileAction::Update(
              newest_remote.state.clone(),
              ConflictResolution::DeviceWins {
                device: newest_remote.remote.clone(),
              },
            ))
          } else {
            Ok(FileAction::KeepLocal)
          }
        }
      }
    }
  }

  /// Write a file to the working directory.
  fn write_file(git_repo: &git::raw::Repository, path: &Path, version: &FileVersion) -> Result<()> {
    // This is a placeholder - actual implementation would need to
    // fetch the blob content from the remote tree and write it
    let workdir = git_repo
      .workdir()
      .ok_or_else(|| Error::Other("No working directory".into()))?;
    let full_path = workdir.join(path);

    // Ensure parent exists
    if let Some(parent) = full_path.parent() {
      std::fs::create_dir_all(parent)?;
    }

    // Note: Actual content would be fetched from the git blob
    // For now, this is just a stub
    Ok(())
  }

  /// Delete a file from the working directory.
  fn delete_file(git_repo: &git::raw::Repository, path: &Path) -> Result<()> {
    let workdir = git_repo
      .workdir()
      .ok_or_else(|| Error::Other("No working directory".into()))?;
    let full_path = workdir.join(path);

    if full_path.exists() {
      std::fs::remove_file(&full_path)?;
    }

    Ok(())
  }

  /// Extract timestamp from file content.
  ///
  /// For .js.md files: parse the JSON metadata on the first line
  /// For other files: use file modification time (fallback)
  fn extract_timestamp_from_content(content: &[u8]) -> i64 {
    // Try to parse as JSON first line
    if let Ok(text) = std::str::from_utf8(content) {
      if let Some(first_line) = text.lines().next() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(first_line) {
          if let Some(ts) = json.get("created_at").and_then(|v| v.as_i64()) {
            return ts;
          }
          if let Some(ts) = json.get("modified_at").and_then(|v| v.as_i64()) {
            return ts;
          }
        }
      }
    }
    0
  }
}

/// State of a file on a specific remote.
#[derive(Debug, Clone)]
struct FileState {
  remote: String,
  state: FileVersion,
}

/// Version info for a file.
#[derive(Debug, Clone)]
struct FileVersion {
  /// Git object ID (None for local files not yet committed).
  oid: Option<Oid>,
  /// Timestamp for latest-wins comparison.
  timestamp: i64,
  /// File size in bytes.
  size: usize,
}

/// Action to take for a file during merge.
enum FileAction {
  /// Keep the local version (no change).
  KeepLocal,
  /// Add a new file.
  Add(FileVersion),
  /// Update an existing file.
  Update(FileVersion, ConflictResolution),
  /// Delete the file.
  Delete,
}

// Need walkdir crate for directory walking
// This would be added to Cargo.toml
