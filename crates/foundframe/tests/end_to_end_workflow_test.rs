//! End-to-End Workflow Tests (P2)
//!
//! Complete integration tests simulating real user workflows:
//! - Create directory -> Add entries -> Commit to git
//! - Import media -> Generate metadata -> Verify storage
//! - Sync simulation with mock remotes

mod common;

use std::path::Path;
use std::process::Command;

use common::TestTempDir;
use o19_foundframe::pkb::{
    PkbBase, DirectoryMeta,
    chunk::{EntryId, StreamChunk},
    entry::Entry,
};

/// Initialize a git repo for testing (without Radicle)
fn init_git_repo(path: &Path) -> std::io::Result<()> {
    Command::new("git")
        .args(["init", "-q"])
        .current_dir(path)
        .status()?;
    
    // Configure git user for commits
    Command::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(path)
        .status()?;
    
    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(path)
        .status()?;
    
    Ok(())
}

/// Create initial commit in git repo
fn create_initial_commit(path: &Path) -> std::io::Result<()> {
    Command::new("git")
        .args(["add", "."])
        .current_dir(path)
        .status()?;
    
    Command::new("git")
        .args(["commit", "-m", "Initial commit", "-q"])
        .current_dir(path)
        .status()?;
    
    Ok(())
}

/// Workflow 1: Create a notes directory with metadata
#[test]
fn test_workflow_create_notes_directory() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    // Create directory structure
    let notes_dir = base.directory_path("notes");
    std::fs::create_dir_all(&notes_dir).unwrap();
    
    // Initialize as git repo
    init_git_repo(&notes_dir).unwrap();
    
    // Create metadata
    let meta = DirectoryMeta {
        name: "notes".to_string(),
        description: "My personal notes and thoughts".to_string(),
        emoji: Some("📝".to_string()),
        color: Some("#4A90E2".to_string()),
        created_at: 1234567890,
    };
    
    // Write metadata file
    let meta_path = notes_dir.join(".pkb.meta.json");
    let meta_json = serde_json::to_string_pretty(&meta).unwrap();
    std::fs::write(&meta_path, meta_json).unwrap();
    
    // Initial commit
    create_initial_commit(&notes_dir).unwrap();
    
    // Verify structure
    assert!(notes_dir.join(".git").exists());
    assert!(notes_dir.join(".pkb.meta.json").exists());
    
    // Verify metadata can be read back
    let read_meta: DirectoryMeta = serde_json::from_str(
        &std::fs::read_to_string(&meta_path).unwrap()
    ).unwrap();
    
    assert_eq!(read_meta.name, "notes");
    assert_eq!(read_meta.description, "My personal notes and thoughts");
    assert_eq!(read_meta.emoji, Some("📝".to_string()));
}

/// Workflow 2: Add text notes to directory
#[test]
fn test_workflow_add_text_notes() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    // Setup directory
    let notes_dir = base.directory_path("notes");
    std::fs::create_dir_all(&notes_dir).unwrap();
    init_git_repo(&notes_dir).unwrap();
    
    // Create first note
    let note1 = Entry::from_text_note(
        "This is my first note.\nIt has multiple lines.".to_string(),
        Some("First Note".to_string()),
    );
    
    let note1_path = notes_dir.join("first.js.md");
    note1.write_to(&note1_path).unwrap();
    
    // Create second note without title
    let note2 = Entry::from_text_note(
        "Quick thought without a title.".to_string(),
        None,
    );
    
    let note2_path = notes_dir.join("quick_thought.js.md");
    note2.write_to(&note2_path).unwrap();
    
    // Initial commit
    create_initial_commit(&notes_dir).unwrap();
    
    // Verify files exist
    assert!(note1_path.exists());
    assert!(note2_path.exists());
    
    // Read back and verify
    let read_note1 = Entry::read_from(&note1_path).unwrap();
    assert!(read_note1.content.contains("first note"));
    
    let read_note2 = Entry::read_from(&note2_path).unwrap();
    assert!(read_note2.content.contains("Quick thought"));
}

