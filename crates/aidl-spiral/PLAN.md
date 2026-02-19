# aidl-spiral: The Spiral Plan

> *"What was interface becomes infrastructure. What was manual becomes generated. The spiral returns, but on a different plane."*

## Vision

The AIDL file is not merely an interface definition—it is the **source of truth** for the entire cross-platform stack. From a single `.aidl` file, we generate the complete binding layer:

- **Java**: Service interface, Client helper, Service implementation skeleton
- **Rust**: JNI exports, Service trait, Platform implementations
- **TypeScript**: Tauri adaptors, Command types, API clients

This is **conservation of contract**—define once, spiral outward.

---

## Current State (Y1)

### ✅ Already Generating

```
IFoundframeRadicle.aidl
        │
        ├──► Java/ty/circulari/o19/
        │    ├── IFoundframeRadicle.java      (AIDL interface + Stub)
        │    └── service/
        │        └── FoundframeRadicleClient.java  (Client helper)
        │
        ├──► Rust/generated/
        │    ├── jni_glue.rs                  (JNI exports + macros)
        │    └── service_impl_template.rs     (Trait to implement)
        │
        └──► (Manual) Rust impl in aidl_service.rs
```

### ✅ What's Now Generated

```
IFoundframeRadicle.aidl
        │
        ├──► Java/ty/circulari/o19/
        │    ├── IFoundframeRadicle.java      (AIDL interface + Stub)
        │    ├── FoundframeRadicleClient.java (Client helper)
        │    └── FoundframeRadicleService.kt  (Service skeleton) ⭐ NEW
        │
        ├──► Rust/generated/
        │    ├── jni_glue.rs                  (JNI exports + macros)
        │    ├── service_impl_template.rs     (Trait to implement)
        │    └── commands.rs                  (Tauri commands) ✅ NEW
        │
        └──► TypeScript/generated/
             ├── index.ts                     (API index)
             └── */adapt.ts (6 files)         (Entity adaptors)
```

### ❌ Still Manual (Next Priority: Platform Trait)

```
o19/crates/foundframe-tauri/src/
├── platform.rs               ← Platform trait from AIDL ⭐ NEXT
├── mobile/android.rs         ← Android platform impl
└── desktop.rs                ← Desktop platform impl
```

---

## The Spiral: Generation Targets

### Ring 1: Core AIDL (COMPLETE)

The foundation—parsing AIDL and generating base bindings.

```rust
// parser.rs - AIDL AST
pub struct AidlFile {
    pub package: String,
    pub interface_name: String,
    pub methods: Vec<AidlMethod>,
    pub imports: Vec<String>,  // TODO: Support parcelable imports
}

pub struct AidlMethod {
    pub name: String,
    pub return_type: AidlType,
    pub args: Vec<AidlArg>,
    pub direction: Direction,  // in, out, inout
}
```

**Status**: ✅ Parser complete, handles primitives + String + arrays

---

### Ring 2: Java Generation (COMPLETE)

Generate Android-side Java code.

**Generated Files**:
- `IFoundframeRadicle.java` - AIDL interface with Stub/Proxy
- `FoundframeRadicleClient.java` - Helper for service connection
- `FoundframeRadicleService.java` - Service skeleton (TODO)

**Status**: 
- ✅ Interface + Client + Service skeleton
- ✅ JNI Glue with macros
- ✅ Tauri Commands
- ⏳ Platform Trait (NEXT)
- ⏳ Event Callbacks

---

### Ring 3: Rust JNI Generation (COMPLETE)

Generate Rust JNI glue with clean macros.

**Generated Files**:
- `jni_glue.rs` - JNI exports, service singleton, trait
- `service_impl_template.rs` - Implementation template

**Macro System**:
```rust
// Clean JNI exports
#[no_mangle]
pub extern "C" fn Java_..._nativeAddPost(
    mut env: JNIEnv,
    _class: JClass,
    content: JString,
    title: JString,
) -> jstring {
    let service = with_service_or_throw!(env);
    let content = jni_arg!(env, content: String);
    let title = jni_arg!(env, title: String);
    let result = service.add_post(&content, Some(&title));
    jni_ret!(env, result => String)
}
```

