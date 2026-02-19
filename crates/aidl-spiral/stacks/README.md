# Stacks

Predefined architecture configurations for aidl-spiral.

## What is a Stack?

A **Stack** is a complete architecture configuration that defines:
- Which **Rings** exist (horizontal concerns)
- How they connect (BoundaryTypes)
- The **data → domain → UI** flow
- Supported platforms

## Available Stacks

### `radicle_foundframe_tauri`

**Flow**: Radicle (git storage) → Foundframe (domain) → Tauri (UI)

**Rings** (7 total):
1. **Contract** (AIDL) - Source of truth
2. **Binding** (Java) - Android service stubs
3. **Bridge** (Rust) - JNI glue
4. **Core** (Rust) - Foundframe domain logic
5. **Platform** (Rust) - Desktop/Android abstraction
6. **Interface** (Rust) - Tauri commands
7. **Front** (TypeScript) - User-facing adaptors

**Use case**: Cross-platform apps with Radicle PKB backend

## Usage

### Option 1: Copy

```bash
cp stacks/radicle_foundframe_tauri.aidl aidl/meta.aidl
```

### Option 2: Symlink (recommended)

```bash
ln -s stacks/radicle_foundframe_tauri.aidl aidl/meta.aidl
```

### Option 3: Inherit and Extend

Create your own `meta.aidl` that imports a stack:

```aidl
// my-meta.aidl
package my.config;

// Copy the Ring definitions from radicle_foundframe_tauri
// Then add your custom Rings or modify Config

interface IMetaArchitecture {
    Ring[] getRings();
    String[] getManagements();
    Config getConfig();
}

// ... rest of definitions
```

## Creating New Stacks

To create a new stack:

1. Copy an existing stack as template
2. Modify Ring definitions for your architecture
3. Adjust Config for your project
4. Document the data → domain → UI flow

### Stack Naming Convention

```
<data>_<domain>_<ui>.aidl
```

Examples:
- `ipfs_myapp_electron.aidl` - IPFS storage, custom domain, Electron UI
- `postgres_rails_react.aidl` - PostgreSQL, Rails backend, React frontend
- `s3_serverless_vue.aidl` - S3 storage, serverless functions, Vue UI

## The Stack Geometry

```
Ring 0: Contract (AIDL)
    │
    ▼
Ring 1: Binding (Java/Kotlin/Swift stubs)
    │
    ▼
Ring 2: Bridge (JNI/FFI/Network)
    │
    ▼
Ring 3: Core (Domain logic - your code here)
    │
    ▼
Ring 4: Platform (Deployment abstraction)
    │
    ▼
Ring 5: Interface (Commands/Events/API)
    │
    ▼
Ring 6: Front (User adaptation)
```

Each **Management** (AIDL interface) traverses all Rings.
Each **Boundary** between Rings generates specific code.

---

*The spiral stacks, layer upon layer.*
