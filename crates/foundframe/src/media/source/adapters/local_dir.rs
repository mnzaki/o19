//! Local Directory Adapter
//!
//! Adapter for local filesystem directories.
//! Scans directories for media files using mtime/size comparison.

use std::collections::HashMap;
use std::path::PathBuf;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::error::{Error, Result};
use crate::media::source::adapter::{SourceAdapter, SourceConfig};
use crate::media::source::types::{
    MediaItem, MediaLocation, PollOutput, PullConfig, PushConfig, SourceCapability,
};

/// Adapter for local filesystem directories.
pub struct LocalDirAdapter;

/// Configuration for local directory source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalDirConfig {
    /// Absolute path to directory
    pub path: PathBuf,
    /// Whether to scan recursively
    pub recursive: bool,
    /// Include patterns (regex)
    pub include_patterns: Vec<String>,
    /// Exclude patterns (regex)
    pub exclude_patterns: Vec<String>,
}

impl SourceConfig for LocalDirConfig {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
    
    fn serialize_json(&self) -> Result<String> {
        serde_json::to_string(self)
            .map_err(|e| Error::Other(format!("Failed to serialize LocalDirConfig: {}", e)))
    }
}

/// Cursor state for local directory polling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalDirCursor {
    /// Last scan timestamp (mtime comparison)
    pub last_scan_at: i64,
    /// Known files: path -> (mtime, size)
    pub known_files: HashMap<String, (i64, u64)>,
}

#[async_trait]
impl SourceAdapter for LocalDirAdapter {
    fn capabilities(&self) -> Vec<SourceCapability> {
        vec![SourceCapability::Pull]
    }
    
    fn create_pull_config(&self, url: &str, _config: PullConfig) -> Result<Box<dyn SourceConfig>> {
        let path = if url.starts_with("file://") {
            PathBuf::from(&url[7..])
        } else {
            PathBuf::from(url)
        };
        
        Ok(Box::new(LocalDirConfig {
            path,
            recursive: true,
            include_patterns: vec![
                r"\.(jpg|jpeg|png|gif|webp|mp4|mov|mp3|wav)$".to_string(),
            ],
            exclude_patterns: vec![
                r"/\.".to_string(),  // Hidden directories/files
                r"/thumb\.|/thumb_".to_string(),  // Thumbnails
            ],
        }))
    }
    
    async fn validate_pull(&self, config: &Box<dyn SourceConfig>) -> Result<()> {
        let config = config.as_any()
            .downcast_ref::<LocalDirConfig>()
            .ok_or_else(|| Error::Other("Invalid config type".into()))?;
        
        // Check path exists and is directory
        let metadata = tokio::fs::metadata(&config.path).await
            .map_err(|e| Error::Other(format!("Cannot access directory: {}", e)))?;
        
        if !metadata.is_dir() {
            return Err(Error::Other("Path is not a directory".into()));
        }
        
        // Try listing entries
        let mut entries = tokio::fs::read_dir(&config.path).await
            .map_err(|e| Error::Other(format!("Cannot read directory: {}", e)))?;
        
        // Just check we can read at least one entry (or empty is ok)
        let _ = entries.next_entry().await;
        
        Ok(())
    }
    
    async fn poll(
        &self,
        config: &Box<dyn SourceConfig>,
        cursor: Option<&str>,
    ) -> Result<PollOutput> {
        let config = config.as_any()
            .downcast_ref::<LocalDirConfig>()
            .ok_or_else(|| Error::Other("Invalid config type".into()))?;
        
        // Parse cursor or create fresh
        let mut cursor: LocalDirCursor = cursor
            .and_then(|c| serde_json::from_str(c).ok())
            .unwrap_or_else(|| LocalDirCursor {
                last_scan_at: 0,
                known_files: HashMap::new(),
            });
        
        let mut items = Vec::new();
        let mut new_known = HashMap::new();
        let scan_start = chrono::Utc::now().timestamp_millis();
        
        // Walk directory
        self.scan_directory(&config.path, config, &mut items, &mut new_known, &cursor).await?;
        
        // Update cursor
        cursor.known_files = new_known;
        cursor.last_scan_at = scan_start;
        
        Ok(PollOutput {
            items,
            next_cursor: Some(serde_json::to_string(&cursor)
                .map_err(|e| Error::Other(format!("Failed to serialize cursor: {}", e)))?),
            has_more: false, // Local dir scan is complete
        })
    }
    
    // Push mode not supported
    fn create_push_config(&self, _url: &str, _config: PushConfig) -> Result<Box<dyn SourceConfig>> {
        Err(Error::Other("Local directory does not support push mode".into()))
    }
    
    async fn setup_push_endpoint(&self, _config: &Box<dyn SourceConfig>) -> Result<String> {
        Err(Error::Other("Local directory does not support push mode".into()))
    }
    
    async fn teardown_push_endpoint(&self, _endpoint_id: &str) -> Result<()> {
        Err(Error::Other("Local directory does not support push mode".into()))
    }
    
    fn on_push_event(
        &self, 
        _endpoint_id: &str, 
        _callback: Box<dyn Fn(Vec<MediaItem>) + Send + 'static>
    ) {
        panic!("Local directory does not support push mode");
    }
}

impl LocalDirAdapter {
    async fn scan_directory(
        &self,
        dir: &PathBuf,
        config: &LocalDirConfig,
        items: &mut Vec<MediaItem>,
        new_known: &mut HashMap<String, (i64, u64)>,
        cursor: &LocalDirCursor,
    ) -> Result<()> {
        let mut entries = tokio::fs::read_dir(dir).await?;
        
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            let path_str = path.to_string_lossy().to_string();
            
            // Check exclude patterns
            if config.exclude_patterns.iter().any(|p| path_str.contains(p)) {
                continue;
            }
            
            let metadata = entry.metadata().await?;
            
            if metadata.is_dir() && config.recursive {
                // Recurse into subdirectory
                Box::pin(self.scan_directory(&path, config, items, new_known, cursor)).await?;
            } else if metadata.is_file() {
                // Check include patterns
                if !config.include_patterns.iter().any(|p| {
                    regex::Regex::new(p).ok()
                        .map(|r| r.is_match(&path_str))
                        .unwrap_or(false)
                }) {
                    continue;
                }
                
                let mtime = metadata.modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                let size = metadata.len();
                
                // Check if file is new or modified
                let is_new = match cursor.known_files.get(&path_str) {
                    Some((old_mtime, old_size)) => mtime > *old_mtime || size != *old_size,
                    None => true,
                };
                
                new_known.insert(path_str.clone(), (mtime, size));
                
                if is_new {
                    // Create MediaItem
                    let mime = mime_guess::from_path(&path).first()
                        .map(|m| m.to_string())
                        .unwrap_or_else(|| "application/octet-stream".to_string());
                    
                    items.push(MediaItem {
                        source_id: format!("localdir:{}", path_str),
                        source_url: format!("file://{}", path_str),
                        discovered_at: chrono::Utc::now(),
                        source_modified_at: Some(chrono::DateTime::from_timestamp_millis(mtime)
                            .unwrap_or_else(|| chrono::Utc::now())),
                        content_type: mime,
                        location: MediaLocation::LocalPath(path),
                        size_bytes: Some(size),
                        content_hash: None, // Computed later during PKB ingest
                        metadata: serde_json::json!({
                            "source_type": "localdir",
                        }),
                    });
                }
            }
        }
        
        Ok(())
    }
}
