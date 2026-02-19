# AIDL Code Generator - Agent Guide

## Overview

This crate generates all cross-platform code from AIDL (Android Interface Definition Language) definitions.

**Design Philosophy:**
- One AIDL file → 14 generated files
- Zero configuration: reads `./aidl/`, writes to `./gen/`
- Single source of truth: AIDL defines the API contract
- Manual control: Generated files are read-only, hand-written business logic in separate files

## Quick Start

```bash
# Install the codegen tool
cd o19/crates/aidl-codegen
cargo install --path .

# Run from any project with ./aidl/ directory
aidl-codegen

# Or explicitly specify paths
aidl-codegen --aidl-dir ./aidl --output ./gen
```

## AIDL Grammar

### Supported Types

```aidl
// Primitives
boolean name;     // → bool in Rust, boolean in Java
int id;           // → i32 in Rust, int in Java
long timestamp;   // → i64 in Rust, long in Java
String path;      // → String in both
String[] tags;    // → Vec<String> in Rust, String[] in Java

// Future: Parcelables, Callbacks
```

### Method Signatures

```aidl
interface IMyInterface {
    // Sync methods (return void → sync in Rust)
    void startService(String config);
    
    // Async methods (return value → async in Rust)
    boolean connect();
    String getStatus();
    
    // Multiple params
    int addItem(String name, String content, int priority);
}
```

### File Structure

```aidl
// Single interface per file
package com.example;

// Optional imports
import com.example.Data;

interface IMyInterface {
    // Methods only (no nested types in AIDL)
}
```

## Generated Outputs

### For `IFoundframeRadicle.aidl`:

| File | Purpose | Language |
|------|---------|----------|
| `jni_glue.rs` | JNI bridge between Rust & Android | Rust |
| `service_impl_template.rs` | Empty service impl stub | Rust |
| `commands.rs` | Tauri command handlers | Rust |
| `IFoundframeRadicle.java` | Android service interface | Java |
| `FoundframeRadicleClient.java` | Android client helper | Java |
| `index.ts` | TypeScript API index | TypeScript |
| `*/adapt.ts` (6 files) | Entity adaptors for Drizzle | TypeScript |

## Project Structure

```
o19/crates/aidl-codegen/
├── src/
│   ├── main.rs              # CLI entry point
│   ├── lib.rs               # Library: parse & generate
│   ├── parser.rs            # AIDL parsing logic
│   ├── jni_generator.rs     # JNI glue generation
│   ├── tauri_commands.rs    # Tauri command generation ✅
│   ├── java_generator.rs    # Java interface & client
│   └── typescript_generator.rs  # TS API generation
├── Cargo.toml
└── templates/               # Handlebars templates (future)
```

## Key Implementation Details

### Type Mapping

| AIDL | Rust | Java | TypeScript |
|------|------|------|------------|
| `void` | `()` | `void` | `void` |
| `boolean` | `bool` | `boolean` | `boolean` |
| `int` | `i32` | `int` | `number` |
| `long` | `i64` | `long` | `number` |
| `String` | `String` | `String` | `string` |
| `String[]` | `Vec<String>` | `String[]` | `string[]` |

### Naming Conventions

- **Rust**: `snake_case` for methods/vars, `PascalCase` for types
- **Java**: `camelCase` for methods, `PascalCase` for classes
- **TypeScript**: `camelCase` for methods, `PascalCase` for types

## Testing

```bash
# Run unit tests
cargo test

# Test with actual project
cd ../../path/to/project
aidl-codegen
# Check generated files in ./gen/
```

## Common Tasks

### Add a new primitive type

1. Add to `parser.rs` in `TYPE_KEYWORDS` or `parse_type()`
2. Add mapping in each generator's `type_to_*()` function
3. Add test case in `parser.rs` tests

### Add a new generator

1. Create `src/my_generator.rs`
2. Implement `generate_my_output(aidl: &AidlFile) -> String`
3. Call from `lib.rs::generate_from_aidl()`
4. Update this AGENTS.md

### Fix formatting issues

The `quote!` macro generates compact code. For Rust output, use:
```rust
// In lib.rs
fn format_rust_code(code: &str) -> String {
    // Currently: just returns as-is
    // Future: integrate rustfmt or prettyplease
    code.to_string()
}
```

## Architecture Notes

### Why AIDL?
- **Mature**: Well-defined, battle-tested interface language
- **Android Native**: Directly supported on Android
- **Simple**: Limited syntax = easier to parse and generate from

### Why 14 files from 1 AIDL?
- Complete type safety across all platforms
- No hand-written boilerplate to maintain
- Single source of truth for API changes

### Why manual generation (not build script)?
- Explicit control over when code regenerates
- Easier to debug generated code
- Simpler build system integration