**Status**: ✅ JNI macros working, trait generation complete

---

### Ring 4: Kotlin Service Skeleton (TODO)

Generate the Android Service implementation that loads the native library.

**Target**: `android/java/service/FoundframeRadicleService.kt`

```kotlin
package ty.circulari.o19.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import ty.circulari.o19.IFoundframeRadicle

/**
 * Auto-generated FoundframeRadicleService
 * Implements the AIDL interface by delegating to native methods
 */
class FoundframeRadicleService : Service() {
    
    companion object {
        init {
            System.loadLibrary("foundframe")
        }
    }
    
    private val binder = object : IFoundframeRadicle.Stub() {
        // Generated native method delegations
        override fun addPost(content: String?, title: String?): String {
            return nativeAddPost(content, title)
        }
        
        // ... all other methods
    }
    
    override fun onBind(intent: Intent): IBinder = binder
    
    // Native methods (implemented in Rust)
    private external fun nativeAddPost(content: String?, title: String?): String
    // ... etc
}
```

**Tasks**:
- [ ] Generate Kotlin service class
- [ ] Map AIDL types to Kotlin types
- [ ] Generate native method declarations
- [ ] Generate delegation methods

---

### Ring 5: TypeScript Adaptor Generation (TODO) ⭐ HIGH IMPACT

Generate TypeScript adaptors that bridge Tauri commands to the AIDL interface.

**Target**: `foundframe-tauri/ts/adaptors/generated/`

```typescript
/**
 * Auto-generated from IFoundframeRadicle.aidl
 * 
 * This adaptor extends DrizzlePostAdaptor and overrides create()
 * to call the Tauri command that ultimately invokes the AIDL method.
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzlePostAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { Post, CreatePost } from '@o19/foundframe-front/domain';

export class GeneratedPostAdaptor extends DrizzlePostAdaptor {
  async create(data: CreatePost): Promise<Post> {
    // Transform domain object to AIDL arguments
    const content = extractTextFromBits(data.bits);
    const title = extractTitleFromBits(data.bits);
    
    // Invoke Tauri command (matches AIDL method signature)
    const result = await invoke<StreamEntryResult>(
      'plugin:o19-foundframe-tauri|add_post',
      { content, title }
    );
    
    // Return domain object
    return reconstructPost(result, data);
  }
}

// Generated for each AIDL method that creates stream entries:
// - add_post → PostAdaptor
// - add_bookmark → BookmarkAdaptor  
// - add_media_link → MediaAdaptor
// - add_person → PersonAdaptor
// - add_conversation → ConversationAdaptor
// - add_text_note → StreamAdaptor
```

**Key Insight**: The AIDL methods map 1:1 to Tauri commands, which map 1:1 to adaptor methods.

**Tasks**:
- [ ] Map AIDL types to TypeScript types
- [ ] Generate adaptor classes per entity type
- [ ] Generate transformation functions (AIDL ↔ Domain)
- [ ] Generate factory function
- [ ] Handle optionality (AIDL optional args → TypeScript optional params)

---

### Ring 6: Rust Tauri Command Generation ✅ COMPLETE

Generate Tauri command handlers that call the platform implementations.

**Target**: `gen/<Interface>/commands.rs`

**Status**: ✅ DONE - Generates `#[tauri::command]` functions with proper async/await

```rust
//! Auto-generated Tauri commands from IFoundframeRadicle.aidl

#[tauri::command]
pub(crate) async fn add_post<R: Runtime>(
    app: AppHandle<R>,
    content: String,
    title: String,
) -> Result<String> {
    app.platform().add_post(content, title).await
}
```

**What Works**:
- ✅ Command function generation with `#[tauri::command]`
- ✅ Proper async/await for non-void return types
- ✅ Generic `<R: Runtime>` parameter
- ✅ `AppHandle<R>` parameter injection
- ✅ Snake_case naming from camelCase AIDL
- ✅ Type mapping (String, boolean, int, long, arrays)

