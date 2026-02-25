# How to Loom 🧶

> *"The warp is your intention; the loom makes it real."*

**⚠️ KIMI NOTICE:** Read this before editing treadles. The loom has patterns. Understanding them prevents cross-cutting. Conservation spiral matters. 🌀

---

## Quick Start (5 Minutes)

### 1. Write Your WARP.ts

```typescript
// loom/WARP.ts - Declare your architecture
import loom from '@o19/spire-loom';

// Core: Your domain structs
@loom.rust.Struct
export class Foundframe {
  @loom.rust.Mutex @loom.rust.Option
  thestream = TheStream;
}

// Spiral out: Core → Platform → Interface → Front
export const foundframe = loom.spiral(Foundframe);
export const android = foundframe.android.foregroundService({ nameAffix: 'radicle' });
export const desktop = foundframe.desktop.direct();
export const tauri = loom.spiral(android, desktop).tauri.plugin();
export const front = tauri.typescript.ddd();
```

### 2. Write Managements (Imprints)

```typescript
// loom/bookmark.ts - Define operations, not implementations
@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class BookmarkMgmt extends loom.Management {
  @loom.crud('create')
  addBookmark(url: string): void { throw new Error('Imprint only'); }
  
  @loom.crud('list')
  listBookmarks(): string[] { throw new Error('Imprint only'); }
}
```

### 3. Run the Loom

```bash
pnpm spire-loom
# Generated code goes to each package's spire/ directory
```

---

## Rings: How They Connect

Rings wrap other rings. Different spiralers create different connection patterns:

```typescript
// Pattern 1: Simple wrapping
const android = foundframe.android.foregroundService({...});
// Creates: AndroidSpiraler → foundframe

// Pattern 2: Multi-platform aggregation (Tauri)
const tauri = loom.spiral(android, desktop).tauri.plugin();
// Creates: TauriSpiraler → [android, desktop]

// Pattern 3: Direct typeScript front
const front = tauri.typescript.ddd();
// Creates: TsCore → tauri

// Pattern 4: Tieup treadles (custom generators)
const front = tauri.typescript.ddd().tieup({
  treadles: [{ treadle: myTreadle, warpData: {...} }]
});
```

Access inner rings: `foundframe.inner.core.thestream`

---

## Writing Treadles

Treadles map architectural connections to file generation tasks. They receive metadata from the WARP.ts graph and generate/modify files.

### Basic Structure

```typescript
// loom/treadles/my-treadle.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const myTreadle = defineTreadle({
  name: 'my-treadle',  // Used for marker scoping
  
  // Optional: Auto-run when this edge appears in WARP.ts
  // Matches: {Spiraler}.{spiralingMethod} -> {Layer.name}
  matches: [{ current: 'TauriSpiraler.plugin', previous: 'RustCore' }],
  
  // Method collection: filter by reach, transform via pipeline
  methods: {
    filter: 'platform',  // 'core' | 'platform' | 'front'
    pipeline: [addManagementPrefix()]
  },
  
  // Generate files
  outputs: [
    { template: 'my/lib.rs.ejs', path: 'src/lib.rs', language: 'rust' }
  ],
  
  // Modify existing files
  patches: [{
    type: 'ensureBlock',
    targetFile: 'Cargo.toml',
    marker: 'my-deps',
    template: 'my/cargo.ejs',
    language: 'toml'
  }]
});

export default generateFromTreadle(myTreadle);
```

> **🌀 Rule of Thumb:** Hookup configs accept arrays of lines OR arrays of objects:
> ```typescript
> hookups: [{ exports: ["export * from '...';", "export ..."] }]
> // OR
> hookups: [{ exports: [{ source: '...', star: true }] }]
> ```

### Dynamic Outputs (Per-Entity Generation)

```typescript
outputs: [(ctx) => {
  // Access warpData from .tieup()
  const config = ctx.config as { entities: string[] };
  
  // Generate one file per entity
  return config.entities.map(entity => ({
    template: 'adaptor.ts.ejs',
    path: `src/adaptors/${entity.toLowerCase()}.ts`,
    language: 'typescript',
    // Per-output context merged with main data
    context: { 
      entity: { name: entity, pascal: toPascal(entity) }
    }
  }));
}]
```

### Method Queries (APP-009)

```typescript
data: (ctx) => {
  // Classic API - simple access
  const creates = ctx.methods?.creates;
  
  // Query API - chainable filters
  const authCreates = ctx.query?.methods
    .crud('create')
    .tag('auth:required')
    .management('BookmarkMgmt')
    .all;
  
  // Pre-filtered entry points
  const bookmarkReads = ctx.query?.reads
    .management('BookmarkMgmt')
    .all;
  
  return { authCreates, bookmarkReads };
}
```

### Tieup Style (No Matches Needed)

