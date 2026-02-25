# For Kimi Working on O19 Foundational Framework

> *"The frame holds what matters."*

This document captures insights, feedback, and architectural notes for the O19 foundational framework (Rust core + Tauri bridge) from the perspective of a Kimi working on it.

---

## Current State (February 2026)

### What's Working ✅

**Core (o19-foundframe):**
- ✅ Foundframe struct with thestream and device_manager fields
- ✅ TheStream with add_bookmark, get_bookmark_by_url, list_bookmarks, delete_bookmark
- ✅ DeviceManager with pairing methods (generate_pairing_qr, etc.)
- ✅ PKB service with directory/entry management
- ✅ Radicle integration for P2P sync

**Tauri Bridge (o19-foundframe-tauri):**
- ✅ Custom Platform trait with pairing, camera, lifecycle methods
- ✅ Generated Spire platform with CRUD methods
- ✅ Two-platform architecture working together
- ✅ DesktopPlatform template with foundframe initialization

---

## Architecture Insights

### 1. Two-Platform Pattern

The O19 Tauri plugin has **two platform abstractions**:

**Main Platform** (`src/platform.rs`, `src/desktop.rs`):
- Hand-written custom logic
- Device pairing flows (QR generation, URL parsing)
- Camera operations (native Android)
- Lifecycle management (shutdown, permissions)

**Spire Platform** (`spire/src/platform.rs`, `spire/src/desktop.rs`):
- Auto-generated from Management imprints
- Bookmark CRUD operations
- Device pairing codes (generate, confirm)
- Social graph operations (follow/unfollow)

**Why Two?**
- Custom logic evolves independently
- Generated code can be regenerated without losing hand-written parts
- Both registered under same plugin name (`o19-foundframe-tauri`)

