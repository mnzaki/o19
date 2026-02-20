# Code Generator Design

> *"The generator reads the surface and blooms it into spires."*

This document captures the design decisions for implementing `spire-loom`'s code generation phase.

---

## Overview

The generator reads `loom/*.ts` files and produces concrete code in multiple target packages. It operates in two phases:

1. **Discovery Phase**: Execute `loom/WARP.ts` to construct the spiral object graph
2. **Generation Phase**: Traverse the spiral graph, blooming each Management into its reachable rings

**Critical distinction**:
- `loom/WARP.ts` is **executable TypeScript**—it runs to build the spiral object graph
- `loom/bookmark.ts` is **metadata** (Imprint DSL)—parsed by the generator, not executed

---

## Phase 1: Discovery (Reading WARP.ts)

### Package Name Derivation

```typescript
// loom/WARP.ts
import loom from '@o19/spire-loom';

// Linear spirals (single inner ring)
export const foundframe = loom.spiral();                    // Core
export const android = foundframe.android.foregroundService(); // Android ring
export const desktop = foundframe.desktop.direct();           // Desktop ring

// Multiplexed spiral (multiple inner rings)
export const tauri = loom.spiral(android, desktop).tauri.plugin(); // Aggregates

// DDD layer spirals out from Tauri
export const front = tauri.typescript.ddd();

// Drizzle adaptor spirals out from DDD (read-only)
export const drizzle = front.typescript.drizzle_adaptors({ filter: ['read'] });

// App binds to DDD with adaptor overrides
export const myTauriApp = front.tauri.app({ adaptorOverrides: [drizzle] });
```

**Rule**: Package name = `{coreExportName}-{ringExportName}`

| Export Name | Core Name | Full Package Name | Path Convention | Notes |
|-------------|-----------|-------------------|-----------------|-------|
| `foundframe` | (core) | `foundframe` | `o19/crates/foundframe` | Domain core |
| `android` | `foundframe` | `foundframe-android` | `o19/crates/foundframe-android` | Android service |
| `desktop` | `foundframe` | `foundframe-desktop` | `o19/crates/foundframe-desktop` | Desktop direct |
| `tauri` | (mux) | `foundframe-tauri` | `o19/crates/foundframe-tauri` | Aggregates platforms |
| `front` | `tauri` | `foundframe-front` | `packages/foundframe-front` | DDD layer (types + Ports) |
| `drizzle` | `front` | `foundframe-drizzle` | `packages/foundframe-drizzle` | Adaptor impl |
| `myTauriApp` | `front` | `my-tauri-app` | `apps/my-tauri-app` | App with binding |

**Exception**: The core export (return value of `loom.spiral()`) has no postfix.

### Multiplexed Spirals

Some rings aggregate multiple platform rings:

```typescript
// Tauri routes to different platform rings based on target:
// Desktop (Linux/Mac/Windows) → desktop ring (direct calls)
// Android → android ring (AIDL service)
// iOS → ios ring (future)

export const tauri = loom.spiral(android, desktop, ios).tauri.plugin();
```

The generator creates:
- A `SpiralMux` that holds references to all inner rings
- Platform-specific routing logic in the generated code
- The `MuxSpiraler` base class for aggregators

### Ring Relationship Detection

The generator must trace the call chain:

```typescript
// This means: android wraps foundframe
const android = foundframe.android.foregroundService();
//                     ^^^^^^^^^
//                     inner ring
```

**Algorithm**:
1. Parse the `WARP.ts` AST
2. Find all `loom.spiral()` calls (these are cores)
3. For each export, trace the expression chain:
   - `export const X = [inner].spiraler.method()`
   - Record: `X` wraps `inner`
4. Build the containment graph

### Method-Specific Generation

Each spiraler method determines WHAT gets generated:

```typescript
// AndroidSpiraler
foregroundService() {
  return spiralOut(this, {});
}
// Generates: FoundframeRadicleService.kt, AndroidManifest.xml, JNI bindings

// TauriSpiraler  
commands() {
  return spiralOut(this, { typescript: ... });
}
// Generates: Platform trait, Tauri commands, permissions/default.toml

// TypescriptSpiraler
app() {
  return spiralOut(this, {});
}
// Generates: TypeScript API client, command wrappers, domain types
```

**Key insight**: The method name is semantic. The generator uses it to know:
- What files to create
- What templates to apply
- What dependencies to inject

---

## Phase 2: Generation (Blooming Surfaces)

### Management Discovery

```typescript
// loom/bookmark.ts
@reach Global
abstract BookmarkMgmt {
  // NO async/promise - sync interface only
  // Asyncness is a boundary concern, added by generators per-ring
  addBookmark(url: string, title?: string): string
  
  // Constants (available in all rings)
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
  DEFAULT_DIRECTORY = 'bookmarks'
}
```

