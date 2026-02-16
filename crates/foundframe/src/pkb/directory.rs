//! Directory management for the PKB.
//!
//! Directories are the top-level organization unit in a PKB.
//! Each directory is a git repository synced via Radicle.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use radicle::identity::RepoId;
use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

/// Base directory for all PKB storage.
#[derive(Debug, Clone)]
pub struct PkbBase {
    /// Root path of the PKB (e.g., `$HOME/pkb`)
    pub path: PathBuf,
    /// Subdirectory containing directory repos
    directories_path: PathBuf,
    /// Subdirectory containing metadata
    meta_path: PathBuf,
}

impl PkbBase {
    /// Standard subdirectory name for directory repos.
    const DIRECTORIES_DIR: &'static str = "directories";
    /// Standard subdirectory name for metadata.
    const META_DIR: &'static str = "meta";
    /// Registry filename.
    const REGISTRY_FILE: &'static str = "directories.json";

    /// Open or create a PKB base at the given path.
    pub fn open_or_create(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref().to_path_buf();
        let directories_path = path.join(Self::DIRECTORIES_DIR);
        let meta_path = path.join(Self::META_DIR);

        // Create directories if they don't exist
        std::fs::create_dir_all(&directories_path)?;
        std::fs::create_dir_all(&meta_path)?;

        Ok(Self {
            path,
            directories_path,
            meta_path,
        })
    }

    /// Path to the directories registry file.
    pub fn registry_path(&self) -> PathBuf {
        self.meta_path.join(Self::REGISTRY_FILE)
    }

    /// Path where a directory's repo should be located.
    pub fn directory_path(&self, name: &str) -> PathBuf {
        self.directories_path.join(name)
    }

    /// Check if a directory exists.
    pub fn has_directory(&self, name: &str) -> bool {
        self.directory_path(name).exists()
    }

    /// Validate a directory name.
    ///
    /// Names must be:
    /// - Non-empty
    /// - Filesystem-safe (no path separators, no special chars)
    /// - Not start with a dot (reserved for hidden files)
    pub fn validate_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(Error::Other("Directory name cannot be empty".into()));
        }

        if name.starts_with('.') {
            return Err(Error::Other(
                "Directory name cannot start with a dot".into()
            ));
        }

        // Check for filesystem-unsafe characters
        let unsafe_chars = ['/', '\\', '<', '>', ':', '"', '|', '?', '*'];
        if name.chars().any(|c| unsafe_chars.contains(&c)) {
            return Err(Error::Other(format!(
                "Directory name '{}' contains invalid characters",
                name
            )));
        }

        Ok(())
    }
}

/// Unique identifier for a directory (its name).
pub type DirectoryId = String;

/// A PKB directory.
#[derive(Debug, Clone)]
pub struct Directory {
    /// Directory name (unique identifier).
    pub name: String,
    /// Path to the directory's git repo.
    pub path: PathBuf,
    /// Radicle RepoId for syncing.
    pub rid: RepoId,
    /// Directory metadata.
    pub meta: DirectoryMeta,
}

impl Directory {
    /// Path to the directory's metadata file.
    pub fn meta_file_path(&self) -> PathBuf {
        self.path.join(".pkb.meta.json")
    }

    /// Read the directory's metadata file.
    pub fn read_meta(&self) -> Result<DirectoryMeta> {
        let content = std::fs::read_to_string(self.meta_file_path())?;
        let meta = serde_json::from_str(&content)?;
        Ok(meta)
    }

    /// Write the directory's metadata file.
    pub fn write_meta(&self, meta: &DirectoryMeta) -> Result<()> {
        let content = serde_json::to_string_pretty(meta)?;
        std::fs::write(self.meta_file_path(), content)?;
        Ok(())
    }
}

/// Metadata for a directory.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryMeta {
    /// Human-readable name.
    pub name: String,
    /// Short description (min 16 chars as per spec).
    pub description: String,
    /// Optional emoji.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
    /// Optional color (hex format).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    /// Creation timestamp (seconds since epoch).
    pub created_at: u64,
}

impl DirectoryMeta {
    /// Validate the metadata.
    ///
    /// Returns an error if description is less than 16 characters.
    pub fn validate(&self) -> Result<()> {
        if self.description.len() < 16 {
            return Err(Error::Other(format!(
                "Description must be at least 16 characters, got {}",
                self.description.len()
            )));
        }
        Ok(())
    }
}

/// Registry of all PKB directories.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DirectoryRegistry {
    /// Map of directory name to its entry.
    pub directories: HashMap<String, DirectoryEntry>,
}

/// Entry in the directory registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryEntry {
    /// Human-readable name.
    pub name: String,
    /// Short description.
    pub description: String,
    /// Optional emoji.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
    /// Optional color.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    /// Radicle RepoId for syncing.
    pub rid: RepoId,
    /// Creation timestamp.
    pub created_at: u64,
}

impl DirectoryRegistry {
    /// Load the registry from a path.
    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let content = std::fs::read_to_string(path)?;
        let registry = serde_json::from_str(&content)?;
        Ok(registry)
    }

    /// Save the registry to a path.
    pub fn save(&self, path: &Path) -> Result<()> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Add a directory entry.
    pub fn add(&mut self, entry: DirectoryEntry) {
        self.directories.insert(entry.name.clone(), entry);
    }

    /// Remove a directory entry.
    pub fn remove(&mut self, name: &str) -> Option<DirectoryEntry> {
        self.directories.remove(name)
    }

    /// Get a directory entry.
    pub fn get(&self, name: &str) -> Option<&DirectoryEntry> {
        self.directories.get(name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pkb_base_paths() {
        let base = PkbBase {
            path: PathBuf::from("/home/user/pkb"),
            directories_path: PathBuf::from("/home/user/pkb/directories"),
            meta_path: PathBuf::from("/home/user/pkb/meta"),
        };

        assert_eq!(
            base.directory_path("notes"),
            PathBuf::from("/home/user/pkb/directories/notes")
        );
        assert_eq!(
            base.registry_path(),
            PathBuf::from("/home/user/pkb/meta/directories.json")
        );
    }

    #[test]
    fn test_validate_name() {
        assert!(PkbBase::validate_name("notes").is_ok());
        assert!(PkbBase::validate_name("my-notes").is_ok());
        assert!(PkbBase::validate_name("notes_2024").is_ok());

        assert!(PkbBase::validate_name("").is_err());
        assert!(PkbBase::validate_name(".hidden").is_err());
        assert!(PkbBase::validate_name("notes/data").is_err());
        assert!(PkbBase::validate_name("notes:data").is_err());
    }

    #[test]
    fn test_directory_meta_validation() {
        let valid = DirectoryMeta {
            name: "notes".into(),
            description: "This is a valid description".into(),
            emoji: Some("📝".into()),
            color: Some("#FF5733".into()),
            created_at: 1234567890,
        };
        assert!(valid.validate().is_ok());

        let invalid = DirectoryMeta {
            name: "notes".into(),
            description: "Too short".into(),
            emoji: None,
            color: None,
            created_at: 1234567890,
        };
        assert!(invalid.validate().is_err());
    }
}
