# Implementation Plan: The Loom Awakens

> *"The weaver plans, the loom executes, the spire rises."*

This document outlines the code generator architecture—from the WARP.ts definition to the woven spires.

**Status**: Core machinery implemented. Android generator in progress.

---

## Architecture Overview

```
WARP.ts ──► warp (DSL) ──► machinery ──► {package}/spire/ ──► hooked up
                │              │
                │              ├── reed: Collect Managements
                │              ├── heddles: Build IR (WeavingPlan)
                │              ├── bobbin: Templates
                │              ├── shuttle: File operations
                │              ├── treadles: Generators
                │              ├── beater: Formatting
                │              └── sley: Binding resolution
                │
                └── RustCore ──► Spiralers ──► spiralOut()
```

---

## The Warp (DSL)

### New WARP.ts Structure

```typescript
import loom from '@o19/spire-loom';

// Core with explicit metadata
export const foundframe = loom.spiral(loom.rustCore());

// Platform spiralers (from Core.getSpiralers())
export const android = foundframe.android.foregroundService();
export const desktop = foundframe.desktop.direct();  // No package!

// Multiplexed spiral (Tauri aggregates platforms)
export const tauri = loom.spiral(android, desktop).tauri.plugin();

// DDD layer
export const front = tauri.typescript.ddd();
export const drizzle = front.typescript.drizzle_adaptors({ filter: ['read'] });
export const myTauriApp = front.tauri.app({ adaptorOverrides: [drizzle] });
```

### Core Types

**`RustCore`** extends `CoreRing`:
- Provides `getSpiralers()` → returns `{ android, desktop }`
- Provides `getMetadata()` → crate name, package name, etc.

**`AndroidSpiraler`** extends `Spiraler`:
- `foregroundService()` → generates Kotlin service + AIDL

**`DesktopSpiraler`** extends `Spiraler`:
- `direct()` → pass-through to Core (NO package generated!)

---

## The Machinery

### Reed (`machinery/reed/`)

**Workspace Discovery** (future):
- Scan monorepo for packages
- Detect Cargo/npm/pnpm workspaces

**Management Collection** ✅:
```typescript
import { collectManagements, filterByReach } from './reed/index.js';

const managements = await collectManagements('./loom');
// [ { name: 'BookmarkMgmt', reach: 'Global', methods: [...] } ]

const platformManagements = filterByReach(managements, 'platform');
// Only Local + Global reach
```

Collects from `loom/*.ts` files:
- `@reach` decorator → Private/Local/Global
- `@crud` decorator → create/read/update/delete/list
- Method signatures and constants

### Heddles (`machinery/heddles/`)

**Pattern Matcher** ✅:
```typescript
const heddles = new Heddles(matrix);
const plan = heddles.buildPlan(warp, managements);
```

**WeavingPlan (Intermediate Representation)**:
```typescript
{
  edges: [...],              // Spiral graph edges
  nodesByType: Map,          // Nodes grouped by type
  managements: [...],        // Management Imprints
  tasks: [...]               // Matched generator tasks
}
```

**Generator Matrix**:
```typescript
const matrix = new GeneratorMatrix();
matrix.setPair('AndroidSpiraler', 'RustCore', generateAndroidService);
matrix.setPair('TauriSpiraler', 'AndroidSpiraler', generateTauriAndroid);
// ... etc
```

### Bobbin (`machinery/bobbin/`)

**Templates** ✅:
```
templates/
├── android/
│   ├── service.kt.ejs          # Kotlin foreground service
│   └── aidl_interface.aidl.ejs # AIDL interface
└── tauri/
    └── (future)
```

EJS templates with data binding:
```typescript
await renderEjs({
  template: '.../service.kt.ejs',
  data: { packageName, serviceName, ... }
});
```

### Shuttle (`machinery/shuttle/`)

**File Operations** ✅:
- `ensureFile()`, `ensureDir()` — idempotent
- `ensureTextBlockInserted()` — marker-based insertion

**Package Management** ✅:
- `ensureCargoCrateCreated()`
- `ensureTypeScriptPackageCreated()`

**Hookup Manager** ✅:
```typescript
// Automatically hook generated code into existing packages
autoHookup('./o19/crates/foundframe-android');
// → adds `pub mod spire;` to lib.rs

// Ensure spire/ directory exists
ensureSpireDirectory(packagePath, 'rust');
```

**Output Location**:
```
o19/crates/foundframe-android/
├── spire/                    # Generated code here!
│   ├── mod.rs               # Re-exports generated modules
│   └── android_service/
│       └── ...
├── android/
├── src/
│   └── lib.rs               # Has: pub mod spire;
└── Cargo.toml
```

### Treadles (`machinery/treadles/`)

