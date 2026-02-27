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

// Associate entities with the management
@BookmarkMgmt.Entity()  // or @BookmarkMgmt.EntityOptions({ tableName: 'bookmarks' })
export class Bookmark {
  id: number; url: string; title: string;
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

## Package WARP Overrides 🌀

Packages can override their own spiral configuration. When the loom runs, it auto-discovers `loom/WARP.ts` in each package directory and merges configurations.

### How It Works

```typescript
// workspace/loom/WARP.ts - Main architecture, just a plain unconfigured spiral
export const front = loom.spiral()
  .tieup({ treadles: [{ treadle: mainTreadle }] });  // Runs first

// workspace/packages/foundframe-front/loom/WARP.ts - Package override
export const front = loom.spiral.typescript.ddd()
  .tieup({ treadles: [{ treadle: packageTreadle }] });  // Runs second

// Result: Both treadles execute; package ring replaces main ring
// Tieups merge (main first, package second); package can fully redefine
```

### Use Cases

```typescript
// Override 1: Custom package structure
export const front = loom.spiral(loom.tsCore(), {
  packagePath: 'custom/path',  // Different output location
  language: 'typescript'
}).tieup({ treadles: [customStructureTreadle] });

// Override 2: Additional tieups without redefining ring
export const front = tauri.typescript.ddd()
  .tieup({ treadles: [{ treadle: extraAdaptor }] });
// ^ Merges with main WARP.ts tieups; both run

// Override 3: Completely different generator set
export const front = loom.spiral(myCustomCore())
  .tieup({
    treadles: [
      { treadle: vueTreadle },
      { treadle: viteTreadle },
      { treadle: piniaTreadle }
    ]
  });
```

### Resolution Order

1. **Main WARP.ts** loads → rings created, lazy tieups stored
2. **Metadata computed** → `packagePath` determined from export name
3. **Package WARP.ts** auto-loaded → `{packagePath}/loom/WARP.ts` (if exists)
4. **Tieups merged** → main tieups + package tieups (concatenated)
5. **Final ring used** → package ring replaces main ring for that export

> **🌀 Rule:** Package WARPs are always loaded when present. No opt-in needed. Merge strategy: tieups concatenate; ring replaces.

### Debugging

```bash
# See which package WARPs are loaded
DEBUG_PACKAGE_WARP=1 pnpm spire-loom
# Output: "🌀 Package WARP: front from packages/foundframe-front/loom/WARP.ts"
```

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
  
  // Generate files (each output can have its own context: { entity, method, ... })
  outputs: [
    { template: 'my/lib.rs.ejs', path: 'src/lib.rs', language: 'rust' }
  ],
  
  // Hookups: declarative modifications to existing files
  hookups: [
    // Cargo.toml dependencies
    { path: 'Cargo.toml', dependencies: { serde: '^1.0' } },
    
    // TypeScript class method injection
    { 
      path: 'src/db-router.ts',
      classes: {
        DbRouter: {
          methods: {
            init: { prepend: ['this.generated = true;'] }
          }
        }
      }
    },
    
    // Rust impl block modification
    {
      path: 'src/handler.rs',
      impls: {
        'EventHandler': {
          methods: {
            'new': { prepend: ['// Generated setup'] }
          }
        }
      }
    }
  ]
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
  const entities = ctx.entities?.withFields();  // @Mgmt.Entity() data
  
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
  
  return { authCreates, bookmarkReads, entities };
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
    return { entities: config.entities };  // Shared with all outputs/patches
  },
  // Per-item context: each output gets its own `context.entity`
  outputs: (ctx) => ctx.entities?.all.map(e => ({
    template: 'entity.rs.ejs',
    path: `entities/${e.name}.rs`,
    context: { entity: e }  // Template receives THIS entity
  })) || []
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
  .byManagement();  // Map<string, RawMethod[]>

// Access entities via ctx.entities
ctx.entities?.byManagement().get('BookmarkMgmt');  // EntityMetadata[]
ctx.entities?.readOnly;  // Entities with readOnly: true
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

// Access method link metadata (from @loom.link() decorator)
<% methods.forEach(m => { -%>
  // m.link.fieldName tells you which struct field this method targets
  // e.g., 'thestream' or 'device_manager' for foundframe-specific routing
  <% if (m.link && m.link.fieldName === 'thestream') { -%>
    // Route to TheStream trait implementation
  <% } else if (m.link && m.link.fieldName === 'device_manager') { -%>
    // Route to DeviceManager
  <% } -%>
<% }) -%>
```

### Method Helpers

Methods come with pre-computed helpers for common patterns:

```ejs
// Stub return values for mock implementations
<% methods.forEach(m => { -%>
  fn <%= m.name %>() -> <%= m.rsReturnType %> {
    // m.stubReturn provides appropriate default for the type:
    // Rust: 'String::new()', 'Vec::new()', 'Default::default()'
    // TypeScript: "'', 0, false, []"
    // Kotlin: '"", 0, false, emptyList()'
    <%= m.stubReturn %>
  }
<% }) -%>
```

---

## Hookups: Advanced File Modification

Declarative modifications to external files (Cargo.toml, AndroidManifest.xml, source files):

```typescript
hookups: [
  // TypeScript: class methods and imports
  {
    path: '{packageDir}/src/router.ts',
    imports: ['import { handler } from "./generated";'],
    classes: {
      Router: {
        fields: ['private initialized = false;'],
        methods: {
          init: { prepend: ['this.initialized = true;'] },
          destroy: { append: ['cleanup();'] }
        },
        newMethods: ['generatedRoute() { return "/api"; }']
      }
    }
  },
  
  // Rust: impl blocks and standalone functions
  {
    path: '{packageDir}/src/lib.rs',
    impls: {
      'MyService': {
        methods: { 'new': { prepend: ['// Setup'] } }
      }
    },
    functions: {
      'main': { append: ['println!("Done");'] }
    }
  },
  
  // File-block: template-based block insertion (patch replacement)
  // Language auto-detected from file extension (.rs → rust, .ts → typescript, etc.)
  {
    path: '{packageDir}/src/db.rs',
    template: 'rust/db_commands.rs.ejs',
    context: { entities: ctx.entities?.all },
    position: { after: 'use sqlx::' }
  }
]
```

### Patches (Deprecated)

**⚠️ `patches` is deprecated. Use `hookups` with `language` + `template` instead.**

Old pattern → New pattern:
```typescript
// Old (deprecated)
patches: [{
  type: 'ensureBlock',
  targetFile: 'src/lib.rs',
  marker: 'spire-imports',
  template: 'imports.rs.ejs',
  language: 'rust'
}]

// New (hookup) - language auto-detected from .rs extension
hookups: [{
  path: 'src/lib.rs',
  template: 'imports.rs.ejs'
}]
```

---

## Key Principles

1. **WARP.ts is executable** - It builds the spiral graph at runtime
2. **Managements are imprints** - Define interfaces, not implementations
3. **Entities decorate Managements** - `@Mgmt.Entity` links data to operations
4. **The loom generates to `spire/`** - Isolated from hand-written code
5. **Methods flow through the spiral** - Collected, filtered, transformed
6. **Tieup treadles for extensions** - Attach via `.tieup()` with `warpData`
7. **Workspace templates override builtins** - Place in `loom/bobbin/`
8. **Query API for complex filtering** - Chainable: `.crud().tag().management()`
9. **Hookups modify external files** - `patches` deprecated; use declarative hookups with method-level targeting

---

*See also: [DEV.md](DEV.md) for development details • [GLOSSARY.md](GLOSSARY.md) for terminology*

> 🌀 *"The warp is your intention; the loom makes it real."*
