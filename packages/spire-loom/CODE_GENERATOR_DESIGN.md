# Code Generator Design

> *"The generator reads the surface and blooms it into spires."*

This document captures the design decisions for implementing `spire-loom`'s code generation phase.

---

## Overview

The generator reads `loom/*.ts` files and produces concrete code in multiple target packages. It operates in two phases:

1. **Discovery Phase**: Execute `loom/WARP.ts` to construct the spiral object graph
2. **Generation Phase**: Traverse the spiral graph, blooming each Management into its reachable rings

**All files in `loom/` are executable TypeScript**—they run to build the spiral graph and register metadata. See [The Loom - All Executable](#the-loom---all-executable) below.

---

## Architecture: The Machinery

Code generation is orchestrated by the **machinery**—organized by loom parts:

```
machinery/
├── reed/               # Workspace discovery (scans monorepo)
├── heddles/            # Pattern matching (rings → generators)
├── bobbin/             # Template & IR storage
├── shuttle/            # File generation (file ops, deps, templates, configs)
├── beater/             # Code formatting (prettier, rustfmt)
├── treadle-kit/        # Foundation for building treadles ⭐ NEW
│   ├── core.ts         # TreadleKit implementation
│   ├── declarative.ts  # defineTreadle, generateFromTreadle
│   ├── discovery.ts    # Treadle discovery system
│   └── platform-wrapper.ts  # High-level abstraction
├── treadles/           # Generation phases (uses treadle-kit)
├── tieups/             # Link treadles to spiralers ⭐ NEW
│   └── spiral.ts       # Spiraler extension system
├── sley/               # Binding resolution (method pipelines)
└── weaver.ts           # Entry point—operates the loom
```

### The Treadle-Kit: Three Layers of Abstraction

The machinery provides **three layers** for building generators:

#### Layer 1: Treadle Kit (Foundation)

Low-level utilities for building treadles:

```typescript
import { createTreadleKit } from '@o19/spire-loom/machinery/treadle-kit';

const kit = createTreadleKit(context);

// Validate node types
if (!kit.validateNodes(current, previous, { current: 'MySpiraler', previous: 'RustCore' })) {
  return [];
}

// Collect methods with filtering and transformation
const methods = kit.collectMethods({
  filter: 'platform',  // 'core' | 'platform' | 'front'
  pipeline: [addManagementPrefix()]
});

// Generate files from templates
const files = await kit.generateFiles([
  { template: 'my/service.ts.ejs', path: '{packageDir}/spire/service.ts', language: 'typescript' }
], data, methods);

// Hookup to existing code
await kit.hookup.android(androidData);
```

#### Layer 2: Declarative API (Common Cases)

For 80% of use cases, define treadles as configuration:

```typescript
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const myTreadle = defineTreadle({
  // When does this run?
  matches: [{ current: 'RustAndroidSpiraler', previous: 'RustCore' }],
  
  // Extra validation
  validate: (current, previous) => current.ring instanceof RustAndroidSpiraler,
  
  // Method collection
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },
  
  // Method transformation (optional)
  transformMethods: (methods, context) => methods.map(m => ({ ...m, link: computeLink(m) })),
  
  // Template data
  data: (context, current, previous) => ({
    packageName: (current.ring as RustAndroidSpiraler).getGradleNamespace('foundframe')
  }),
  
  // Output files
  outputs: [
    { template: 'android/service.kt.ejs', path: '{packageDir}/spire/{serviceName}.kt', language: 'kotlin' }
  ],
  
  // Package integration
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) {
      // AndroidManifest.xml, Gradle config, etc.
    }
  }
});

export const generateMyService = generateFromTreadle(myTreadle);
```

#### Layer 3: Platform Wrapper (High-Level Abstraction)

For platform wrappers that follow the common pattern (wrap RustCore, expose Managements):

```typescript
import { definePlatformWrapperTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const genAndroidForegroundService = definePlatformWrapperTreadle({
  platform: { name: 'Android', spiraler: 'RustAndroidSpiraler' },
  wrapperType: 'foreground-service',
  
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },
  
  naming: (coreName, affix) => ({
    wrapperName: `${coreName}${affix}Service`,
    interfaceName: `I${coreName}${affix}`,
    fileName: toSnakeCase(`${coreName}${affix}Service`)
  }),
  
  outputs: [
    { template: 'android/service.kt.ejs', file: '{packageDir}/spire/...', language: 'kotlin' },
    { template: 'android/aidl_interface.aidl.ejs', file: '...', language: 'aidl' },
    { template: 'android/jni_bridge.jni.rs.ejs', file: '...', language: 'rust_jni' }
  ],
  
  hookup: 'android-gradle'
});
```

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
1. Execute `WARP.ts` to build the spiral object graph
2. Find all `loom.spiral()` calls (these return SpiralOut/SpiralMux instances)
3. Inspect the exported SpiralOut/SpiralMux objects:
   - Each has an `inner` property pointing to its wrapped ring
   - Record: `X` wraps `inner`
4. Build the containment graph from the runtime objects

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

### The Heddles: Pattern Matching

The [heddles](machinery/heddles/) match spiral patterns to generators:

```typescript
// Generator Matrix maps (current, previous) → generator
matrix.setPair('RustAndroidSpiraler', 'RustCore', generateAndroidService);
matrix.setPair('TauriSpiraler', 'RustAndroidSpiraler', generateTauriPlugin);
matrix.setPair('TauriSpiraler', 'DesktopSpiraler', generateTauriPlugin);
```

**Edge Direction**:
```
Parent (outer ring) → Node (inner ring)
     │                       │
     │                       └── previous node in matrix
     └── current node in matrix
```

**Temporal Constraints**:
- **Heddles phase**: Plan is being built. Don't traverse `plan.nodesByType`.
- **Treadles phase**: Plan is complete. Safe to access full graph.

### Treadle Discovery

Treadles can be discovered from the workspace:

```typescript
// Scans {workspace}/loom/treadles/*.ts
const discovered = await discoverTreadles('./loom/treadles');
const matrix = await createMatrixWithDiscovery(workspaceRoot);
```

Discovered treadles are automatically registered in the matrix.

### The Tie-Up: Treadles Extending Spiralers

Treadles can contribute methods to spiralers via the **tie-up** layer:

```typescript
// In loom/treadles/gen-android-foreground-service.ts
export const treadle = defineTreadle({...});

export const contributes = defineSpiralerContribution({
  spiraler: 'RustAndroidSpiraler',
  method: 'foregroundService',
  optionsType: 'ForegroundServiceOptions',
  returnType: 'RustAndroidSpiraler'
});
```

This enables:
1. **Type-safe API**: TypeScript knows `foundframe.android.foregroundService()` exists
2. **Modular extensions**: New treadles add methods to existing spiralers
3. **Clear contracts**: Treadles declare what they contribute

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

**Input**: Management + `plugin()` method call  
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

## The Sley: Method Pipeline

The [sley](machinery/sley/) provides a composable pipeline for processing Management methods:

```typescript
import { MethodPipeline, addManagementPrefix, crudInterfaceMapping, tagFilter } from '@o19/spire-loom/machinery/sley';

// Build pipeline
const pipeline = new MethodPipeline()
  .translate(addManagementPrefix())      // bookmark_add, bookmark_get
  .translate(crudInterfaceMapping());    // create, update, delete

// Process methods (complete set)
const allMethods = pipeline.process(rawMethods);

// Filter at last second before generation
const filtered = pipeline.filter(allMethods, tagFilter(['crud:read']));
```

**Key Principles**:
1. **Translations Stack**: Each ring can add transformations
2. **Methods Are Complete**: No data loss until filtering
3. **Filtering Is Last-Second**: Right before templates render
4. **Each Ring Sees All**: Full method visibility for decision-making

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

## The Weaver

The entry point for code generation is the **Weaver** (`machinery/weaver.ts`):

```typescript
import * as warp from './loom/WARP.js';
import { Weaver } from '@o19/spire-loom/machinery/weaver';

const weaver = new Weaver(warp);
await weaver.weave();
```

The weaver orchestrates the machinery:
1. **Reed** scans the workspace
2. **Heddles** match patterns to generators
3. **Treadles** execute generation phases (via treadle-kit)
4. **Shuttle** weaves files into existence
5. **Beater** formats the generated code
6. **Sley** resolves binding configurations

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

---

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
├── spire/                    # All generated code
│   ├── i_content_mgmt/
│   │   ├── mod.rs            # Re-exports
│   │   ├── core_trait.rs     # Core trait (if Core)
│   │   ├── jni_glue.rs       # JNI exports (if Android)
│   │   ├── platform_trait.rs # Platform trait (if Tauri)
│   │   └── commands.rs       # Commands (if Tauri)
│   └── mod.rs                # Top-level re-exports
└── src/
    ├── lib.rs                # May include spiral/mod.rs
    └── ...                   # Hand-written code
```

---

## Hookup System

After generation, code must be integrated into the package:

1. **Rust mod.rs**: Add `pub mod spiral;`
2. **Cargo.toml**: Add dependencies if needed
3. **AndroidManifest.xml**: Add service declarations (Android)
4. **permissions/*.toml**: Add command permissions (Tauri)
5. **build.rs**: Register commands (Tauri)

The treadle-kit provides standard hookup implementations:

```typescript
// In treadle definition
hookup: {
  type: 'custom',
  async customHookup(context, files, data) {
    // Full control over integration
  }
}

// Or use kit directly
const kit = createTreadleKit(context);
await kit.hookup.android(androidData);
```

---

## Using the Machinery

Individual tools can be imported from the shuttle:

```typescript
import { 
  ensureFile,
  ensureCargoCrateCreated,
  ensureTauriPermissions,
  renderEjs 
} from '@o19/spire-loom/machinery/shuttle';

// Create a file
ensureFile('./output/generated.rs', '// generated code');

// Ensure a package exists
ensureCargoCrateCreated('./crates/my-crate', {
  name: 'my-crate',
  description: 'My generated crate'
});

// Render from template
await renderEjs({
  template: './templates/trait.ejs',
  data: { name: 'BookmarkMgmt', methods: [...] }
});
```

---

## The Warp System: Multiple Topologies

The **warp** is the potential field—the space through which architectural patterns flow. [Spiral](../warp/spiral/) is just one topology:

### Spiral Warp (Implemented)

**Pattern**: Rings wrapping rings (conservative growth)
```
Core → Platform → Front
```

### Fractal Warp (Vision)

**Pattern**: Self-similar decomposition (horizontal scaling)
```
        Core (whole)
           │
           ▼ fractal split
    ┌──────┼──────┐
    ▼      ▼      ▼
 Shard1  Shard2  Shard3  (each a mini-Core)
```

See [warp/fractal/README.md](../warp/fractal/README.md) for the vision.

---

## Key Design Principles

1. **Thin surface, thick generation**: WARP.ts should be minimal
2. **Convention over configuration**: Package names derived from exports
3. **One imprint, many blooms**: Same shape, different substances
4. **Explicit relationships**: `X = inner.spiraler.method()` shows wrapping
5. **Semantic method names**: `foregroundService()` vs `plugin()` determine output
6. **Surface is runtime**: All loom/ files execute to build the spiral graph and register metadata
7. **Sync interface only**: Asyncness is a boundary concern added per-ring
8. **Constants are universal**: Values available in all rings
9. **Idempotent tooling**: All machinery operations are safe to run multiple times
10. **Three-layer treadles**: Kit → Declarative → Platform Wrapper
11. **Treadle discovery**: Custom treadles in `loom/treadles/*.ts`
12. **Spiraler tie-up**: Treadles extend spiralers via contributions

### Imprint DSL Conventions

When writing Management Imprints (in `loom/*.ts` files like `bookmark.ts`):

- **No boilerplate**: `static`, `readonly` are implied by context
- **Abstract classes**: Use `abstract` blocks without `extends Management`
- **Decorators**: Use `@reach` and `@crud` to attach metadata

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

5. How do we implement the fractal warp?
   - Option: Consistent hashing for entity routing
   - Option: CRDTs for state synchronization
   - Option: Actor model with supervision

---

*The generator reads what is, and unfolds what could be.*
