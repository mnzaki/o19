//! Test Database Stub - Mock implementation for testing
//!
//! SPIRAL: This is a temporary mock DB for testing until midstage ORM generates
//! the real implementation. It provides:
//! - In-memory storage (HashMap-based)
//! - Deterministic IDs (auto-incrementing)
//! - Clone-able for easy test isolation
//!
//! Yasta e7na mish 2olaylin 3al kalam dah! :D

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use o19_foundframe::error::Result;

/// Mock database for testing - stores everything in memory
#[derive(Clone)]
pub struct TestDatabase {
    inner: Arc<Mutex<TestDbInner>>,
}

#[derive(Default)]
struct TestDbInner {
    media_sources: HashMap<i64, TestMediaSource>,
    next_id: i64,
}

/// Test version of MediaSource row
#[derive(Debug, Clone)]
pub struct TestMediaSource {
    pub id: i64,
    pub url: String,
    pub adapter_type: String,
    pub cursor_state: Option<String>,
    pub capabilities: String,
    pub config: Option<String>,
    pub last_polled_at: Option<i64>,
    pub last_error: Option<String>,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Insert parameters for media_source
pub struct InsertMediaSource {
    pub url: String,
    pub adapter_type: String,
    pub cursor_state: Option<String>,
    pub capabilities: String,
    pub config: Option<String>,
    pub is_active: bool,
}

impl TestDatabase {
    /// Create a new empty test database
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(TestDbInner::default())),
        }
    }

    /// Reset the database (clear all data)
    pub fn reset(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.media_sources.clear();
        inner.next_id = 0;
    }

    /// Insert a media source, returns the new ID
    pub async fn insert_media_source(&self, params: InsertMediaSource) -> Result<i64> {
        let mut inner = self.inner.lock().unwrap();
        
        let id = inner.next_id + 1;
        inner.next_id = id;
        
        let now = chrono::Utc::now().timestamp_millis();
        
        let source = TestMediaSource {
            id,
            url: params.url,
            adapter_type: params.adapter_type,
            cursor_state: params.cursor_state,
            capabilities: params.capabilities,
            config: params.config,
            last_polled_at: None,
            last_error: None,
            is_active: params.is_active,
            created_at: now,
            updated_at: now,
        };
        
        inner.media_sources.insert(id, source);
        Ok(id)
    }

    /// Get a media source by ID
    pub async fn get_media_source(&self, id: i64) -> Result<Option<TestMediaSource>> {
        let inner = self.inner.lock().unwrap();
        Ok(inner.media_sources.get(&id).cloned())
    }

    /// List all media sources
    pub async fn list_media_sources(&self) -> Result<Vec<TestMediaSource>> {
        let inner = self.inner.lock().unwrap();
        let mut sources: Vec<_> = inner.media_sources.values().cloned().collect();
        sources.sort_by_key(|s| s.id);
        Ok(sources)
    }

    /// List active media sources
    pub async fn list_active_media_sources(&self) -> Result<Vec<TestMediaSource>> {
        let inner = self.inner.lock().unwrap();
        let mut sources: Vec<_> = inner.media_sources
            .values()
            .filter(|s| s.is_active)
            .cloned()
            .collect();
        sources.sort_by_key(|s| s.id);
        Ok(sources)
    }

    /// Update cursor for a source
    pub async fn update_media_source_cursor(&self, id: i64, cursor: &str) -> Result<()> {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(source) = inner.media_sources.get_mut(&id) {
            source.cursor_state = Some(cursor.to_string());
            source.updated_at = chrono::Utc::now().timestamp_millis();
        }
        
        Ok(())
    }

    /// Update last polled timestamp
    pub async fn update_media_source_last_polled(&self, id: i64) -> Result<()> {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(source) = inner.media_sources.get_mut(&id) {
            source.last_polled_at = Some(chrono::Utc::now().timestamp_millis());
            source.updated_at = chrono::Utc::now().timestamp_millis();
        }
        
        Ok(())
    }

    /// Update error message
    pub async fn update_media_source_error(&self, id: i64, error: &str) -> Result<()> {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(source) = inner.media_sources.get_mut(&id) {
            source.last_error = Some(error.to_string());
            source.updated_at = chrono::Utc::now().timestamp_millis();
        }
        
        Ok(())
    }

    /// Clear error message
    pub async fn clear_media_source_error(&self, id: i64) -> Result<()> {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(source) = inner.media_sources.get_mut(&id) {
            source.last_error = None;
            source.updated_at = chrono::Utc::now().timestamp_millis();
        }
        
        Ok(())
    }

    /// Update active status
    pub async fn update_media_source_active(&self, id: i64, active: bool) -> Result<()> {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(source) = inner.media_sources.get_mut(&id) {
            source.is_active = active;
            source.updated_at = chrono::Utc::now().timestamp_millis();
        }
        
        Ok(())
    }

    /// Get cursor for a source
    pub async fn get_media_source_cursor(&self, id: i64) -> Result<Option<String>> {
        let inner = self.inner.lock().unwrap();
        Ok(inner.media_sources.get(&id).and_then(|s| s.cursor_state.clone()))
    }
}

impl Default for TestDatabase {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_insert_and_get() {
        let db = TestDatabase::new();
        
        let id = db.insert_media_source(InsertMediaSource {
            url: "file:///test".to_string(),
            adapter_type: "localdir".to_string(),
            cursor_state: None,
            capabilities: "[\"PULL\"]".to_string(),
            config: None,
            is_active: true,
        }).await.unwrap();
        
        let source = db.get_media_source(id).await.unwrap().unwrap();
        assert_eq!(source.url, "file:///test");
        assert_eq!(source.adapter_type, "localdir");
    }

    #[tokio::test]
    async fn test_list_active() {
        let db = TestDatabase::new();
        
        // Insert active
        db.insert_media_source(InsertMediaSource {
            url: "file:///active".to_string(),
            adapter_type: "localdir".to_string(),
            cursor_state: None,
            capabilities: "[\"PULL\"]".to_string(),
            config: None,
            is_active: true,
        }).await.unwrap();
        
        // Insert inactive
        db.insert_media_source(InsertMediaSource {
            url: "file:///inactive".to_string(),
            adapter_type: "localdir".to_string(),
            cursor_state: None,
            capabilities: "[\"PULL\"]".to_string(),
            config: None,
            is_active: false,
        }).await.unwrap();
        
        let active = db.list_active_media_sources().await.unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].url, "file:///active");
    }

    #[tokio::test]
    async fn test_update_cursor() {
        let db = TestDatabase::new();
        
        let id = db.insert_media_source(InsertMediaSource {
            url: "file:///test".to_string(),
            adapter_type: "localdir".to_string(),
            cursor_state: None,
            capabilities: "[\"PULL\"]".to_string(),
            config: None,
            is_active: true,
        }).await.unwrap();
        
        db.update_media_source_cursor(id, "{\"mtime\": 123}").await.unwrap();
        
        let cursor = db.get_media_source_cursor(id).await.unwrap();
        assert_eq!(cursor, Some("{\"mtime\": 123}".to_string()));
    }
}