**Rules**:
1. Each file in `loom/` that defines an `abstract` block is a Management Imprint
2. The `@reach` decorator determines how far it extends:
   - `Private`: Core only
   - `Local`: Core + Platform rings  
   - `Global`: All rings (Core → Front)
3. Methods define the interface across all rings - NO implementation
4. Parameter types translate to each target language
5. **NO async/Promise** - sync interface only; asyncness is added by generators per-ring:
   - Core: Direct sync calls
   - Android: JNI (blocking from Java side)
   - Tauri: Async command wrappers
   - Front: Promise wrappers
6. **Constants** - Simple `NAME = value` declarations, available in all rings
7. **No boilerplate** - No `export`, `static`, `readonly`, `extends` (all implied)

### Ring-Specific Generation

#### Core Ring (foundframe)

**Input**: Management abstract class
**Output**: Rust trait + implementation template

```rust
// o19/crates/foundframe/src/bookmark.rs (generated)
pub trait BookmarkMgmt: Send + Sync {
  fn add_bookmark(&self, url: &str, title: Option<&str>) -> Result<String>;
}

// Implementation template (user fills in)
pub struct BookmarkMgmtImpl {
  // user adds fields
}

impl BookmarkMgmt for BookmarkMgmtImpl {
  fn add_bookmark(&self, url: &str, title: Option<&str>) -> Result<String> {
    // TODO: implement using TheStream
    todo!()
  }
}
```

#### Android Ring (foundframe-android)

**Input**: Management + `foregroundService()` method call
**Output**: 
- Kotlin service class
- JNI glue (Rust exports)
- AndroidManifest.xml entries

```kotlin
// o19/crates/foundframe-android/FoundframeRadicleService.kt (generated)
class FoundframeRadicleService : Service() {
    // Service lifecycle generated
    // onStartCommand() calls native methods
}

// JNI methods generated from Management methods
private external fun nativeAddBookmark(url: String, title: String?): String
```

```rust
// o19/crates/foundframe-android/src/jni_glue.rs (generated)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_nativeAddBookmark(
    mut env: JNIEnv,
    // ... params
) -> jstring {
    // Get service singleton
    // Call add_bookmark
    // Return result
}
```

#### Tauri Ring (foundframe-tauri)

**Input**: Management + `commands()` method call  
**Output**:
- Platform trait
- Command handlers
- permissions/default.toml
- build.rs command registration

```rust
// o19/crates/foundframe-tauri/src/platform.rs (generated)
pub trait ContentMgmt: Send + Sync {
  fn add_bookmark(&self, url: String, title: Option<String>) -> Result<String>;
}

// o19/crates/foundframe-tauri/src/commands.rs (generated)
#[tauri::command]
pub async fn add_bookmark<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    title: Option<String>,
) -> Result<String> {
    app.platform().add_bookmark(url, title)
}
```

```toml
# o19/crates/foundframe-tauri/permissions/default.toml (generated)
[[permission]]
identifier = "add-bookmark"
description = "Allows adding bookmarks"
commands.allow = ["add_bookmark"]
```

#### Front Ring (foundframe-my-tauri-app)

**Input**: Management + `app()` method call  
**Output**:
- TypeScript types
- API client
- Command wrappers

```typescript
// apps/my-tauri-app/src/lib/api/bookmark.ts (generated)
export interface Bookmark {
  url: string;
  title?: string;
}

export async function addBookmark(
  url: string, 
  title?: string
): Promise<string> {
  return await invoke('plugin:foundframe|add_bookmark', { url, title });
}
```

---

## The Bottleneck Pattern (Android)

Multiple Managements converge into a single service:

```
IContentMgmt.addBookmark()    ┐
IPkbMgmt.listRepositories()   ├→ IFoundframeRadicle (generated) → FoundframeRadicleService.kt
IDeviceMgmt.pairDevice()      ┘
```

**Generation**:
1. Collect all `Global` reach Managements
2. Generate `IFoundframeRadicle.aidl` (combined interface)
3. Generate `FoundframeRadicleService.kt` (implements all methods)
4. Generate JNI exports for all methods
5. Generate Rust service singleton that dispatches to Core

---

## The Loom - All Executable

**All files in `loom/` are executable TypeScript**. They run to construct the spiral object graph and register Management metadata:

```typescript
// loom/WARP.ts - Constructs the ring architecture
export const foundframe = loom.spiral();  // Returns SpiralOut instance
export const android = foundframe.android.foregroundService();  // Returns SpiralOut
```

```typescript
// loom/bookmark.ts - Registers Management metadata
@reach Global
abstract BookmarkMgmt {
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
  
  @crud('create')
  addBookmark(url: string, title?: string): string
}
```

Both files **run** at generation time:
- **WARP.ts** constructs the spiral object graph (SpiralOut, SpiralMux, Spiraler instances)
- **bookmark.ts** registers Management metadata via decorators (`@reach`, `@crud`)

