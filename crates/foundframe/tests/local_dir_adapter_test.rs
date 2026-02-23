//! Local Directory Adapter Tests (P1)
//!
//! Tests for the local filesystem media source adapter.
//! Uses temporary directories for isolated testing.

mod common;

use common::TestTempDir;
use o19_foundframe::media::source::{
    PullConfig, SourceCapability,
    adapters::LocalDirAdapter,
    adapter::SourceAdapter,
    types::MediaLocation,
};

#[tokio::test]
async fn test_local_dir_adapter_capabilities() {
    let adapter = LocalDirAdapter;
    
    let caps = adapter.capabilities();
    assert!(caps.contains(&SourceCapability::Pull));
    // Local dir doesn't support push by default
}

#[tokio::test]
async fn test_local_dir_poll_finds_images() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("photos");
    
    // Create some test image files
    temp.write_file("photos/photo1.jpg", "fake jpg content 1");
    temp.write_file("photos/photo2.png", "fake png content");
    temp.write_file("photos/photo3.gif", "fake gif content");
    temp.write_file("photos/notes.txt", "not an image");
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let config = adapter.create_pull_config(
        &format!("file://{}", photos_dir.display()),
        pull_config
    ).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    // Should find the image files (txt should be ignored)
    assert_eq!(output.items.len(), 3, "Should find 3 image files");
    
    // Verify MIME types are detected
    let mime_types: Vec<_> = output.items.iter()
        .map(|item| item.content_type.clone())
        .collect();
    
    assert!(mime_types.contains(&"image/jpeg".to_string()));
    assert!(mime_types.contains(&"image/png".to_string()));
    assert!(mime_types.contains(&"image/gif".to_string()));
    
    // Should have a cursor for resuming
    assert!(output.next_cursor.is_some());
}

#[tokio::test]
async fn test_local_dir_poll_respects_cursor() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("photos");
    
    // Create files
    temp.write_file("photos/old.jpg", "old content");
    temp.write_file("photos/new.jpg", "new content");
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    // First pull - no cursor
    let output1 = adapter.poll(&config, None).await.unwrap();
    assert_eq!(output1.items.len(), 2);
    
    // Second pull - with cursor
    if let Some(cursor) = output1.next_cursor {
        let output2 = adapter.poll(&config, Some(&cursor)).await.unwrap();
        // With a cursor, should get same or fewer items
        assert!(output2.items.len() <= output1.items.len());
    }
}

#[tokio::test]
async fn test_local_dir_poll_empty_directory() {
    let temp = TestTempDir::new();
    let empty_dir = temp.create_dir("empty");
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", empty_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    assert!(output.items.is_empty());
    assert!(output.next_cursor.is_some()); // Still returns cursor for consistency
    assert_eq!(output.has_more, false);
}

#[tokio::test]
async fn test_local_dir_poll_nested_directories() {
    let temp = TestTempDir::new();
    
    // Create nested structure
    temp.create_dir("photos/2024");
    temp.create_dir("photos/2024/january");
    temp.write_file("photos/2024/january/pic1.jpg", "content1");
    temp.write_file("photos/2024/pic2.jpg", "content2");
    temp.write_file("photos/pic3.jpg", "content3");
    
    let photos_dir = temp.path().join("photos");
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    // Should find all images recursively
    assert_eq!(output.items.len(), 3, "Should find all 3 images in nested dirs");
    
    // Verify paths are correct (should be local paths)
    let has_nested = output.items.iter().any(|item| {
        match &item.location {
            MediaLocation::LocalPath(p) => p.to_string_lossy().contains("january/pic1.jpg"),
            _ => false,
        }
    });
    assert!(has_nested, "Should find nested image");
}

#[tokio::test]
async fn test_local_dir_finds_visible_files() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("photos");
    
    // Create regular files
    temp.write_file("photos/visible1.jpg", "visible content 1");
    temp.write_file("photos/visible2.jpg", "visible content 2");
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    // Should find both visible files
    assert_eq!(output.items.len(), 2);
    assert!(output.items.iter().any(|i| i.source_url.contains("visible1.jpg")));
    assert!(output.items.iter().any(|i| i.source_url.contains("visible2.jpg")));
}

#[tokio::test]
async fn test_local_dir_detects_mime_types() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("mixed");
    
    // Create various file types (only images are in include_patterns)
    temp.write_file("mixed/photo.jpg", "jpg");
    temp.write_file("mixed/photo.jpeg", "jpeg");
    temp.write_file("mixed/image.png", "png");
    temp.write_file("mixed/anim.gif", "gif");
    // PDF is not in the default include_patterns, so it won't be detected
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    // Check detected MIME types (only images)
    let types: Vec<_> = output.items.iter()
        .map(|i| i.content_type.clone())
        .collect();
    
    assert!(types.contains(&"image/jpeg".to_string()), "Should detect JPEG");
    assert!(types.contains(&"image/png".to_string()), "Should detect PNG");
    assert!(types.contains(&"image/gif".to_string()), "Should detect GIF");
    // Note: PDF is excluded by default include patterns
}

#[tokio::test]
async fn test_local_dir_generates_content_info() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("photos");
    
    let content = "unique content for sizing";
    temp.write_file("photos/single.jpg", content);
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    assert_eq!(output.items.len(), 1);
    
    let item = &output.items[0];
    
    // Should have correct size
    assert_eq!(item.size_bytes, Some(content.len() as u64));
    
    // Note: content_hash is NOT computed by the adapter (line 227 in local_dir.rs)
    // It's computed later during PKB ingestion
    assert!(item.content_hash.is_none(), "Content hash is computed during PKB ingest, not by adapter");
    
    // Should have source_id (filename-based)
    assert!(item.source_id.contains("single.jpg"));
    assert!(item.source_id.starts_with("localdir:"));
}

#[tokio::test]
async fn test_local_dir_validate_pull_succeeds_for_valid_dir() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("photos");
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    // Should succeed for existing directory
    adapter.validate_pull(&config).await.unwrap();
}

#[tokio::test]
async fn test_local_dir_items_have_correct_source_url() {
    let temp = TestTempDir::new();
    let photos_dir = temp.create_dir("photos");
    
    temp.write_file("photos/test.jpg", "test content");
    
    let adapter = LocalDirAdapter;
    let pull_config = PullConfig::default();
    let url = format!("file://{}", photos_dir.display());
    let config = adapter.create_pull_config(&url, pull_config).unwrap();
    
    let output = adapter.poll(&config, None).await.unwrap();
    
    assert_eq!(output.items.len(), 1);
    // source_url should be the file:// URL
    assert!(output.items[0].source_url.starts_with("file://"));
    assert!(output.items[0].source_url.contains("test.jpg"));
}
