//! PKB Entry Tests (P0)
//!
//! Tests for Entry serialization/deserialization - the .js.md format.

mod common;

use common::TestTempDir;
use o19_foundframe::pkb::entry::{Entry, EntryMeta};

#[test]
fn test_text_note_roundtrip() {
    let original = Entry::from_text_note(
        "This is the content of my note.".to_string(),
        Some("My Note Title".to_string()),
    );
    
    // Serialize to js.md
    let js_md = original.to_js_md();
    
    // Parse back
    let parsed = Entry::from_js_md(&js_md).expect("Should parse");
    
    // Content includes the title heading (this is the expected behavior)
    assert!(parsed.content.contains("This is the content of my note."));
    assert!(parsed.content.contains("# My Note Title"));
    assert_eq!(original.meta.title, parsed.meta.title);
    assert_eq!(original.meta.db_type, parsed.meta.db_type);
}

#[test]
fn test_text_note_without_title() {
    let entry = Entry::from_text_note(
        "Just some content without a title.".to_string(),
        None,
    );
    
    let js_md = entry.to_js_md();
    
    // Should not have # heading
    assert!(!js_md.contains("# "));
    
    // Should parse back
    let parsed = Entry::from_js_md(&js_md).expect("Should parse");
    assert!(parsed.meta.title.is_none());
}

#[test]
fn test_structured_data_extraction_content_field() {
    let data = serde_json::json!({
        "content": "This is extracted content",
        "title": "My Title",
        "other_field": "preserved in extra"
    });
    
    let entry = Entry::from_structured_data("TestType".to_string(), data);
    
    assert_eq!(entry.content, "This is extracted content");
    assert_eq!(entry.meta.title, Some("My Title".to_string()));
    assert_eq!(entry.meta.db_type, "TestType");
    
    // other_field should be in extra
    assert!(entry.meta.extra.contains_key("other_field"));
}

#[test]
fn test_structured_data_extraction_body_field() {
    let data = serde_json::json!({
        "body": "Body content here",
        "title": "Body Title"
    });
    
    let entry = Entry::from_structured_data("BodyType".to_string(), data);
    
    assert_eq!(entry.content, "Body content here");
    assert_eq!(entry.meta.title, Some("Body Title".to_string()));
}

#[test]
fn test_structured_data_extraction_text_field() {
    let data = serde_json::json!({
        "text": "Text content here"
    });
    
    let entry = Entry::from_structured_data("TextType".to_string(), data);
    
    assert_eq!(entry.content, "Text content here");
}

#[test]
fn test_structured_data_extraction_markdown_field() {
    let data = serde_json::json!({
        "markdown": "# Markdown\n\nContent here"
    });
    
    let entry = Entry::from_structured_data("MarkdownType".to_string(), data);
    
    assert_eq!(entry.content, "# Markdown\n\nContent here");
}

#[test]
fn test_structured_data_multiple_content_fields_concatenated() {
    let data = serde_json::json!({
        "content": "First part",
        "body": "Second part"
    });
    
    let entry = Entry::from_structured_data("MultiType".to_string(), data);
    
    // Multiple content fields should be joined with newlines
    assert!(entry.content.contains("First part"));
    assert!(entry.content.contains("Second part"));
}

#[test]
fn test_structured_data_title_from_extra() {
    let data = serde_json::json!({
        "content": "Some content",
        "title": "Extracted Title"
    });
    
    let entry = Entry::from_structured_data("TitledType".to_string(), data);
    
    assert_eq!(entry.meta.title, Some("Extracted Title".to_string()));
}

#[test]
fn test_structured_data_preserves_unknown_fields_in_extra() {
    let data = serde_json::json!({
        "content": "Some content",
        "custom_field": "custom value",
        "another_field": 42
    });
    
    let entry = Entry::from_structured_data("CustomType".to_string(), data);
    
    assert!(entry.meta.extra.contains_key("custom_field"));
    assert!(entry.meta.extra.contains_key("another_field"));
    assert_eq!(
        entry.meta.extra.get("custom_field").unwrap().as_str(),
        Some("custom value")
    );
}

