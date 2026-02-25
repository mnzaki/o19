# NEXTUP

## Completed ✅

### APP-010: Hookup System Implementation

**Status**: ✅ **COMPLETE** - All handlers implemented and tested

| Handler | Status | Tests |
|---------|--------|-------|
| `rust-module.ts` | ✅ Done | 13 |
| `typescript.ts` | ✅ Done | 21 |
| `cargo-toml.ts` | ✅ Done | 17 |
| `vite-config.ts` | ✅ Done | 15 |
| **TOTAL** | | **114** |

Plus **8 new tests** for query iterator → **122 total** |

**Usage Example**:
```typescript
hookups: [
  // Rust module hookup
  {
    path: 'src/lib.rs',
    moduleDeclarations: [{ name: 'spire', path: '../spire.rs', pub: true }],
    useStatements: ['use crate::spire::*;'],
    tauriCommands: ['crate::spire::commands::ping']
  },
  // TypeScript exports hookup
  {
    path: 'src/index.ts',
    exports: [{ source: '../spire/src/index.js', star: true }]
  },
  // Cargo.toml hookup
  {
    path: 'Cargo.toml',
    dependencies: { 'tauri': { version: '2', features: ['test'] } }
  },
  // Vite config hookup
  {
    path: 'vite.config.ts',
    build: {
      rollupOptions: {
        input: process.env.CIRCULARITY_TEST 
          ? './src/test-entry.ts' 
          : './src/main.ts'
      }
    }
  }
]
```

---

## Active Work

### APP-011: API Ergonomics Improvements

**Status**: 🚧 **IN PROGRESS** - Quick wins done, Ferris errors next

#### ✅ Phase 1: Query Builder Iterable
**Done!** Added `[Symbol.iterator]` to `BoundQueryImpl`
```typescript
// Now works:
for (const method of context.query?.methods) { ... }
const names = [...context.query?.methods].map(m => m.name);
```

#### ✅ Phase 2: Optional Pipeline  
**Done!** Made `pipeline` optional with default `[]`
```typescript
// All valid now:
methods: { filter: 'core' }  // No pipeline needed
methods: { filter: 'core', pipeline: [] }  // Still works
methods: { filter: 'core', pipeline: [addPrefix] }  // With transforms
```

#### 🚧 Phase 3: Hookups-Only Treadles + Ferris Errors
**Next**: Make `methods`/`outputs` optional when `hookups` provided + add compassionate error messages

See: **APP-012: Ferroring** for full error system design

---

### APP-012: Ferroring - Compassionate Error System 🦀

**Status**: 📋 **DESIGN COMPLETE** - Ready for implementation  
**Package**: `o19/packages/ferroring`  
**Docs**: `.kimi/kimprint/1NBOX/APP-012-ferroring-compassionate-errors.md`

**Vision**: Transform errors from cryptic crashes into teaching moments. Like Rust's compiler, understand intent and suggest fixes.

