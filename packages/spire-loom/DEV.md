# Spire-Loom Developer Guide

> *"The loom weaves, the weaver guides. Never weave by hand what the loom can do."*

## Core Principle: Generator is Source of Truth

**NEVER edit generated files directly.** The generator (`spire-loom`) is the source of truth for all generated code. If a generated file is incorrect, fix the generator, not the file.

### Why?

1. **Idempotency**: Running the generator multiple times should produce the same (correct) result
2. **Consistency**: All generated files follow the same patterns from templates
3. **Maintainability**: One fix in the generator fixes all future generations
4. **Traceability**: Changes are tracked in the tool, not scattered in generated artifacts

### Workflow

```
Generated file is wrong?
        ↓
    DON'T edit it!
        ↓
Fix the generator template
or transformation logic
        ↓
Re-run spire-loom
        ↓
Verify generated file is now correct
```

### Where to Fix

| Problem | Fix Location |
|---------|--------------|
| Type mapping wrong | `machinery/bobbin/type-mappings.ts` |
| Template structure wrong | `machinery/bobbin/templates/<platform>/*.ejs` |
| Method transformation wrong | `machinery/bobbin/code-generator.ts` |
| Platform-specific logic wrong | `machinery/treadles/<platform>-generator.ts` |
| WARP pattern matching wrong | `machinery/heddles/pattern-matcher.ts` |

### Example

**Don't do this:**
```bash
# Generated file has wrong import
$ vim o19/crates/foundframe-android/spire/src/lib.rs  # ❌ DON'T
```

**Do this instead:**
```bash
# Fix the template
$ vim machinery/bobbin/templates/android/jni_bridge.jni.rs.ejs  # ✓ CORRECT

# Re-run the generator
$ cd o19/packages/spire-loom && pnpm exec spire-loom

# Verify the fix
$ cat o19/crates/foundframe-android/spire/src/lib.rs  # Now correct!
```

### Regenerating All Files

```bash
cd o19/packages/spire-loom

# Clean generated files (optional, for clean slate)
rm -rf ../../crates/*-android/spire/

# Regenerate everything
pnpm exec spire-loom

# Or with verbose output
pnpm exec spire-loom -v
```

### Testing Generator Changes

```bash
cd o19/packages/spire-loom

# Run tests
pnpm test

# Check TypeScript compiles
pnpm exec tsc --noEmit

# Run generator and verify output
pnpm exec spire-loom -v
```

### Emergency Exceptions

In rare cases, you may need to manually edit a generated file for debugging. **But** you must immediately:

1. Document the change with a `// MANUAL OVERRIDE:` comment
2. Port the fix back to the generator
3. Re-run the generator to verify it produces the same output
4. Remove the manual override

---

## Architecture Overview

See [machinery/README.md](machinery/README.md) for the full weaving pipeline.

### Quick Reference: Where Things Live

```
spire-loom/
├── warp/                      # DSL patterns (WARP.ts)
│   ├── spiral/               # Spiral pattern definitions
│   ├── imprint.ts            # @reach, @crud decorators
│   └── crud.ts               # CRUD operation tagging
│
├── machinery/                # The loom itself
│   ├── reed/                 # Workspace discovery
│   ├── heddles/              # Pattern matching
│   ├── bobbin/               # Templates + transformations
│   │   ├── type-mappings.ts  # TS → Kotlin/Rust/AIDL
│   │   ├── code-generator.ts # High-level generation API
│   │   └── templates/        # EJS templates (see naming below)
│   ├── shuttle/              # File operations
│   ├── treadles/             # Platform generators
│   │   └── android-generator.ts
│   └── weaver.ts             # Orchestration
│
└── cli.ts                    # Entry point
```

### Rust Crate Hookup Pattern

Generated Rust code uses `#[path]` attribute to reference files outside `src/`:

```rust
// In src/lib.rs
#[path = "../spire/src/lib.rs"]
pub mod spire;
```

This allows the `spire/` directory to live as a sibling to `src/`, visually separating generated code from hand-written source.

#### Cargo.toml Block Registry

Similar to Gradle blocks, Cargo.toml uses tagged blocks for idempotent modifications:

```toml
[dependencies]
# SpireStart: GeneratedDependencies
serde = { workspace = true }
# SpireEnd: GeneratedDependencies
```

Use `cargo-toml-manager.ts` to manage these blocks:
- `ensureCargoBlock()` - Add/update a block
- `cleanupUntouchedBlocks()` - Remove blocks not touched this generation

### Template Naming Convention (Double Extension)

Templates use **double extension** to specify both the target language and transformation type:

```
{name}.{transform}.{lang}.ejs
```

| Pattern | Extension | Meaning | Transformation |
|---------|-----------|---------|----------------|
| `service.kt.ejs` | `.kt` | Kotlin | `transformForKotlin()` |
| `platform.rs.ejs` | `.rs` | Pure Rust | `transformForRust()` |
| `jni_bridge.jni.rs.ejs` | `.jni.rs` | Rust JNI | `transformForRustJni()` |
| `interface.aidl.ejs` | `.aidl` | AIDL | `transformForAidl()` |

**Why double extension?** Same language, different contexts:
- `.rs` → Tauri platform trait (pure Rust)
- `.jni.rs` → Android JNI bridge (JNI types + conversions)

The `detectLanguage()` function in `code-generator.ts` parses these extensions.

---

*Even this guide is woven by the loom.*