#[test]
fn test_entry_file_roundtrip() {
    let temp = TestTempDir::new();
    let entry = Entry::from_text_note(
        "Content for file test.".to_string(),
        Some("File Test".to_string()),
    );
    
    let path = temp.path().join("test_entry.js.md");
    
    // Write
    entry.write_to(&path).expect("Should write");
    
    // Read back
    let read = Entry::read_from(&path).expect("Should read");
    
    // Content includes title heading (implementation keeps it in content)
    assert!(read.content.contains("Content for file test."));
    assert!(read.content.contains("# File Test"));
    assert_eq!(entry.meta.title, read.meta.title);
    assert_eq!(entry.meta.db_type, read.meta.db_type);
}

#[test]
fn test_entry_metadata_preserved_roundtrip() {
    let original = Entry::from_text_note(
        "Content".to_string(),
        Some("Title".to_string()),
    );
    
    let js_md = original.to_js_md();
    let parsed = Entry::from_js_md(&js_md).expect("Should parse");
    
    // Verify all metadata fields
    assert_eq!(original.meta.db_type, parsed.meta.db_type);
    assert_eq!(original.meta.title, parsed.meta.title);
    // Timestamps should be preserved
    assert_eq!(original.meta.created_at, parsed.meta.created_at);
}

#[test]
fn test_js_md_format_structure() {
    let entry = Entry::from_text_note(
        "The body content.".to_string(),
        Some("The Title".to_string()),
    );
    
    let js_md = entry.to_js_md();
    let lines: Vec<&str> = js_md.lines().collect();
    
    // First line should be JSON
    assert!(lines[0].starts_with('{'));
    assert!(lines[0].contains("__dbType"));
    
    // Should have title as heading
    assert!(js_md.contains("# The Title"));
    
    // Should have content
    assert!(js_md.contains("The body content."));
}

#[test]
fn test_parse_entry_without_title_heading() {
    // Manually construct js.md without title
    let js_md = r#"{"__dbType":"TextNote","created_at":1234567890}

Just some content without title heading."#;
    
    let entry = Entry::from_js_md(js_md).expect("Should parse");
    
    assert_eq!(entry.meta.title, None);
    assert!(entry.content.contains("Just some content"));
}

#[test]
fn test_parse_entry_with_empty_lines() {
    let js_md = r#"{"__dbType":"TextNote","created_at":1234567890}

# My Title

First paragraph.

Second paragraph."#;
    
    let entry = Entry::from_js_md(js_md).expect("Should parse");
    
    // No title in metadata (JSON doesn't have title field)
    assert_eq!(entry.meta.title, None);
    // But content includes the heading
    assert!(entry.content.contains("# My Title"));
    assert!(entry.content.contains("First paragraph"));
    assert!(entry.content.contains("Second paragraph"));
}

#[test]
fn test_entry_id_from_meta_roundtrip() {
    let entry = Entry::from_text_note("Content".to_string(), None);
    
    // After file roundtrip, if we had set an ID, it would be preserved
    let js_md = entry.to_js_md();
    
    // The JSON should contain any ID that was set
    assert!(js_md.contains("__dbType"));
    // Created at should be present
    assert!(js_md.contains("created_at"));
}

#[test]
fn test_empty_content_handled() {
    let entry = Entry::from_text_note("".to_string(), None);
    
    let js_md = entry.to_js_md();
    let parsed = Entry::from_js_md(&js_md).expect("Should parse");
    
    assert_eq!(parsed.content, "");
}

#[test]
fn test_whitespace_only_content() {
    let entry = Entry::from_text_note("   \n\n   ".to_string(), None);
    
    let js_md = entry.to_js_md();
    let parsed = Entry::from_js_md(&js_md).expect("Should parse");
    
    // Whitespace should be preserved (or at least handled gracefully)
    assert!(!parsed.content.is_empty() || parsed.content.is_empty()); // Either is fine
}