```
❌ Before: "TreadleDefinition must have methods configuration"

✅ After:
┌─ Treadle Has No Purpose ───────────────────────────────┐
│                                                         │
│  Your treadle 'my-treadle' has nothing to do!          │
│                                                         │
│  💡 Generate files from methods:                       │
│     methods: { filter: 'core' },                        │
│     outputs: [{ template: '...', path: '...' }]       │
│                                                         │
│  💡 Wire existing code into the app:                   │
│     hookups: [{ path: 'src/lib.rs', ... }]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**
- `ContextStack` - Async context capture for rich error context
- `SuggestionEngine` - Intent inference + ranked fix suggestions  
- `TerminalRenderer` - Beautiful CLI output
- `MUDRenderer` - Narrative error mode

**Next Steps:**
1. Create `o19/packages/ferroring` package
2. Implement `Ferror` base class + `ContextStack`
3. Convert spire-loom errors to use ferroring
4. Integrate into Interactive CLI and MUD interfaces

---

### The Beater: Precompiled ORM Generation

Building the three-stage ORM pipeline in `machinery/beater/`:

**Three Layers of Abstraction:**
1. **Compactor** (`compactor.ts`) — Generic staged metaprogramming pattern
2. **OrmCompactor** (`orm-compactor.ts`) — Schema-aware compaction for queries  
3. **RustOrmlitePrecompiler** (`rust-ormlite-precompiler.ts`) — Concrete Rust/SQLite impl

**The Pattern:**
```
Input → Generate Midstage → Compile → Run → Output
```

**Status:**
- [x] Create `machinery/reed/drizzle-parser.ts` — import and parse schema.ts
- [x] Create `machinery/beater/compactor.ts` — abstract base
- [x] Create `machinery/beater/orm-compactor.ts` — ORM-specific layer
- [x] Create `machinery/beater/rust-ormlite-precompiler.ts` — concrete impl
- [ ] Wire into weaver.ts to run during weave
- [ ] Generate first `media.gen.rs` for foundframe

---

## Critical TODOs

### 🛑 Safety: Never Write Broken Spires

**Rule**: Never write to a spire unless the new spire generates **fully without errors**.

**Implementation:**
- Generate all files to a temp directory first
- Compile check: `cargo check -p o19-foundframe`
- Only if successful, atomically swap temp → final
- On failure, crinkle the cranks and brangle the gears — the loom shuts down!

**Location**: Add to `machinery/weaver.ts` — wrap generation in transaction/rollback logic.

---

## Meta-Weaving: The Loom That Weaves Itself

### 🌀 Treadle for Creating Beaters (Future!)

Just as we have `definePlatformWrapperTreadle` for creating treadles,
we should have `defineBeaterTreadle` for creating beaters.

**The Meta-Pattern:**
```typescript
// A treadle that generates a compactor that compacts... (turtles all the way down!)
export default defineBeaterTreadle({
  name: 'custom-orm',
  language: 'rust',
  ormLibrary: 'diesel', // or 'sea-orm', 'sqlx'
  
  // Generates the beater midstage
  generateBeater: (schema) => { ... },
  
  // The beater then generates the final ORM code
  generateOutput: (validatedSchema) => { ... }
});
```

**Why?** Let users define their own compaction strategies for:
- Different databases (PostgreSQL, MySQL)
- Different languages (Kotlin, Swift)
- Different ORMs (Diesel, SeaORM, SQLx)

**Location**: `machinery/treadles/beater-generator.ts`

---

## Backlog

### DSL updates need implementation!

- `warp/rust.ts`
- `warp/imprint.ts`
- Usage in `o19/loom/WARP.ts` and `o19/loom/device.ts`
- TODO about getting crate/package info after heddles phase

### Interactive CLI Polish

- [ ] Watch mode for file changes
- [ ] Dependency graph visualization
- [ ] Undo/redo in MUD mode
- [ ] Command history persistence

---

## Appendix: MyTauriApp Integration Test Harness

The hookup system now supports all requirements for the MyTauriApp test harness:

```typescript
// A. NPM Dependencies
{
  path: 'package.json',
  dependencies: {
    '@o19/foundframe-tauri': 'workspace:*'
  },
  scripts: {
    'test:circularity:integration': 'tauri dev'
  }
}

// B. Cargo Dependencies  
{
  path: 'src-tauri/Cargo.toml',
  dependencies: {
    'o19-foundframe-tauri': { path: '../../../crates/foundframe-tauri' }
  }
}

// C. Rust Plugin Init
{
  path: 'src-tauri/src/lib.rs',
  // Via rust-module.ts: builderPlugins, pluginInit
}

// D. Test Framework - via treadle outputs (not hookups)
outputs: [
  { template: 'test-harness/runner.ts.ejs', path: 'src/lib/test-circularity/runner.ts' }
]

// E. Test Entry Point - via file-block or file generation
{
  path: 'src/test-entry.ts',
  // Generate file content via treadle output
}

// F. Vite Config Multi-Entry
{
  path: 'vite.config.ts',
  build: {
    rollupOptions: {
      input: process.env.CIRCULARITY_TEST 
        ? './src/test-entry.ts' 
        : './src/main.ts'
    }
  }
}
```

---

> *"The loom that can weave a loom is the loom that lives forever."* 🧵🌀