/// Workflow 3: Import media links
#[test]
fn test_workflow_import_media_links() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    let media_dir = base.directory_path("media");
    std::fs::create_dir_all(&media_dir).unwrap();
    init_git_repo(&media_dir).unwrap();
    
    // Create media link entries
    let links = vec![
        ("https://example.com/photo1.jpg", "Vacation Photo 1", "image/jpeg"),
        ("https://example.com/photo2.png", "Vacation Photo 2", "image/png"),
        ("https://example.com/video.mp4", "Family Video", "video/mp4"),
    ];
    
    for (i, (url, title, mime)) in links.iter().enumerate() {
        let chunk = StreamChunk::MediaLink {
            url: url.to_string(),
            mime_type: Some(mime.to_string()),
            title: Some(title.to_string()),
        };
        
        // Generate filename
        let filename = chunk.generate_filename(1234567890 + i as u64, Some(title));
        let path = media_dir.join(&filename);
        
        // Ingest (write to file)
        let entry_id = chunk.ingest(&media_dir, Path::new(&filename)).unwrap();
        
        // Verify file was created
        assert!(path.exists(), "Media link file should be created: {:?}", path);
        
        // Verify we can read it back
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains(url), "File should contain the URL");
        // Note: MediaLink files (.mln) only contain the URL, title is not stored in file
        // The title is used for the filename only
        assert!(filename.contains(title), "Filename should contain the title");
    }
    
    // Commit all
    create_initial_commit(&media_dir).unwrap();
}

/// Workflow 4: Structured data import (bookmarks, etc.)
#[test]
fn test_workflow_import_structured_data() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    let bookmarks_dir = base.directory_path("bookmarks");
    std::fs::create_dir_all(&bookmarks_dir).unwrap();
    init_git_repo(&bookmarks_dir).unwrap();
    
    // Create bookmark entries
    let bookmarks = vec![
        serde_json::json!({
            "title": "Rust Programming Language",
            "url": "https://rust-lang.org",
            "tags": ["programming", "rust", "systems"],
            "description": "The official Rust website"
        }),
        serde_json::json!({
            "title": "Serde Documentation",
            "url": "https://serde.rs",
            "tags": ["rust", "serialization", "docs"],
            "description": "Serialization framework for Rust"
        }),
    ];
    
    for (i, data) in bookmarks.iter().enumerate() {
        let entry = Entry::from_structured_data("Bookmark".to_string(), data.clone());
        
        let filename = format!("bookmark_{}.js.md", i);
        let path = bookmarks_dir.join(&filename);
        entry.write_to(&path).unwrap();
        
        // Verify
        assert!(path.exists());
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("Bookmark"));
    }
    
    create_initial_commit(&bookmarks_dir).unwrap();
}

/// Workflow 5: Compute and verify content hashes
#[test]
fn test_workflow_content_hashing() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    let notes_dir = base.directory_path("notes");
    std::fs::create_dir_all(&notes_dir).unwrap();
    
    // Create entry
    let entry = Entry::from_text_note(
        "Content to be hashed.".to_string(),
        Some("Hash Test".to_string()),
    );
    
    // Compute ID (which is a BLAKE3 hash)
    let entry_id = entry.compute_id();
    let hash_bytes: [u8; 32] = entry_id.0;  // ChunkId is a tuple struct
    
    // Verify it's a valid 32-byte hash
    assert_eq!(hash_bytes.len(), 32);
    
    // The hash should be deterministic
    let entry_copy = Entry::from_text_note(
        "Content to be hashed.".to_string(),
        Some("Hash Test".to_string()),
    );
    let entry_id_copy = entry_copy.compute_id();
    
    assert_eq!(entry_id, entry_id_copy, "Same content should produce same hash");
    
    // Different content should produce different hash
    let different_entry = Entry::from_text_note(
        "Different content.".to_string(),
        Some("Hash Test".to_string()),
    );
    let different_id = different_entry.compute_id();
    
    assert_ne!(entry_id, different_id, "Different content should produce different hash");
}

/// Workflow 6: Parse filenames and extract metadata
#[test]
fn test_workflow_parse_entry_filenames() {
    use o19_foundframe::pkb::entry::parse_filename;
    
    // Standard filename with timestamp
    let result = parse_filename("1234567890 My Note.js.md");
    assert!(result.is_some());
    let (timestamp, title) = result.unwrap();
    assert_eq!(timestamp, 1234567890);
    assert_eq!(title, Some("My Note".to_string()));
    
    // Filename without title
    let result = parse_filename("1234567890.js.md");
    assert!(result.is_some());
    let (timestamp, title) = result.unwrap();
    assert_eq!(timestamp, 1234567890);
    assert_eq!(title, None);
    
    // Media link filename
    let result = parse_filename("1234567890 Vacation Photo.mln");
    assert!(result.is_some());
    let (timestamp, title) = result.unwrap();
    assert_eq!(timestamp, 1234567890);
    assert_eq!(title, Some("Vacation Photo".to_string()));
    
    // Invalid filename
    let result = parse_filename("not_a_timestamp.js.md");
    assert!(result.is_none());
}