The decorators attach metadata that the generator reads after execution:
- `@reach(Global)` → sets `BookmarkMgmt.prototype._reach = 'Global'`
- `@crud('create')` → registers the method's CRUD operation
- Constants and method signatures → captured via reflection/AST

### Decorator Semantics

| Decorator | Purpose | Runtime Effect |
|-----------|---------|----------------|
| `@reach(level)` | Sets Management scope | Attaches `_reach` metadata |
| `@crud(operation)` | Tags method with CRUD type | Attaches `_crudMethods` map |

After execution, the generator queries:
- What rings exist? → Inspect the spiral graph from WARP.ts
- What Managements are defined? → Collect all `@reach`-decorated classes
- What CRUD operations? → Read `_crudMethods` from each Management

### Why No Async?

Asyncness depends on the boundary:

| Ring | Sync/Async | Reason |
|------|-----------|--------|
| Core | Sync | Direct function calls within same process |
| Android | Sync (JNI) | JNI calls are blocking from Java side |
| Tauri | Async | Tauri commands are async by design |
| Front | Promise | Browser APIs are promise-based |

The imprint defines the **logical interface**. Generators add async wrappers where needed.

### Constants Are Universal

```
abstract BookmarkMgmt {
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
}
```

These become:
- Rust: `const VALID_URL_REGEX: Regex = regex!(r"^https?://");`
- Java: `public static final Pattern VALID_URL_REGEX = Pattern.compile("^https?://");`
- TypeScript: `export const VALID_URL_REGEX = /^https?:\/\/.+/;`

## Type Mapping

| TypeScript (Surface) | Rust (Core) | Java (Android) | Tauri Command | TypeScript (Front) |
|---------------------|-------------|----------------|---------------|-------------------|
| `string` | `String` / `&str` | `String` | `String` | `string` |
| `number` | `i64` / `u64` | `long` / `int` | `number` | `number` |
| `boolean` | `bool` | `boolean` | `boolean` | `boolean` |
| `T?` (optional) | `Option<T>` | `@Nullable T` | `Option<T>` | `T \| undefined` |
| `string[]` | `Vec<String>` | `String[]` | `Vec<String>` | `string[]` |
| Custom interface | Struct / Trait | Parcelable | Struct | Interface |

---

## Directory Structure Convention

Generated code goes to predictable locations:

```
o19/crates/{package}/
├── spiral/                    # All generated code
│   ├── i_content_mgmt/
│   │   ├── mod.rs             # Re-exports
│   │   ├── core_trait.rs      # Core trait (if Core)
│   │   ├── jni_glue.rs        # JNI exports (if Android)
│   │   ├── platform_trait.rs  # Platform trait (if Tauri)
│   │   └── commands.rs        # Commands (if Tauri)
│   └── mod.rs                 # Top-level re-exports
└── src/
    ├── lib.rs                 # May include spiral/mod.rs
    └── ...                    # Hand-written code
```

---

## Hookup System

After generation, code must be integrated into the package:

1. **Rust mod.rs**: Add `pub mod spiral;`
2. **Cargo.toml**: Add dependencies if needed
3. **AndroidManifest.xml**: Add service declarations (Android)
4. **permissions/*.toml**: Add command permissions (Tauri)
5. **build.rs**: Register commands (Tauri)

---

## Key Design Principles

1. **Thin surface, thick generation**: WARP.ts should be minimal
2. **Convention over configuration**: Package names derived from exports
3. **One imprint, many blooms**: Same shape, different substances
4. **Explicit relationships**: `X = inner.spiraler.method()` shows wrapping
5. **Semantic method names**: `foregroundService()` vs `commands()` determine output
6. **Core is sacred**: foundframe gets traits, never implementation
7. **Surface is runtime**: All loom/ files execute to build the spiral graph and register metadata
8. **Sync interface only**: Asyncness is a boundary concern added per-ring
9. **Constants are universal**: Values available in all rings
10. **No boilerplate**: `export`, `static`, `readonly` are implied by context

---

## Open Questions

1. How do we handle the FoundframeRadicleService singleton initialization?
   - Option: Generate `init_service()` that takes all Management impls
   - Option: Use `std::sync::OnceLock` for lazy initialization

2. How do we merge multiple Managements into one service (bottleneck)?
   - Option: Generate aggregate interface automatically
   - Option: Require explicit `aggregateService()` call in WARP.ts

3. How do we support conditional rings?
   - Example: iOS not yet implemented
   - Option: Commented exports in WARP.ts
   - Option: `if (platform === 'ios')` in WARP.ts

4. How do we version generated code?
   - Option: Hash of surface definitions in generated header
   - Option: Version field in WARP.ts

---

*The generator reads what is, and unfolds what could be.*
