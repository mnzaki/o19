This design focuses on the `PkbService` struct, which acts as the bridge between your ProseMirror frontend and the underlying Git/P2P storage ("Foundframe").

It uses `async` Rust to handle the potential latency of P2P lookups and Git object extraction.

### 1. Data Structures & Types

First, we define the strongly typed structures that represent the Xanadu concepts.

```rust
use serde::{Deserialize, Serialize};

/// Represents the parsed components of a rad:// URI
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RadUri {
    pub user_id: String,       // Public Key
    pub repo_id: String,       // UUID
    pub commit_id: String,     // SHA Hash (Immutable)
    pub path: String,          // Path to file inside repo
    pub anchor: Anchor,        // The span or media coordinates
}

/// Differentiates between text spans and media fragments
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Anchor {
    /// Standard text transclusion: start_byte, length
    TextSpan { start: usize, length: usize },

    /// Media fragment: x, y, width, height, time_ms (all optional)
    MediaFragment {
        x: Option<u32>,
        y: Option<u32>,
        w: Option<u32>,
        h: Option<u32>,
        t: Option<u64>
    },
}

/// The result of a content verification check
#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationResult {
    pub is_valid: bool,
    /// If invalid, this contains the "True" text from the immutable commit
    pub expected_content: Option<String>,
    pub status_message: String,
}
```

---

### 2. The PKB Service (Main Interface)

This is the struct you will bind to your JavaScript environment (via Tauri commands).

```rust
use ...::{RadUri, Anchor, VerificationResult, PickResult};


impl PkbService {

    // =========================================================================
    // 1. URI LOGIC
    // =========================================================================

    /// Parses a raw string into a structured RadUri object.
    /// Format: rad://{user}/{repo}@{commit}/{path}#{anchor}
    pub fn parse_rad_uri(&self, uri_string: &str) -> Result<RadUri> {
        // Implementation:
        // 1. Check prefix "rad://"
        // 2. Split by '@' to separate (User/Repo) from (Commit/Path)
        // 3. Split by '#' to separate File Path from Anchor
        // 4. Call `self.parse_anchor(fragment_string)`
        // 5. Return struct
        todo!("Implement Regex parsing logic")
    }

    /// Helper to parse the anchor fragment (e.g., "span=10,20" or "x=10&y=20")
    fn parse_anchor(&self, fragment: &str) -> Result<Anchor> {
        // Implementation:
        // 1. If starts with "span=", split by comma -> TextSpan
        // 2. If contains "&", split pairs -> MediaFragment
        todo!()
    }

    /// Reconstructs a string URI from the struct (useful after math operations)
    pub fn build_rad_uri(&self, uri: &RadUri) -> String {
        // Implementation:
        // Format string: rad://{user}/{repo}@{commit}/{path}#{anchor_str}
        todo!()
    }

    // =========================================================================
    // 2. VERIFICATION LOGIC (The "Trust but Verify" Engine)
    // =========================================================================

    /// Called by ProseMirror when loading a doc.
    /// Verifies if 'current_content' matches the bytes at the immutable commit.
    pub async fn verify_integrity(&self, uri_str: String, current_content: String) -> Result<VerificationResult> {
        // 1. Parse the URI
        let uri = self.parse_rad_uri(&uri_str)?;

        // 2. Fetch the raw file
        let file_bytes = self.fetch_blob(&uri.repo_id, &uri.commit_id, &uri.path).await?;

        // 3. Extract the specific span
        let expected_string = self.extract_span_text(&file_bytes, &uri.anchor)?;

        // 4. Compare
        if current_content == expected_string {
            Ok(VerificationResult {
                is_valid: true,
                expected_content: None,
                status_message: "Verified".to_string(),
            })
        } else {
            Ok(VerificationResult {
                is_valid: false,
                expected_content: Some(expected_string),
                status_message: "Content mismatch: The source text differs from the document copy.".to_string(),
            })
        }
    }

    // =========================================================================
    // 3. FETCHING & SLICING
    // =========================================================================

    /// Low-level Git retrieval.
    /// If the repo/commit isn't local, triggers a P2P fetch.
    async fn fetch_blob(&self, repo_id: &str, commit_id: &str, path: &str) -> Result<Vec<u8>> {
        // Implementation:
        // 1. Check radicle, open Git repo, resolve commit_id (ensure it exists).
        // 2. Resolve path
        // 2. Return raw Vec<u8>.
    }

    /// Logic to slice a byte vector based on the Anchor type.
    fn extract_span_text(&self, blob: &[u8], anchor: &Anchor) -> Result<String> {
        match anchor {
            Anchor::TextSpan { start, length } => {
                // Implementation:
                // 1. check bounds: start + length <= blob.len()
                // 2. let slice = &blob[*start .. start + length];
                // 3. Convert to UTF-8 string (String::from_utf8_lossy)
                todo!()
            },
            _ => Err(anyhow::anyhow!("Cannot extract text from a Media anchor")),
        }
    }
}
```

### 3. Key Design Notes

1.  **Strict UTF-8 Handling:** The `extract_span_text` method must handle potential UTF-8 boundary errors gracefully (though since we point to immutable commits, the indices *should* always align if they were generated correctly).
2.  **Async Fetching:** `verify_integrity` must be async because it might trigger a network call (P2P fetch) if the repo isn't local.
3.  **Regex vs Parsers:** For `parse_rad_uri`, a Regex is sufficient and easier to maintain than a full parser combinator for this specific URL scheme.
    *   *Regex Pattern:* `^rad://([^/]+)/([^@]+)@([^/]+)/(.+)#(.+)$`
4.  **Error Handling:** Use `anyhow` or `thiserror` to make errors descriptive (e.g., "Repo not found", "Index out of bounds").