```typescript
// In WARP.ts
export const front = tauri.typescript.ddd().tieup({
  treadles: [{
    treadle: myTreadle,
    warpData: {  // Passed as ctx.config
      entities: ['Bookmark', 'Media'],
      operations: ['create', 'read']
    }
  }]
});

// In treadle
defineTreadle({
  name: 'my-treadle',
  // No matches needed - invoked directly via .tieup()
  methods: { filter: 'front', pipeline: [] },
  data: (ctx) => {
    const config = ctx.config as { entities: string[] };
    return { entities: config.entities };
  },
  outputs: [...]
});
```

---

## Tools Reference (Extension Essentials)

### Stringing (machinery/stringing.ts)

Cross-cutting utilities for name transformations:

```typescript
import {
  pascalCase,      // 'my-service' → 'MyService'
  camelCase,       // 'my_service' → 'myService'
  toSnakeCase,     // 'MyService' → 'my_service'
  buildServiceNaming,
  mapToAidlType,
  addAidlTypesToMethods
} from '@o19/spire-loom/machinery/stringing';

// Service naming builder
const naming = buildServiceNaming('foundframe', 'radicle');
// → { serviceName: 'FoundframeRadicleService', interfaceName: 'IFoundframeRadicle', ... }
```

### Sley (machinery/sley) - Method Pipeline

Transform and filter management methods:

```typescript
import {
  // Translations
  addManagementPrefix,     // bookmark_addBookmark → bookmark_add_bookmark
  crudInterfaceMapping,    // Standardize CRUD interface names
  mapTypes,                // { 'Url': 'string' }
  
  // Filters
  tagFilter,
  crudOperationFilter,
  
  // Grouping
  groupByManagement,
  groupByCrud,
  
  // Pipeline
  MethodPipeline
} from '@o19/spire-loom/machinery/sley';

// Pipeline pattern
const pipeline = new MethodPipeline()
  .translate(addManagementPrefix())
  .translate(crudInterfaceMapping());

const methods = pipeline.process(rawMethods);
```

### Treadle Kit (machinery/treadle-kit)

Foundation for building treadles:

```typescript
import {
  // Declarative API
  defineTreadle,
  generateFromTreadle,
  
  // Context methods
  toRawMethod,
  buildContextMethods,
  
  // Naming builders
  buildAndroidPackageData,
  buildTauriPluginNaming,
  
  // Imperative (for custom logic)
  createTreadleKit
} from '@o19/spire-loom/machinery/treadle-kit';
```

### Query Builder (machinery/sley/query)

Chainable method queries:

```typescript
import {
  createQueryAPI,
  type BoundQuery,
  type QueryAPI
} from '@o19/spire-loom/machinery/sley';

// Available in treadle data/outputs via ctx.query
ctx.query?.methods
  .crud('create', 'update')
  .tag('auth:required')
  .byManagement()  // Map<string, RawMethod[]>
```

---

## Templates

Templates use EJS. Place custom templates in `loom/bobbin/` (overrides builtin):

```
loom/bobbin/
  kysely/
    adaptor.ts.ejs    ← Custom template
  tauri/
    commands.ts.ejs   ← Overrides builtin
```

Lookup order: `loom/bobbin/` → `machinery/bobbin/`

### Template Data

```ejs
// Access data passed from treadle
export class <%= entity.pascal %>Service {
  <% methods.forEach(m => { -%>
  async <%= m.name %>(): Promise<<%= m.returnType %>> {
    // Implementation
  }
  <% }) -%>
}
```

---

## Patches (Idempotent Modifications)

Modify existing files with marker-based blocks:

```typescript
patches: [
  // Static patch
  {
    type: 'ensureBlock',
    targetFile: 'src/lib.rs',
    marker: 'spire-imports',
    template: 'imports.rs.ejs',
    language: 'rust',
    position: { after: 'use std::' }
  },
  
  // Dynamic: one patch per method
  (ctx) => ctx.methods?.creates.map(m => ({
    type: 'ensureBlock' as const,
    targetFile: 'src/commands.rs',
    marker: `cmd-${m.name}`,
    template: 'command.rs.ejs',
    language: 'rust'
  })) || []
]
```

Creates marked blocks:
```rust
/* SPIRE-LOOM:TREADLE-NAME:MARKER */
// Generated content
/* /SPIRE-LOOM:TREADLE-NAME:MARKER */
```

---

## Key Principles

1. **WARP.ts is executable** - It builds the spiral graph at runtime
2. **Managements are imprints** - Define interfaces, not implementations
3. **The loom generates to `spire/`** - Isolated from hand-written code
4. **Methods flow through the spiral** - Collected, filtered, transformed
5. **Tieup treadles for extensions** - Attach via `.tieup()` with `warpData`
6. **Workspace templates override builtins** - Place in `loom/bobbin/`
7. **Query API for complex filtering** - Chainable: `.crud().tag().management()`

---

*See also: [DEV.md](DEV.md) for development details • [GLOSSARY.md](GLOSSARY.md) for terminology*

> 🌀 *"The warp is your intention; the loom makes it real."*