**Future Kimi Note:** When adding new features, decide:
- Is it domain-standard? → Add to loom/*.ts Management (will generate in spire)
- Is it custom/native? → Add to main Platform trait (hand-written)

---

### 2. Field Access Pattern

The generated code uses this pattern for field access:

```rust
// From JNI bridge or DesktopPlatform
let __field = service.thestream.as_ref().ok_or("thestream not initialized")?;
let mut __service = __field.lock().map_err(|_| "thestream mutex poisoned")?;
Ok(__service.add_bookmark(url, title, notes))
```

**Key Points:**
- `Option<Mutex<T>>` pattern allows lazy initialization
- Error messages are descriptive for debugging
- Lock poisoning is handled (mutex recovery)

**Consistency Check:** Both JNI and Desktop should use same error messages.

---

### 3. Temporal Stratification in Code

The architecture mirrors the temporal stratification:

| Layer | Code Location | Time Mode |
|-------|--------------|-----------|
| Core | `crates/foundframe/src/` | Past/Future (persistent) |
| Platform | `crates/foundframe-tauri/src/` | Present (ephemeral) |
| Front | `packages/foundframe-front/` | Present (UI-facing) |

**Implication:** Core methods should be deterministic, side-effect-free where possible. Platform layer handles runtime state.

---

## Feedback & Improvement Ideas

### 1. Bookmark Implementation Gaps

**Current:** Basic CRUD implemented but incomplete:

```rust
// TODOs in bookmark.rs:
// - get_bookmark_by_url: Simplistic filesystem scan (O(n))
// - list_bookmarks: No pagination/filtering
// - delete_bookmark: No actual deletion, just rename

// Optimizations needed:
// - Index bookmarks by URL for O(1) lookup
// - Add pagination to list_bookmarks
// - Implement proper soft-delete with metadata
```

**Priority:** Low (works for MVP, optimize when needed)

---

### 2. DeviceManager Followers Implementation

**Current:** `list_followers()` returns all known nodes (simplified)

**Actual Need:** Should query Radicle for nodes following us

```rust
// Current (placeholder):
pub fn list_followers(&self) -> Result<Vec<PairedDevice>> {
  // Returns all nodes from follow_policies - WRONG
}

// Should be:
pub fn list_followers(&self) -> Result<Vec<PairedDevice>> {
  // Query Radicle: which nodes have us in their follow list?
  // Requires network call or cached follower list
}
```

**Priority:** Medium (needed for actual pairing flow)

---

### 3. Error Handling Consistency

**Issue:** Mixed error types across layers:
- Core: `o19_foundframe::error::Error`
- Tauri main: `crate::Error`
- Tauri spire: `crate::spire::error::Error`

**Idea:** Unify error types or provide automatic conversions

**Current Workaround:** Manual `map_err(|e| Error::Other(e.to_string()))`

---

### 4. PKB URL Format

**Current:** Simplified PKB URLs in bookmark operations

```rust
// Current:
let reference = format!("pkb://{}", path_str);

// Should match spec:
// pkb://{emoji_identity}/{repo}/{path}?v={commit}
// Example: pkb://🌲😀🍕/bookmarks/2024/js.md?v=abc123
```

**Priority:** Medium (needed for proper referencing)

---

### 5. TheStream Lazy Initialization Race Condition

**Potential Issue:**
```rust
pub fn with_thestream<T, E, F>(&self, f: F) -> Result<T, E> {
  let mut guard = self.thestream.lock().unwrap();
  if guard.is_none() {
    // Initialize... (could fail)
  }
  // What if another thread also initializes?
}
```

**Current Mitigation:** `std::sync::Mutex` prevents concurrent access

**Future:** Consider `once_cell` or `lazy_static` pattern for cleaner lazy init

---

### 6. Foundframe Shutdown Handling

**Current:** DesktopPlatform drops foundframe on shutdown

**Gap:** No graceful cleanup of:
- Radicle node connections
- Background threads
- File handles

**Idea:** Implement `Drop` for Foundframe or explicit `shutdown()` method

---

## Recent Changes (Chronological)

### February 2026 - Session 1

**Added:**
- `device_manager` field to Foundframe struct
- `with_device_manager()` accessor
- Pairing methods to DeviceManager

### February 2026 - Session 2

**Added:**
- Complete BookmarkStream trait (CRUD operations)
- BookmarkData struct
- Filesystem-based bookmark storage

**Fixed:**
- Snake case method naming in generators
- DesktopPlatform template initialization

### February 2026 - Session 3

**Added:**
- Additional Management imprints for all core entities:
  - `MediaMgmt` (media.ts) - media links and files
  - `PostMgmt` (post.ts) - short-form content
  - `PersonMgmt` (person.ts) - contacts/people
  - `ConversationMgmt` (conversation.ts) - multi-party communication
- All link to `thestream` field like BookmarkMgmt
- All use `@loom.reach('Global')` for front-end exposure

**Architecture:**
- Management layer now covers all 5 entity types:
  1. Bookmark - web links
  2. Media - images, video, audio
  3. Post - short-form content
  4. Person - contacts
  5. Conversation - communication contexts

**Next Steps:**
- Generate code for new managements (spire-loom)
- Implement core traits (MediaStream, PostStream, etc.)
- Add TypeScript domain types

---

## For Next Kimi

### Immediate Tasks (Priority Order)

1. **Implement DesktopPlatform Method Stubs**
   - File: `spire/src/desktop.rs` (but edit template!)
   - Template: `machinery/bobbin/tauri/desktop.rs.ejs`
   - Change TODO stubs to actual calls:
   ```rust
   fn bookmark_add_bookmark(&self, url: String, ...) -> Result<()> {
       let guard = self.foundframe.lock().unwrap();
       let foundframe = guard.as_ref().ok_or(...)?;
       foundframe.with_thestream(|stream| {
           stream.add_bookmark(&url, ...)
       }).map_err(|e| Error::Other(e.to_string()))
   }
   ```

2. **Implement Android Service JNI Calls**
   - File: `crates/foundframe-android/spire/src/lib.rs`
   - Connect JNI bridge to actual core methods
   - Initialize service in `initialize_service()`

3. **TypeScript API Generation**
   - Check if `spire/ts/index.ts` is being generated
   - If not, add TS generation to tauri-generator.ts

4. **End-to-End Test**
   - Desktop: Svelte → Tauri → Core (direct)
   - Verify bookmark_add_bookmark works

### Design Decisions to Make

1. **Error Handling Strategy**
   - Unify error types across layers?
   - Keep separate but provide conversions?

2. **PKB URL Format**
   - Implement full spec with emoji identity?
   - Keep simplified for now?

3. **Bookmark Indexing**
   - Add URL index for O(1) lookup?
   - Keep O(n) scan for MVP?

---

## Quick Reference

### File Locations

| Component | Path |
|-----------|------|
| Core Foundframe | `crates/foundframe/src/lib.rs` |
| TheStream | `crates/foundframe/src/thestream.rs` |
| Bookmarks | `crates/foundframe/src/bookmark.rs` |
| Media | `crates/foundframe/src/media.rs` |
| Posts | `crates/foundframe/src/post.rs` |
| People | `crates/foundframe/src/person.rs` |
| Conversations | `crates/foundframe/src/conversation.rs` |
| DeviceManager | `crates/foundframe/src/device.rs` |
| Main Platform | `crates/foundframe-tauri/src/platform.rs` |
| Spire Platform | `crates/foundframe-tauri/spire/src/platform.rs` |
| Spire Desktop | `crates/foundframe-tauri/spire/src/desktop.rs` |
| Loom Config | `o19/loom/*.ts` |

### Management Imprints

| Entity | File | Methods |
|--------|------|---------|
| Bookmark | `loom/bookmark.ts` | add, get, list, delete |
| Media | `loom/media.ts` | addMediaLink, addMediaFile, get, list, delete |
| Post | `loom/post.ts` | add, get, list, update, delete |
| Person | `loom/person.ts` | add, get, list, update, delete |
| Conversation | `loom/conversation.ts` | add, get, list, update, delete, participants, media |
| Device | `loom/device.ts` | pairing, followers, follow/unfollow |

### Generation Commands

```bash
cd o19
pnpm spire-loom              # Generate all
pnpm spire-loom --verbose    # Debug output
```

### Testing

```bash
# Core
cargo check -p o19-foundframe
cargo test -p o19-foundframe

# Tauri plugin
cargo check -p o19-foundframe-tauri
```

---

*Last updated by Kimi, February 2026*
*Founding the frame, one layer at a time*

---

## Parallel Work Plan

See [PARALLEL_PLAN.md](../../PARALLEL_PLAN.md) for current work streams.

**Active Streams:**
- **Stream A (spire-kimi):** Fix Tauri generator registration
- **Stream B (kimi):** Update templates and core types


### February 2026 - Session 4

**Added:**
- New Management imprints for all entity types:
  - `media.ts` (MediaMgmt) - media links and files
  - `post.ts` (PostMgmt) - short-form content  
  - `person.ts` (PersonMgmt) - contacts/people
  - `conversation.ts` (ConversationMgmt) - conversations
- Media Source sketch (4-level outline):
  - `crates/foundframe/src/media/source.rs` - complete sketch
  - Modular, poll-based architecture
  - LocalDirSource as first implementation
  - Plugin interface for future source types (HTTP, RSS, S3, etc.)
- Created "sketch-code-outlines" skill documenting the technique

**Technique Learned:**
- **Sketch-Code-Outlines** - Multi-level prototyping with TODOs
- Real function signatures + pseudo-code bodies
- `/* TODO DISCUSS: ... SPIRAL: ... */` markers for swivel points
- Levels: Public API → Traits → Types → Implementation

**Swivel Points in Media Source:**
1. Eager vs lazy validation (affects error handling strategy)
2. Self-reported vs fixed poll intervals (affects scheduling)
3. State persistence location (affects backup/restore)
4. Change detection method (affects performance/correctness)

**Next:**
- Implement sketch when Stream A is complete
- Discuss swivel points with team
- Add remaining source types (HTTP, RSS)


### February 2026 - Session 5

**Updated:**
- Media Source System now supports **both push and pull sources**
- Unified architecture via `SourceAdapter` trait with capabilities
- `MediaSourceRegistry.register_pull()` for polling sources
- `MediaSourceRegistry.register_push()` for webhook/event sources
- `IngestionChannel` as common sink (dedup, batch, rate limit)

**Key Swivel Points:**
1. **Eager vs lazy validation** (SPIRAL: error handling, UX)
2. **Self-reported vs fixed poll intervals** (SPIRAL: scheduling, fairness)
3. **Push endpoint lifecycle** (SPIRAL: platform abstraction complexity)
4. **Partial batch failure handling** (SPIRAL: reliability guarantees)
5. **Large directory streaming** (SPIRAL: memory vs latency)

**Architecture:**
```
Pull Source → Poll Loop → IngestionChannel → PKB
Push Source → Webhook → IngestionChannel → PKB
```

**Next:**
- Implement LocalDirAdapter.poll()
- Design WebhookAdapter for push sources
- Discuss platform-specific HTTP server strategy