---

### Ring 7: Platform Trait Generation (NEXT) ⭐

Generate the Platform trait that abstracts Desktop vs Android.

**Target**: `foundframe-tauri/src/generated/platform_trait.rs`

```rust
//! Auto-generated Platform trait from IFoundframeRadicle.aidl

#[async_trait]
pub trait Platform: Send + Sync {
    // Generated from AIDL methods
    async fn add_post(&self, content: String, title: Option<String>) 
        -> Result<StreamEntryResult>;
    
    async fn add_bookmark(&self, url: String, title: Option<String>, notes: Option<String>)
        -> Result<StreamEntryResult>;
    
    async fn add_media_link(&self, ...)
        -> Result<StreamEntryResult>;
    
    // ... all AIDL methods
}
```

**Tasks**:
- [ ] Generate trait definition
- [ ] Generate Desktop implementation (direct foundframe calls)
- [ ] Generate Android implementation (AIDL client calls)

---

### Ring 8: Event Callback Generation (TODO)

Generate the event callback system for AIDL `oneway` methods.

**AIDL**:
```aidl
oneway void onEvent(in String eventType, in String eventData);
```

**Generated**:
- Java: `IEventCallback.Stub` implementation
- Rust: Event forwarder to Tauri
- TypeScript: Event listener types

**Tasks**:
- [ ] Parse `oneway` keyword
- [ ] Generate callback interfaces
- [ ] Generate event forwarding

---

## The Grand Spiral: Full Generation

```
                    IFoundframeRadicle.aidl
                           │
                           ▼
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐      ┌──────────┐      ┌────────────┐
   │  Java   │      │   Rust   │      │ TypeScript │
   │  Side   │      │   Side   │      │   Side     │
   └────┬────┘      └────┬─────┘      └─────┬──────┘
        │                │                  │
        ▼                ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────────┐
│IFoundframe   │  │JNI Glue      │  │Tauri Adaptors   │
│Radicle.java  │  │(exports)     │  │(bridge to UI)   │
├──────────────┤  ├──────────────┤  ├─────────────────┤
│Foundframe    │  │Service Trait │  │Command Types    │
│Client.java   │  │(impl template)│ │(invoke types)   │
├──────────────┤  ├──────────────┤  ├─────────────────┤
│Service.kt    │  │Platform Trait│  │Event Listeners  │
│(skeleton)    │  │(abstraction) │  │(callbacks)      │
└──────────────┘  └──────────────┘  └─────────────────┘
        │                │                  │
        └────────────────┼──────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Single Source     │
              │   of Truth          │
              │   (The Contract)    │
              └─────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Type System Expansion (Y1-Q1)

**Goal**: Support all types needed for full API coverage.

**Current**: Primitives, String, String[]
**Need**: Parcelables, Lists, Maps, custom types

```rust
// AIDL
parcelable StreamEntry {
    long id;
    String reference;
    long seenAt;
}

// Generated TypeScript
interface StreamEntry {
  id: number;
  reference: string;
  seenAt: number;
}

