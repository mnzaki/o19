# Workspace Integration

> *"The spiral spans packages, each taking what it needs from the shared source."*

## The Problem

In a workspace (pnpm + Cargo), we have:

```
workspace-root/
├── aidl/                           # Single source of truth
│   ├── meta.aidl                   # Architecture definition
│   ├── IFoundframeRadicle.aidl     # Managements
│   └── IEventCallback.aidl
│
├── o19/
│   ├── crates/
│   │   ├── foundframe-tauri/       # Needs Rings 4, 5, 6
│   │   ├── android/                # Needs Rings 1, 2, 3
│   │   └── foundframe/             # Needs Ring 3
│   └── ...
│
└── packages/
    └── foundframe-front/           # Needs Ring 6
```

**Each package needs different Rings, but shares the same AIDL source.**

## Discovery Strategies

### Strategy 1: Heuristic Detection (automatic)

Detect package type from files:

| Detected | Rings | Reasoning |
|----------|-------|-----------|
| `Cargo.toml` + `src-tauri/` | 4, 5, 6 | Tauri app needs Platform, Interface, Front |
| `Cargo.toml` + `android/` | 1, 2, 3 | Android needs Binding, Bridge, Core |
| `Cargo.toml` (library) | 3 | Rust library needs Core |
| `package.json` + Tauri dep | 6 | Frontend needs Front |
| `package.json` (pure) | 6 | Frontend needs Front |

**Pros**: Zero configuration  
**Cons**: Magic, might guess wrong

### Strategy 2: Explicit Configuration

Each package declares its Rings:

```toml
# o19/crates/foundframe-tauri/Cargo.toml
[package.metadata.aidl-spiral]
rings = ["Platform", "Interface", "Front"]
# or
rings = [4, 5, 6]
```

```json
// packages/foundframe-front/package.json
{
  "o19": {
    "aidl-spiral": {
      "rings": ["Front"]
    }
  }
}
```

**Pros**: Explicit, no guessing  
**Cons**: More config to maintain

### Strategy 3: Dependency Graph (inferred)

Analyze the dependency graph:

```
foundframe-front (TS)
  └── depends on: foundframe-tauri (Rust)
      └── depends on: foundframe (Rust)
          └── depends on: android (Java)
```

Each package generates Rings it owns, plus bindings for its dependencies.

**Pros**: Correct by construction  
**Cons**: Complex to implement

## Proposed: Hybrid Approach

Use **heuristics with explicit override**:

1. **Default**: Detect from package structure
2. **Override**: Read `[package.metadata.aidl]` or `package.json#o19.aidl`
3. **Validate**: Error if requested Rings conflict with package type

### Configuration Schema

```toml
# Cargo.toml
[package.metadata.aidl]
# Which Rings this package implements
rings = ["Platform", "Interface"]

# Which Managements to include (default: all)
managements = ["IFoundframeRadicle", "IEventCallback"]

# Output directory relative to package root
output = "src/generated"

# AIDL source (default: workspace-root/aidl)
aidl-dir = "../../aidl"
```

```json
// package.json
{
  "o19": {
    "aidl": {
      "rings": ["Front"],
      "managements": ["*"],
      "output": "src/generated",
      "aidlDir": "../../aidl"
    }
  }
}
```

## Ring-to-Package Mapping

| Ring | Typical Package | Output |
|------|-----------------|--------|
| 0 Contract | Root `aidl/` folder | Source files |
| 1 Binding | `o19/android` | Java stubs |
| 2 Bridge | `o19/android` or `o19/foundframe-tauri` | JNI glue |
| 3 Core | `o19/foundframe` | Service traits |
| 4 Platform | `o19/foundframe-tauri` | Platform trait + impls |
| 5 Interface | `o19/foundframe-tauri` | Tauri commands |
| 6 Front | `packages/foundframe-front` | TS adaptors |

## Generation Workflow

```bash
# From workspace root
aidl-spiral --workspace

# What happens:
# 1. Find meta.aidl in workspace-root/aidl/
# 2. Parse Architecture (all Rings)
# 3. Scan workspace for packages with AIDL config
# 4. For each package:
#    - Determine which Rings it needs (heuristic or explicit)
#    - Generate only those Rings for all Managements
#    - Output to package's configured directory
```

### Per-Package Generation

```bash
# In o19/crates/foundframe-tauri/
cargo aidl-gen

# Reads: ../../aidl/meta.aidl
# Generates: Rings 4, 5, 6 → src/generated/
```

## Open Questions

1. **Should Ring 0 (AIDL) be copied or referenced?**
   - Copy: Self-contained packages
   - Reference: Single source of truth

2. **How to handle cross-package imports?**
   - If `foundframe-tauri` needs types from `foundframe`, how are they shared?

3. **Build integration?**
   - `build.rs` in Cargo crates?
   - `prebuild` script in npm packages?

4. **What if a package needs non-adjacent Rings?**
   - E.g., a test package that needs Ring 3 (Core) and Ring 6 (Front) but not 4, 5
   - Skip intermediate Rings? Or generate them as stubs?

## Recommended Next Steps

1. **Implement heuristic detection** in `aidl-spiral`
2. **Add metadata config support** (Cargo.toml, package.json)
3. **Add `--workspace` flag** for workspace-wide generation
4. **Create `cargo-aidl` plugin** for `cargo aidl-gen` command
5. **Add pnpm script** integration

---

*The spiral winds through packages, each taking its strand.*
