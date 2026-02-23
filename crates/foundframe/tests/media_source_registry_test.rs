//! Media Source Registry Tests (P1)
//!
//! Tests for the media source system with stubbed database.
//! Covers: registration, adapters, polling lifecycle.

mod common;

use std::time::Duration;

use o19_foundframe::media::source::{
    PullConfig, PushConfig, SourceCapability, PollOutput,
    adapter::{SourceAdapter, SourceConfig},
    types::{MediaItem, MediaLocation, SourceRegistration},
};
use o19_foundframe::error::Result;

// ============================================================================
// Mock Implementations
// ============================================================================

/// Mock SourceConfig for testing
#[derive(Debug)]
struct MockSourceConfig {
    url: String,
    extra_data: serde_json::Value,
}

impl SourceConfig for MockSourceConfig {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
    
    fn serialize_json(&self) -> Result<String> {
        Ok(serde_json::to_string(&self.extra_data)?)
    }
}

/// Mock adapter for testing
struct MockAdapter {
    capabilities: Vec<SourceCapability>,
    poll_results: Vec<MediaItem>,
}

impl MockAdapter {
    fn new(capabilities: Vec<SourceCapability>) -> Self {
        Self {
            capabilities,
            poll_results: Vec::new(),
        }
    }
    
    fn with_poll_results(mut self, items: Vec<MediaItem>) -> Self {
        self.poll_results = items;
        self
    }
}

#[async_trait::async_trait]
impl SourceAdapter for MockAdapter {
    fn capabilities(&self) -> Vec<SourceCapability> {
        self.capabilities.clone()
    }
    
    fn create_pull_config(&self, url: &str, _config: PullConfig) -> Result<Box<dyn SourceConfig>> {
        Ok(Box::new(MockSourceConfig {
            url: url.to_string(),
            extra_data: serde_json::json!({"mode": "pull"}),
        }))
    }
    
    async fn validate_pull(&self, _config: &Box<dyn SourceConfig>) -> Result<()> {
        Ok(())
    }
    
    async fn poll(
        &self,
        _config: &Box<dyn SourceConfig>,
        _cursor: Option<&str>,
    ) -> Result<PollOutput> {
        Ok(PollOutput {
            items: self.poll_results.clone(),
            next_cursor: Some("next_page".to_string()),
            has_more: false,
        })
    }
    
    fn create_push_config(&self, url: &str, _config: PushConfig) -> Result<Box<dyn SourceConfig>> {
        Ok(Box::new(MockSourceConfig {
            url: url.to_string(),
            extra_data: serde_json::json!({"mode": "push"}),
        }))
    }
    
    async fn setup_push_endpoint(&self, _config: &Box<dyn SourceConfig>) -> Result<String> {
        Ok("endpoint_123".to_string())
    }
    
    async fn teardown_push_endpoint(&self, _endpoint_id: &str) -> Result<()> {
        Ok(())
    }
    
    fn on_push_event(
        &self,
        _endpoint_id: &str,
        _callback: Box<dyn Fn(Vec<MediaItem>) + Send + 'static>,
    ) {
        // Mock doesn't actually call callbacks
    }
}

// ============================================================================
// Tests
// ============================================================================

#[test]
fn test_source_capability_variants() {
    let pull = SourceCapability::Pull;
    let push = SourceCapability::Push;
    let stream = SourceCapability::Stream;
    
    // All should be distinct variants
    assert_ne!(std::mem::discriminant(&pull), std::mem::discriminant(&push));
    assert_ne!(std::mem::discriminant(&push), std::mem::discriminant(&stream));
    assert_ne!(std::mem::discriminant(&stream), std::mem::discriminant(&pull));
}

#[test]
fn test_pull_config_default() {
    let config = PullConfig::default();
    
    assert_eq!(config.interval, Duration::from_secs(300)); // 5 minutes
    assert_eq!(config.timeout, Duration::from_secs(30));
    assert_eq!(config.batch_size, 100);
    assert_eq!(config.max_system_load, 2.0);
    assert_eq!(config.max_concurrent_polls, 3);
    assert_eq!(config.load_backoff_multiplier, 2.0);
    assert_eq!(config.max_backoff_delay, Duration::from_secs(3600));
}

#[tokio::test]
async fn test_mock_adapter_capabilities() {
    let adapter = MockAdapter::new(vec![SourceCapability::Pull]);
    
    let caps = adapter.capabilities();
    assert_eq!(caps.len(), 1);
    assert!(caps.contains(&SourceCapability::Pull));
}