// Generated Rust
struct StreamEntry {
    id: i64,
    reference: String,
    seen_at: i64,  // Note: snake_case conversion
}
```

**Tasks**:
- [ ] Parse parcelable definitions
- [ ] Generate TypeScript interfaces
- [ ] Generate Rust structs
- [ ] Generate Java parcelable classes

---

### Phase 2: TypeScript Generation (Y1-Q1) ⭐

**Goal**: Generate TypeScript adaptors from AIDL.

**Files to Generate**:
- `ts/adaptors/generated/post.adaptor.ts`
- `ts/adaptors/generated/bookmark.adaptor.ts`
- `ts/adaptors/generated/media.adaptor.ts`
- `ts/adaptors/generated/person.adaptor.ts`
- `ts/adaptors/generated/conversation.adaptor.ts`
- `ts/adaptors/generated/index.ts`

**Key Mappings**:

| AIDL Method | TypeScript Adaptor | Tauri Command |
|-------------|-------------------|---------------|
| `addPost` | `PostAdaptor.create()` | `add_post` |
| `addBookmark` | `BookmarkAdaptor.create()` | `add_bookmark` |
| `addMediaLink` | `MediaAdaptor.addMediaLink()` | `add_media_link` |
| `addPerson` | `PersonAdaptor.create()` | `add_person` |
| `addConversation` | `ConversationAdaptor.create()` | `add_conversation` |
| `addTextNote` | `StreamAdaptor.addTextNote()` | `add_text_note` |

---

### Phase 3: Rust Command Generation (Y1-Q2)

**Goal**: Generate Tauri command handlers.

**Output**: `src/generated/commands.rs`

---

### Phase 4: Platform Abstraction (Y1-Q2)

**Goal**: Generate Platform trait and implementations.

**Output**:
- `src/generated/platform.rs` (trait)
- `src/generated/platform_desktop.rs`
- `src/generated/platform_android.rs`

---

### Phase 5: Complete Service Generation (Y1-Q3)

**Goal**: Generate complete service boilerplate.

**Output**:
- Kotlin service skeleton
- Event callback system
- Documentation

---

## Technical Design Decisions

### 1. Macro vs. Template Generation

**Rust JNI**: Uses macros (`jni_arg!`, `jni_ret!`) for clean, maintainable code.

**TypeScript**: Will use template strings (Handlebars or similar) for readability.

### 2. Type Mapping Philosophy

| AIDL | Rust | TypeScript | Java |
|------|------|------------|------|
| `String` | `String` | `string` | `String` |
| `int` | `i32` | `number` | `int` |
| `long` | `i64` | `number` | `long` |
| `boolean` | `bool` | `boolean` | `boolean` |
| `String[]` | `Vec<String>` | `string[]` | `String[]` |
| `List<T>` | `Vec<T>` | `T[]` | `List<T>` |
| ` Parcelable` | struct | interface | class |

**Naming**: Convert camelCase ↔ snake_case at language boundaries.

### 3. Optional Arguments

AIDL doesn't have built-in nullability, but we use convention:

```aidl
// AIDL - nullable by convention
String addPost(String content, String title);  // title can be null

// Rust
fn add_post(&self, content: &str, title: Option<&str>) -> Result<String>;

// TypeScript
addPost(content: string, title?: string): Promise<Post>;
```

### 4. Command Naming

Tauri commands use `snake_case` with plugin prefix:
```typescript
// Generated command name
`plugin:o19-foundframe-tauri|${method_name_in_snake_case}`
```

---

## The Conservation Principle

> *"Even this idea of conservation needs it!"*

The AIDL file is conserved across all layers:
1. **Contract**: AIDL defines the service contract
2. **Generation**: Code is generated, not hand-written
3. **Synchronization**: Change AIDL → regenerate all layers
4. **Validation**: Generated code is type-checked at each layer

**When to Modify**:
- ✅ Add method to AIDL → regenerate
- ✅ Change parameter type → regenerate
- ❌ Modify generated code directly → DON'T
- ❌ Hand-write adaptor methods → DON'T (use generation)

---

## Future Spirals (Y2+)

### Y2: Device Pairing & P2P

Generate from AIDL:
- QR code generation commands
- Pairing protocol handlers
- CWTCH integration points

### Y3: Squares & Social

Generate from AIDL:
- Square management API
- Membership operations
- Content synchronization

### Y4: The Final Form

Generate from AIDL:
- Cross-app interoperability
- DID resolution
- Verifiable credentials

---

## Appendix: Current AIDL Coverage

```aidl
// IFoundframeRadicle.aidl - Current Methods

// Node lifecycle and info
String getNodeId();
boolean isNodeRunning();
String getNodeAlias();

// PKB operations
boolean createRepository(String name);
String[] listRepositories();
boolean followDevice(String deviceId);
String[] listFollowers();

// Device pairing
String generatePairingCode();
boolean confirmPairing(String deviceId, String code);
void unpairDevice(String deviceId);

