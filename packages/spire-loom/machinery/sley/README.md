# The Sley 🪡

> *"The warp is threaded through the reed, and the pattern is set."*

The [sley](../) is the **threading layer**—it resolves bindings between rings, connecting front-end code to its implementations and routing operations to their correct adaptors.

## What the Sley Resolves

- **Adaptor Overrides**: When an app uses `drizzle` for reads but DDD for writes
- **Bind-Points**: Where does `front.tauri.app()` connect to the core?
- **Multiplexing**: Tauri routing to Android vs Desktop
- **Method Translation**: Transforming Management methods through the spiral

## The Method Pipeline

The sley provides a **composable pipeline** for processing Management methods:

```
Management Imprint (loom/bookmark.ts)
    ↓
Raw MgmtMethod[] (from inner ring)
    ↓
Translation Layer 1: addManagementPrefix()  → "bookmark_add"
    ↓
Translation Layer 2: crudInterfaceMapping() → "create", "update"
    ↓
... more translations ...
    ↓
Filter (by tags)                            → exclude 'crud:read'
    ↓
Code Generation
```

### Key Principles

1. **Translations Stack**: Each ring can add transformations
2. **Methods Are Complete**: No data loss until filtering
3. **Filtering Is Last-Second**: Right before templates render
4. **Each Ring Sees All**: Full method visibility for decision-making

### Usage

```typescript
import { MethodPipeline, addManagementPrefix, crudInterfaceMapping, tagFilter } from '../sley/index.js';

// Build pipeline
const pipeline = new MethodPipeline()
  .translate(addManagementPrefix())      // bookmark_add, bookmark_get
  .translate(crudInterfaceMapping());    // create, update, delete

// Process methods (complete set)
const allMethods = pipeline.process(rawMethods);

// Filter at last second before generation
const filtered = pipeline.filter(allMethods, tagFilter(['crud:read']));
```

### Available Translations

| Translation | Purpose |
|-------------|---------|
| `addPrefix(prefix)` | Add arbitrary prefix to bind-point names |
| `addManagementPrefix()` | Add `{management}_` prefix (snake_case) |
| `crudInterfaceMapping()` | Transform CRUD-tagged methods to standard interface |
| `mapTypes(typeMap)` | Transform TypeScript types |

### Available Filters

| Filter | Purpose |
|--------|---------|
| `tagFilter(['crud:read'])` | Exclude methods with matching tags |
| `crudOperationFilter(['create', 'update'])` | Only include specific CRUD ops |

## The Threading Pattern

### Adaptor Overrides

```typescript
const myApp = front.tauri.app({ 
  adaptorOverrides: [drizzle]  // Reads go to drizzle
});
// Writes fall back to DDD layer
```

### Rust Core Prefixing

When methods are renamed in the loom (e.g., `addBookmark` → `add`), the rustCore ring counters this by adding management prefixes:

```typescript
// loom/bookmark.ts
class BookmarkMgmt {
  @crud('create')
  add(url: string): number { ... }  // Was addBookmark
}

// Generated Tauri command: "bookmark_add"
// Generated Rust fn: "bookmark_add"
```

This ensures unique bind-points across all managements while keeping the loom code clean.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Spiral Ring (e.g., RustCore)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  MethodPipeline                                       │  │
│  │  ├── translate(addManagementPrefix())                 │  │
│  │  └── translate(otherTransforms...)                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Generator (last-second filtering)                    │  │
│  │  └── filter(tagFilter(['crud:read']))                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Types

### `MgmtMethod`

The unified method representation that flows through the pipeline:

```typescript
interface MgmtMethod {
  id: string;                    // "BookmarkMgmt.add"
  managementName: string;        // "BookmarkMgmt"
  name: string;                  // Current bind-point name
  originalName: string;          // Name from loom
  jsName: string;                // camelCase for JS
  params: MgmtParam[];
  returnType: string;
  isCollection: boolean;
  tags?: string[];               // ['crud:create']
  crudOperation?: CrudOperation;
  metadata?: Record<string, unknown>;
}
```

### `MethodTranslation`

A pure function that transforms methods:

```typescript
type MethodTranslation = (methods: MgmtMethod[]) => MgmtMethod[];
```

### `MethodFilter`

A predicate for last-second filtering:

```typescript
type MethodFilter = (method: MgmtMethod) => boolean;  // true = keep
```

---

*Part of the [machinery](../). Preceded by the [treadles](../treadles/) (generation phases), completing the cycle that returns to the [weaver](../weaver.ts) (the operator).*

> *"Even this sley needs threading."*