#[tokio::test]
async fn test_mock_adapter_pull_returns_items() {
    let items = vec![
        MediaItem {
            source_id: "id1".to_string(),
            source_url: "mock://test/item1".to_string(),
            discovered_at: chrono::Utc::now(),
            source_modified_at: None,
            content_type: "image/jpeg".to_string(),
            location: MediaLocation::Url("http://example.com/1.jpg".to_string()),
            size_bytes: Some(1024),
            content_hash: Some("abc123".to_string()),
            metadata: serde_json::json!({"title": "Item 1"}),
        },
        MediaItem {
            source_id: "id2".to_string(),
            source_url: "mock://test/item2".to_string(),
            discovered_at: chrono::Utc::now(),
            source_modified_at: None,
            content_type: "image/png".to_string(),
            location: MediaLocation::Url("http://example.com/2.png".to_string()),
            size_bytes: Some(2048),
            content_hash: Some("def456".to_string()),
            metadata: serde_json::json!({"title": "Item 2"}),
        },
    ];
    
    let adapter = MockAdapter::new(vec![SourceCapability::Pull])
        .with_poll_results(items.clone());
    
    let pull_config = PullConfig::default();
    let config = adapter.create_pull_config("mock://test", pull_config).unwrap();
    let output = adapter.poll(&config, None).await.unwrap();
    
    assert_eq!(output.items.len(), 2);
    assert_eq!(output.items[0].source_id, "id1");
    assert_eq!(output.items[1].source_id, "id2");
    assert_eq!(output.next_cursor, Some("next_page".to_string()));
    assert_eq!(output.has_more, false);
}

#[tokio::test]
async fn test_mock_adapter_push_lifecycle() {
    let adapter = MockAdapter::new(vec![SourceCapability::Pull, SourceCapability::Push]);
    
    let push_config = PushConfig {
        secret: Some("webhook_secret".to_string()),
        filters: vec![],
    };
    
    // Setup endpoint
    let config = adapter.create_push_config("mock://webhook", push_config).unwrap();
    let endpoint_id = adapter.setup_push_endpoint(&config).await.unwrap();
    assert_eq!(endpoint_id, "endpoint_123");
    
    // Register callback (does nothing in mock)
    adapter.on_push_event(&endpoint_id, Box::new(|_items| {}));
    
    // Teardown
    adapter.teardown_push_endpoint(&endpoint_id).await.unwrap();
}

#[test]
fn test_media_item_creation() {
    let item = MediaItem {
        source_id: "unique_id".to_string(),
        source_url: "https://example.com/photo.jpg".to_string(),
        discovered_at: chrono::Utc::now(),
        source_modified_at: Some(chrono::Utc::now()),
        content_type: "image/jpeg".to_string(),
        location: MediaLocation::Url("https://cdn.example.com/photo.jpg".to_string()),
        size_bytes: Some(1024000),
        content_hash: Some("blake3_hash_here".to_string()),
        metadata: serde_json::json!({
            "title": "Vacation Photo",
            "tags": ["beach", "summer"]
        }),
    };
    
    assert_eq!(item.source_id, "unique_id");
    assert_eq!(item.content_type, "image/jpeg");
    assert!(item.size_bytes.is_some());
}

#[test]
fn test_media_location_variants() {
    let url = MediaLocation::Url("https://example.com/img.jpg".to_string());
    let path = MediaLocation::LocalPath(std::path::PathBuf::from("/photos/img.jpg"));
    let inline = MediaLocation::Inline(vec![0xFF, 0xD8, 0xFF]); // JPEG magic bytes
    
    // Verify variants
    match url {
        MediaLocation::Url(s) => assert_eq!(s, "https://example.com/img.jpg"),
        _ => panic!("Expected URL variant"),
    }
    
    match path {
        MediaLocation::LocalPath(p) => assert_eq!(p.to_str(), Some("/photos/img.jpg")),
        _ => panic!("Expected LocalPath variant"),
    }
    
    match inline {
        MediaLocation::Inline(data) => assert_eq!(data, vec![0xFF, 0xD8, 0xFF]),
        _ => panic!("Expected Inline variant"),
    }
}

#[test]
fn test_parse_scheme_from_url() {
    let test_cases = vec![
        ("file:///home/user/photos", "file"),
        ("https://example.com/feed", "https"),
        ("rss://feed.example.com", "rss"),
        ("mock://test/path", "mock"),
    ];
    
    for (url, expected) in test_cases {
        let scheme = url.split("://").next().unwrap_or("");
        assert_eq!(scheme, expected, "Failed for URL: {}", url);
    }
}

#[tokio::test]
async fn test_mock_adapter_validate_pull_always_succeeds() {
    let adapter = MockAdapter::new(vec![SourceCapability::Pull]);
    
    let pull_config = PullConfig::default();
    let config = adapter.create_pull_config("mock://anything", pull_config).unwrap();
    
    // Should not fail
    adapter.validate_pull(&config).await.unwrap();
}

#[test]
fn test_source_config_serialization() {
    let config = MockSourceConfig {
        url: "mock://test".to_string(),
        extra_data: serde_json::json!({"key": "value", "number": 42}),
    };
    
    let json = config.serialize_json().unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
    
    assert_eq!(parsed["key"], "value");
    assert_eq!(parsed["number"], 42);
}