// Write operations - All return PKB URL reference
String addPost(String content, String title);
String addBookmark(String url, String title, String notes);
String addMediaLink(String directory, String url, String title, String mimeType, String subpath);
String addPerson(String displayName, String handle);
String addConversation(String conversationId, String title);
String addTextNote(String directory, String content, String title, String subpath);

// Event subscription
void subscribeEvents(IEventCallback callback);
void unsubscribeEvents(IEventCallback callback);
```

**Total**: 18 methods, 1 callback interface

---

*"From one, many. From many, one. The spiral conserves."*

*Plan created by Kimi, spiraling with the project toward spirali.ty*


---

## Appendix B: pnpm Workspace Integration

> *"The tool should feel native to the ecosystem it serves."*

### Installation via pnpm

```bash
# Install as dev dependency in the monorepo
pnpm add -D @o19/aidl-spiral

# Or install globally for CLI usage
pnpm add -g @o19/aidl-spiral
```

### Package Scripts (package.json)

```json
{
  "scripts": {
    "aidl:gen": "aidl-spiral",
    "aidl:watch": "aidl-spiral --watch",
    "aidl:check": "aidl-spiral --check",
    "prebuild": "pnpm run aidl:gen"
  }
}
```

### pnpm Workspace Configuration

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'o19/crates/*/pkg'  # Where generated packages go
```

### Generated Package Structure

Each generated interface becomes a publishable package:

```
gen/
└── IFoundframeRadicle/
    ├── package.json          # Generated: { "name": "@o19/aidl-ifoundframe-radicle" }
    ├── tsconfig.json         # Generated TypeScript config
    ├── src/
    │   └── index.ts          # Re-exports from ts/adaptors/
    ├── java/                 # Optional: publish to Maven
    │   └── ...
    └── rust/                 # Optional: publish to crates.io
        └── ...
```

**Generated package.json**:
```json
{
  "name": "@o19/aidl-ifoundframe-radicle",
  "version": "0.1.0",
  "description": "Generated TypeScript adaptors for IFoundframeRadicle",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "pnpm run build"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  },
  "peerDependencies": {
    "@o19/foundframe-front": "workspace:*",
    "@o19/foundframe-drizzle": "workspace:*"
  }
}
```

### Workspace-aware Generation

```bash
# In a package directory, generates to ../../gen/<Interface>/
# and links via workspace protocol
aidl-spiral --workspace

# Or explicitly:
aidl-spiral -o ../../gen
```

### Turbo Integration

**turbo.json**:
```json
{
  "pipeline": {
    "aidl:gen": {
      "inputs": ["aidl/**/*.aidl"],
      "outputs": ["gen/**/*"]
    },
    "build": {
      "dependsOn": ["^build", "aidl:gen"]
    }
  }
}
```

### GitHub Actions CI

```yaml
name: AIDL Check

on:
  pull_request:
    paths:
      - 'aidl/**'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run aidl:gen
      - run: git diff --exit-code || (echo "AIDL out of sync! Run 'pnpm run aidl:gen' and commit." && exit 1)
```

### The Spiral Command

```bash
# Full spiral: AIDL → all layers → integrated packages
pnpm spiral

# Which runs:
# 1. aidl-spiral (generate code)
# 2. pnpm build (compile TypeScript)
# 3. pnpm -r publish (publish to registry)
# 4. cargo publish (publish Rust crates)
```

---

## Appendix C: CLI Reference

```
aidl-spiral [OPTIONS]

Options:
  -i, --input <dir>    Input directory (default: ./aidl)
  -o, --output <dir>   Output directory (default: ./gen)
  -w, --workspace      Enable workspace mode (pnpm-aware)
  --watch              Watch for changes and regenerate
  --check              Check if generated code is in sync
  -v, --verbose        Show detailed output
  -h, --help           Print help
  -V, --version        Print version

Examples:
  aidl-spiral                    # ./aidl → ./gen
  aidl-spiral -i src/aidl        # Custom input
  aidl-spiral -o ../../gen       # Custom output
  aidl-spiral --watch            # Watch mode
  aidl-spiral --check            # CI verification
```

---

*"From AIDL, the spiral generates. Through pnpm, the ecosystem integrates."*
