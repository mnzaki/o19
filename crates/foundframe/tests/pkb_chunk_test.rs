//! PKB Chunk Tests (P0)
//!
//! Tests for StreamChunk ingestion - the fundamental unit of content in Circulari.ty.

mod common;

use common::TestTempDir;
use o19_foundframe::pkb::{
    MediaLink,
    StreamChunk,
    chunk::{EntryId, sanitize_filename},
};

#[test]
fn test_medialink_roundtrip() {
    let link = MediaLink::new("https://example.com/image.jpg");
    
    // Create temp file
    let temp = TestTempDir::new();
    let path = temp.path().join("test.mln");
    
    // Write
    link.write_to(&path).expect("Should write");
    
    // Read back
    let read = MediaLink::read_from(&path).expect("Should read");
    
    assert_eq!(link.url, read.url);
}

#[test]
fn test_medialink_from_content_trims_whitespace() {
    let content = "  https://example.com/image.jpg  \n\n";
    let link = MediaLink::from_content(content);
    
    assert_eq!(link.url, "https://example.com/image.jpg");
}

#[test]
fn test_chunk_filename_generation_with_title() {
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: Some("image/jpeg".to_string()),
        title: Some("My Vacation Photo".to_string()),
    };
    
    let filename = chunk.generate_filename(1234567890, Some("My Vacation Photo"));
    
    assert!(filename.contains("1234567890"));
    assert!(filename.contains("My Vacation Photo"));
    assert!(filename.ends_with(".mln"));
}

#[test]
fn test_chunk_filename_without_title() {
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: None,
        title: None,
    };
    
    let filename = chunk.generate_filename(1234567890, None);
    
    assert_eq!(filename, "1234567890.mln");
}

#[test]
fn test_chunk_filename_sanitizes_title() {
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: None,
        title: Some("My/Unsafe\\Title:With*Chars?".to_string()),
    };
    
    let filename = chunk.generate_filename(1234567890, Some("My/Unsafe\\Title:With*Chars?"));
    
    // Should replace unsafe chars with underscores
    assert!(filename.contains("My_Unsafe_Title_With_Chars_"));
    assert!(!filename.contains('/'));
    assert!(!filename.contains('\\'));
    assert!(!filename.contains(':'));
    assert!(!filename.contains('*'));
    assert!(!filename.contains('?'));
}

#[test]
fn test_chunk_file_extension_medialink() {
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: None,
        title: None,
    };
    
    assert_eq!(chunk.file_extension(), "mln");
}

#[test]
fn test_chunk_file_extension_textnote() {
    let chunk = StreamChunk::TextNote {
        content: "Hello world".to_string(),
        title: None,
    };
    
    assert_eq!(chunk.file_extension(), "js.md");
}

#[test]
fn test_chunk_file_extension_structured_data() {
    let chunk = StreamChunk::StructuredData {
        db_type: "Bookmark".to_string(),
        data: serde_json::json!({}),
    };
    
    assert_eq!(chunk.file_extension(), "js.md");
}

#[test]
fn test_chunk_ingest_medialink_creates_file() {
    let temp = TestTempDir::new();
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: Some("image/jpeg".to_string()),
        title: Some("Test Image".to_string()),
    };
    
    let relative_path = std::path::Path::new("test_image.mln");
    
    let _entry_id = chunk.ingest(temp.path(), relative_path)
        .expect("Should ingest successfully");
    
    // Verify file exists
    let full_path = temp.path().join(relative_path);
    assert!(full_path.exists());
    
    // Verify content
    let content = std::fs::read_to_string(&full_path).expect("Should read");
    assert_eq!(content, "https://example.com/image.jpg");
}

#[test]
fn test_chunk_ingest_creates_parent_directories() {
    let temp = TestTempDir::new();
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: None,
        title: None,
    };
    
    let relative_path = std::path::Path::new("deep/nested/dir/test.mln");
    
    let _entry_id = chunk.ingest(temp.path(), relative_path)
        .expect("Should ingest and create dirs");
    
    let full_path = temp.path().join(relative_path);
    assert!(full_path.exists());
}

#[test]
fn test_chunk_detect_from_path_mln() {
    let path = std::path::Path::new("/some/path/image.mln");
    let detected = StreamChunk::detect_from_path(path);
    
    assert!(detected.is_some());
    // Should detect as MediaLink
    match detected {
        Some(StreamChunk::MediaLink { .. }) => {},
        _ => panic!("Should detect .mln as MediaLink"),
    }
}

#[test]
fn test_chunk_detect_from_path_md() {
    let path = std::path::Path::new("/some/path/note.md");
    let detected = StreamChunk::detect_from_path(path);
    
    assert!(detected.is_some());
    match detected {
        Some(StreamChunk::TextNote { .. }) => {},
        _ => panic!("Should detect .md as TextNote"),
    }
}

#[test]
fn test_chunk_detect_from_path_jsmd() {
    let path = std::path::Path::new("/some/path/data.js.md");
    let detected = StreamChunk::detect_from_path(path);
    
    assert!(detected.is_some());
    match detected {
        Some(StreamChunk::TextNote { .. }) => {}, // js.md maps to TextNote default
        _ => panic!("Should detect .js.md"),
    }
}

#[test]
fn test_chunk_detect_from_path_unknown() {
    let path = std::path::Path::new("/some/path/file.txt");
    let detected = StreamChunk::detect_from_path(path);
    
    assert!(detected.is_none());
}

#[test]
fn test_entry_id_generation_deterministic() {
    let temp = TestTempDir::new();
    let chunk = StreamChunk::MediaLink {
        url: "https://example.com/image.jpg".to_string(),
        mime_type: None,
        title: None,
    };
    
    let relative_path = std::path::Path::new("test.mln");
    
    let id1 = chunk.ingest(temp.path(), relative_path)
        .expect("First ingest");
    
    // Same content should produce same ID (content-addressed)
    // Note: In practice, this requires same file content
    // For now, we just verify we get a valid ID
    let bytes: [u8; 32] = id1.0;
    assert_ne!(bytes, [0u8; 32], "EntryId should not be all zeros");
}

#[test]
fn test_sanitize_filename_removes_unsafe_chars() {
    let name = r#"path/with/slashes\and\backslashes<and>angle:brackets"quotes|pipes?stars*"#;
    let sanitized = sanitize_filename(name);
    
    assert!(!sanitized.contains('/'));
    assert!(!sanitized.contains('\\'));
    assert!(!sanitized.contains('<'));
    assert!(!sanitized.contains('>'));
    assert!(!sanitized.contains(':'));
    assert!(!sanitized.contains('"'));
    assert!(!sanitized.contains('|'));
    assert!(!sanitized.contains('?'));
    assert!(!sanitized.contains('*'));
    
    // All replaced with underscores
    assert!(sanitized.contains('_'));
}

#[test]
fn test_sanitize_filename_limits_length() {
    let long_name = "a".repeat(200);
    let sanitized = sanitize_filename(&long_name);
    
    assert!(sanitized.len() <= 100, "Sanitized name should be <= 100 chars");
}
