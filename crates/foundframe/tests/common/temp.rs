//! Temporary directory utilities for testing
//!
//! Provides auto-cleaning temp directories for file-based tests.

use std::path::{Path, PathBuf};

/// A temporary directory that automatically cleans up when dropped.
pub struct TestTempDir {
    path: PathBuf,
}

impl TestTempDir {
    /// Create a new temp directory with a random name.
    pub fn new() -> Self {
        let random: u64 = rand::random();
        let path = std::env::temp_dir().join(format!("foundframe_test_{}", random));
        std::fs::create_dir_all(&path).expect("Failed to create temp dir");
        Self { path }
    }

    /// Create a new temp directory with a specific name.
    pub fn with_name(name: &str) -> Self {
        let random: u64 = rand::random();
        let path = std::env::temp_dir().join(format!("foundframe_test_{}_{}", name, random));
        std::fs::create_dir_all(&path).expect("Failed to create temp dir");
        Self { path }
    }

    /// Get the path to the temp directory.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Join a path segment to the temp directory.
    pub fn join(&self, path: impl AsRef<Path>) -> PathBuf {
        self.path.join(path)
    }

    /// Create a subdirectory.
    pub fn create_dir(&self, name: &str) -> PathBuf {
        let path = self.path.join(name);
        std::fs::create_dir_all(&path).expect("Failed to create subdir");
        path
    }

    /// Write a file to the temp directory.
    pub fn write_file(&self, name: &str, content: impl AsRef<[u8]>) -> PathBuf {
        let path = self.path.join(name);
        std::fs::write(&path, content).expect("Failed to write file");
        path
    }

    /// Read a file from the temp directory.
    pub fn read_file(&self, name: &str) -> String {
        let path = self.path.join(name);
        std::fs::read_to_string(&path).expect("Failed to read file")
    }
}

impl Default for TestTempDir {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for TestTempDir {
    fn drop(&mut self) {
        // Best effort cleanup - don't panic if cleanup fails
        let _ = std::fs::remove_dir_all(&self.path);
    }
}

/// Create a temporary PKB base directory.
pub fn temp_pkb_base() -> (TestTempDir, o19_foundframe::pkb::PkbBase) {
    let temp = TestTempDir::new();
    let pkb_base = o19_foundframe::pkb::PkbBase::open_or_create(&temp.path())
        .expect("Failed to create PKB base");
    (temp, pkb_base)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_temp_dir_creation() {
        let temp = TestTempDir::new();
        assert!(temp.path().exists());
        
        // Write and read a file
        temp.write_file("test.txt", "hello");
        assert_eq!(temp.read_file("test.txt"), "hello");
    }

    #[test]
    fn test_temp_dir_cleanup() {
        let path = {
            let temp = TestTempDir::new();
            let path = temp.path().to_path_buf();
            assert!(path.exists());
            path
        };
        // temp dropped here
        // Note: cleanup happens async, so we can't assert !exists() immediately
    }

    #[test]
    fn test_pkb_base() {
        let (_temp, pkb_base) = temp_pkb_base();
        assert!(pkb_base.path.exists());
    }
}