**Android Generator** ✅ (in progress):
```typescript
export async function generateAndroidService(
  current: SpiralNode,      // AndroidSpiraler
  previous: SpiralNode,     // RustCore
): Promise<GeneratedFile[]> {
  // 1. Generate Kotlin service
  // 2. Generate AIDL interface (from Management methods)
  // 3. Hook up to existing crate
}
```

Uses Management metadata:
```typescript
const methods = toAidlMethods(platformManagements);
// Convert Management methods to AIDL format
```

### Weaver (`machinery/weaver.ts`)

**Orchestration** ✅:
```typescript
const weaver = new Weaver(warp);
await weaver.collectManagements('./loom');  // Reed
const plan = weaver.buildPlan();             // Heddles
await weaver.weave();                        // Execute
```

---

## CLI Entry Point (`cli.ts`)

```bash
# Global install
npm install -g @o19/spire-loom

# Usage
spire-loom -v                    # Verbose output
spire-loom -w                    # Watch mode
spire-loom -p foundframe         # Generate specific package
spire-loom --help
```

**Auto-detection**:
- Workspace root: has `pnpm-workspace.yaml`, `Cargo.toml[workspace]`, or `loom/`
- Package dir: has `Cargo.toml` or `package.json`

**ts-node integration**: Direct TypeScript execution without pre-compilation.

---

## Implementation Status

### ✅ Completed

| Component | File | Status |
|-----------|------|--------|
| **Warp (DSL)** | `warp/spiral/core.ts` | ✅ RustCore with getSpiralers() |
| | `warp/spiral/index.ts` | ✅ spiral() with overloads |
| | `warp/imprint.ts` | ✅ @reach decorator |
| | `warp/crud.ts` | ✅ @crud decorator |
| **Machinery** | | |
| Reed | `reed/management-collector.ts` | ✅ Collect @reach/@crud |
| Heddles | `heddles/pattern-matcher.ts` | ✅ Build WeavingPlan |
| | | ✅ Generator Matrix |
| Bobbin | `bobbin/templates/` | ✅ EJS templates |
| Shuttle | `shuttle/file-system-operations.ts` | ✅ Idempotent ops |
| | `shuttle/hookup-manager.ts` | ✅ Auto-hookup |
| | `shuttle/template-renderer.ts` | ✅ EJS rendering |
| Treadles | `treadles/android-generator.ts` | 🚧 In progress |
| Weaver | `weaver.ts` | ✅ Orchestration |
| CLI | `cli.ts` | ✅ Entry point |

### 🚧 In Progress

- Android generator completing method generation from Managements
- Tauri generator (platform trait + commands)
- DDD generator (TypeScript domain types)

### 📋 Todo

- Desktop detection (virtual ring, no package)
- Drizzle adaptor generator
- Watch mode for development
- Golden tests / snapshot testing

---

## Key Design Decisions

### 1. Desktop Has No Package

```typescript
// Desktop is a pass-through, not a package
desktop.direct() → returns SpiralOut with no additional spiralers
// Generator detects this: Object.keys(ring).length === 1 (just 'inner')
```

### 2. spire/ Directory Convention

All generated code goes to `{package}/spire/`:
- Separates generated from hand-written
- Easy to `.gitignore` or commit
- Version controlled independently

### 3. Hookup Pattern

Generated code is automatically hooked into packages:
- Rust: `pub mod spire;` in lib.rs
- TypeScript: `export * from './spire/index.js'` in index.ts

### 4. Management-Driven Generation

The `@crud` decorator drives what gets generated:
```typescript
@crud('create') addBookmark(...)  → AIDL: String addBookmark(...)
@crud('read') getBookmark(...)    → AIDL: String getBookmark(...)
@crud('list', { collection: true }) listBookmarks(...) → AIDL: String[] listBookmarks(...)
```

---

## Testing Strategy

### Unit Tests
- Template rendering with mock data
- File operation idempotency
- Management collection

### Integration Tests
```typescript
const warp = {
  foundframe: loom.spiral(loom.rustCore()),
  android: foundframe.android.foregroundService(),
};
const result = await weave(warp, { verbose: true });
// Verify files generated in correct locations
```

### Golden Tests
- Generate from reference WARP.ts
- Compare output to expected snapshots
- CI fails on unexpected changes

---

## Open Questions

1. **Multiple Managements in one service?**
   - Current: All Global-reach Managements → one AIDL interface
   - Alternative: Separate interfaces per Management?

2. **Desktop detection reliability?**
   - Current: `Object.keys(ring).length === 1`
   - Better: DesktopSpiraler adds `isPassThrough: true` marker?

3. **Versioning generated code?**
   - Option: Hash of WARP.ts + loom/ in generated header
   - Option: `loom_version` field in WARP.ts

---

*The loom weaves. The spire rises. The pattern continues.* 🧵✨