/// Workflow 7: Multiple directories isolation
#[test]
fn test_workflow_multiple_directories_isolated() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    // Create multiple directories
    let dirs = vec!["notes", "media", "bookmarks"];
    
    for dir_name in &dirs {
        let dir_path = base.directory_path(dir_name);
        std::fs::create_dir_all(&dir_path).unwrap();
        init_git_repo(&dir_path).unwrap();
        
        // Add a marker file
        std::fs::write(dir_path.join(".marker"), dir_name).unwrap();
        create_initial_commit(&dir_path).unwrap();
    }
    
    // Verify each directory is independent
    for dir_name in &dirs {
        let dir_path = base.directory_path(dir_name);
        let marker_content = std::fs::read_to_string(dir_path.join(".marker")).unwrap();
        assert_eq!(marker_content, *dir_name);
        
        // Should have its own .git
        assert!(dir_path.join(".git").exists());
    }
}

/// Workflow 8: Entry modification and versioning (simulated)
#[test]
fn test_workflow_entry_modification() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    let notes_dir = base.directory_path("notes");
    std::fs::create_dir_all(&notes_dir).unwrap();
    init_git_repo(&notes_dir).unwrap();
    
    // Create initial entry
    let entry = Entry::from_text_note(
        "Version 1 content".to_string(),
        Some("My Note".to_string()),
    );
    
    let entry_path = notes_dir.join("note.js.md");
    entry.write_to(&entry_path).unwrap();
    
    // Compute initial ID
    let id1 = entry.compute_id();
    
    // "Modify" the entry (create new version)
    let entry_v2 = Entry::from_text_note(
        "Version 2 content - updated".to_string(),
        Some("My Note".to_string()),
    );
    
    entry_v2.write_to(&entry_path).unwrap();
    let id2 = entry_v2.compute_id();
    
    // IDs should be different because content changed
    assert_ne!(id1, id2);
    
    // IDs should be different because content changed
    assert_ne!(id1, id2);
    
    // Read back and verify new content
    let read_entry = Entry::read_from(&entry_path).unwrap();
    assert!(read_entry.content.contains("Version 2"));
}

/// Workflow 9: Large batch entry creation (performance test)
#[test]
fn test_workflow_batch_entry_creation() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    let notes_dir = base.directory_path("notes");
    std::fs::create_dir_all(&notes_dir).unwrap();
    init_git_repo(&notes_dir).unwrap();
    
    // Create 50 entries
    let start = std::time::Instant::now();
    
    for i in 0..50 {
        let entry = Entry::from_text_note(
            format!("Content of note number {}", i),
            Some(format!("Note {}", i)),
        );
        
        let filename = format!("note_{:03}.js.md", i);
        let path = notes_dir.join(&filename);
        entry.write_to(&path).unwrap();
    }
    
    let duration = start.elapsed();
    
    // Should be fast (less than 1 second for 50 entries)
    assert!(duration.as_secs() < 1, "Batch creation took too long: {:?}", duration);
    
    // Verify all files exist
    for i in 0..50 {
        let filename = format!("note_{:03}.js.md", i);
        assert!(notes_dir.join(&filename).exists());
    }
}

/// Workflow 10: Error handling - invalid paths
#[test]
fn test_workflow_error_handling() {
    let temp = TestTempDir::new();
    let base = PkbBase::open_or_create(&temp.path()).unwrap();
    
    // Note: ingest() creates parent directories, so it won't fail for non-existent dirs
    // It will succeed and create the directory structure
    let new_dir = temp.path().join("auto_created");
    let chunk = StreamChunk::TextNote {
        content: "Test".to_string(),
        title: None,
    };
    
    let result = chunk.ingest(&new_dir, Path::new("test.js.md"));
    // Should succeed because ingest creates parent directories
    assert!(result.is_ok());
    assert!(new_dir.exists(), "Directory should be auto-created");
    assert!(new_dir.join("test.js.md").exists(), "File should be created");
    
    // Try to read non-existent entry - this should fail
    let entry_result = Entry::read_from(&temp.path().join("nonexistent.js.md"));
    assert!(entry_result.is_err());
}
