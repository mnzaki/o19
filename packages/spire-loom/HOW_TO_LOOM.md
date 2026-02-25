# How to Loom 🧶

> *"The warp is your intention; the loom makes it real."*

This guide teaches you how to write `loom/WARP.ts` and Management imprints for the spire-loom code generator.

---

## Quick Start

### 1. Define Your Core (WARP.ts)

```typescript
// loom/WARP.ts
import loom from '@o19/spire-loom';

// Define your domain struct
@loom.rust.Struct
export class Foundframe {
  @loom.rust.Mutex
  @loom.rust.Option
  thestream = TheStream;

  @loom.rust.Mutex  
  @loom.rust.Option
  device_manager = DeviceManager;
}

// Create the core spiral - this is Ring 3 (the Core)
export const foundframe = loom.spiral(Foundframe);

// Add platform rings - Ring 4 (Platform layer)
export const android = foundframe.android.foregroundService({
  nameAffix: 'radicle',
  gradleNamespace: 'ty.circulari.o19'
});

export const desktop = foundframe.desktop.direct();

// Aggregate with Tauri - Ring 5 (Interface layer)
// Tauri wraps multiple platforms (android + desktop)
export const tauri = loom.spiral(android, desktop).tauri.plugin();

// Add front-end layer - Ring 6 (Front layer)
export const front = tauri.typescript.ddd();
```

> 💡 **Ring Layers**: The spiral has 6 rings. Core (3) → Platform (4) → Interface (5) → Front (6). Each ring can access methods from inner rings based on reach level.

---

### 2. Define Managements (bookmark.ts)

```typescript
// loom/bookmark.ts
import loom from '@o19/spire-loom';
import { Foundframe, foundframe } from './WARP.js';

@loom.reach('Global')  // Can be accessed from all rings (3-6)
@loom.link(foundframe.inner.core.thestream)
class BookmarkMgmt extends loom.Management {
  VALID_URL_REGEX = /^https?:\/\/.+/;
  MAX_TITLE_LENGTH = 200;

  @loom.crud('create')
  addBookmark(url: string, title?: string): void {
    throw new Error('Imprint only');
  }

  @loom.crud('list', { collection: true })
  listBookmarks(directory?: string): string[] {
    throw new Error('Imprint only');
  }
}

export { BookmarkMgmt };
```

> 🔗 **Link connects struct to management**: The `@loom.link()` points to `foundframe.inner.core.thestream`, meaning BookmarkMgmt methods operate on the `thestream` field of the Foundframe struct. This is how the loom knows which wrapper types (Mutex, Option) to use.

---

## The Architecture

### The Spiral Chain

```
foundframe (SpiralOut)          ← Ring 3: Core
    └── inner: RustCore
            └── core: Foundframe (your struct with fields)
                    └── thestream: RustExternalLayer

android (SpiralOut)             ← Ring 4: Platform
    └── inner: foundframe (inherits thestream link)
    
tauri (SpiralMux)               ← Ring 5: Interface
    └── innerRings: [android, desktop]
    
front (SpiralOut)               ← Ring 6: Front
    └── inner: tauri
```

Access path: `foundframe.inner.core.thestream`

> 🌀 **The Spiral Conserves**: Each outer ring wraps inner rings. The Tauri mux combines android and desktop. When Tauri generates code, it can see methods from both.

---

## Tools Reference

The loom machinery provides powerful tools for building treadles. These are organized by metaphor:

### The Bobbin 🧵 - Type Mapping & Code Generation

**`@o19/spire-loom/machinery/bobbin`**

Central registry for type conversions and code generation primitives.

```typescript
import {
  // Type mappings: TS → Target platforms
  mapToKotlinType,
  mapToJniType,
  mapToRustType,
  mapToTauriType,
  getTypeMapping,
  
  // JNI conversion code generation
  generateJniToRustConversion,
  generateRustToJniConversion,
  getJniErrorValue,
  
  // Type checking
  isPrimitiveType,
  getSerializationStrategy,
  registerTypeMapping
} from '@o19/spire-loom/machinery/bobbin';
```

| Function | Purpose |
|----------|---------|
| `mapToKotlinType('string', true)` | `'List<String>'` |
| `mapToRustType('number')` | `'i32'` |
| `generateJniToRustConversion('name', 'string')` | Generates Rust JNI conversion code |

---

### The Sley 🪡 - Method Pipeline (Threading)

**`@o19/spire-loom/machinery/sley`**

The threading layer - resolves bindings between rings. Methods flow through pipelines with transformations and filters.

```typescript
import {
  // Method pipeline
  MethodPipeline,
  addPrefix,
  addManagementPrefix,
  crudInterfaceMapping,
  mapTypes,
  
  // Filters
  tagFilter,
  crudOperationFilter,
  
  // Utilities
  toSnakeCase,
  fromSourceMethods,
  
  // CRUD mapping (legacy - prefer method-pipeline)
  mapManagementCrud,
  filterMethodsByTags,
  
  // Operation routing
  routeOperation,
  routeOperations,
  isHybridRouting
} from '@o19/spire-loom/machinery/sley';
```

**Pipeline Pattern:**
```typescript
const pipeline = new MethodPipeline()
  .translate(addManagementPrefix())     // bookmark_addBookmark
  .translate(crudInterfaceMapping())    // Standardize CRUD interface names
  .translate(mapTypes({ 'Url': 'string' }));

const methods = pipeline.process(rawMethods);
const filtered = pipeline.filter(methods, tagFilter(['crud:read']));
```

**Important:** Sley is the *threading* layer (method processing), not redundant with heddles (method collection) or weaver (file generation orchestration).

---

### The Treadle Kit 🧰 - Treadle Building Utilities

**`@o19/spire-loom/machinery/treadle-kit`**

Foundation for building treadles - both declarative and imperative styles.

```typescript
import {
  // Declarative API
  defineTreadle,
  generateFromTreadle,
  
  // Core utilities
  pascalCase,
  camelCase,
  toSnakeCase,
  toRawMethod,
  buildServiceNaming,
  buildAndroidPackageData,
  buildMethodLink,
  
  // Imperative API
  createTreadleKit
} from '@o19/spire-loom/machinery/treadle-kit';
```

**String Utilities:**
| Function | Input | Output |
|----------|-------|--------|
| `pascalCase('bookmark-mgmt')` | `BookmarkMgmt` |
| `camelCase('bookmark_mgmt')` | `bookmarkMgmt` |
| `toSnakeCase('BookmarkMgmt')` | `bookmark_mgmt` |

**Service Naming Builder:**
```typescript
const naming = buildServiceNaming('foundframe', 'radicle');
// naming.serviceName = 'FoundframeRadicleService'
// naming.interfaceName = 'IFoundframeRadicle'
// naming.logTag = 'FOUNDFRAME_RADICLE_SERVICE'
```

---

### The Shuttle 🚀 - Hookup Management

**`@o19/spire-loom/machinery/shuttle`**

Android-specific integration and hookup management.

```typescript
import {
  configureAndroidManifest,
  configureGradleBuild,
  executeAndroidHookup,
  findCoreNameForTask
} from '@o19/spire-loom/machinery/shuttle';
```

---

## Defining Treadles

Treadles are the code generators that transform your WARP.ts patterns into actual code. Define them declaratively using `defineTreadle()`.

There are **two styles** of treadles:

1. **Matrix Treadles** - Have `matches` and run automatically when the matrix matches
2. **Tieup Treadles** - No `matches` needed; attached manually via `.tieup()`

---

### Tieup Treadles (Recommended for User Extensions)

Tieup treadles don't need `matches` - you attach them explicitly in WARP.ts:

```typescript
// loom/WARP.ts
import { kyselyAdaptorTreadle } from '@o19/spire-loom/loom/treadles/kysely-adaptor.js';

export const front = tauri.typescript.ddd().tieup({
  treadles: [{
    treadle: kyselyAdaptorTreadle,
    warpData: {
      entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
      operations: ['create', 'read', 'update', 'delete', 'list'],
    }
  }]
});
```

The treadle receives `warpData` via `context.config`:

```typescript
// loom/treadles/kysely-adaptor.ts
import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const kyselyAdaptorTreadle = defineTreadle({
  name: 'kysely-adaptor',
  
  // No matches needed for tieup treadles!
  methods: { filter: 'front', pipeline: [] },
  
  // Access warpData via ctx.config
  data: (ctx) => {
    const config = ctx.config as { entities: string[], operations: string[] };
    return {
      entities: config.entities,
      operations: config.operations
    };
  },
  
  // Generate per-entity files
  outputs: [(ctx) => {
    const config = ctx.config as { entities: string[] };
    return config.entities.map(entity => ({
      template: 'kysely/adaptor.ts.ejs',
      path: `src/adaptors/gen/${entity.toLowerCase()}.adaptor.gen.ts`,
      language: 'typescript',
      // Per-output context for template data
      context: { entity: { name: entity, pascal: toPascal(entity) } }
    }));
  }]
});
```

> 🎯 **No matches needed**: Tieup treadles only need `name`, `methods`, `data`, and `outputs`. They're triggered by `.tieup()` in WARP.ts, not by matrix matching.

---

### Matrix Treadles (Automatic Matching)

Matrix treadles have `matches` patterns and run automatically when the generator matrix matches:

```typescript
// loom/treadles/my-generator.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';

const myTreadle = defineTreadle({
  // When does this run? (matches spiral patterns)
  matches: [{ current: 'MySpiraler', previous: 'RustCore' }],

  // Which methods to include?
  methods: {
    filter: 'platform',  // 'core' | 'platform' | 'front'
    pipeline: [addManagementPrefix()]  // Transforms method names
  },

  // What files to generate?
  outputs: [
    {
      template: 'my/service.rs.ejs',
      path: 'src/service.rs',
      language: 'rust'
    }
  ],

  // Optional: Modify existing files (idempotent blocks)
  patches: [
    {
      type: 'ensureBlock',
      targetFile: 'Cargo.toml',
      marker: 'my-deps',
      template: 'my/cargo-deps.ejs',
      language: 'toml'
    }
  ],

  hookup: { type: 'none' }
});

export default generateFromTreadle(myTreadle);
```

> 🎛️ **Matrix Matching**: The `matches` pattern is looked up in the generator matrix. When the heddles see `MySpiraler` wrapping `RustCore`, this treadle's generator runs.

---

### Phase Order & Data Flow

Treadles execute in three phases, each with access to progressively more context:

```
Phase 1: File Generation → spire/
   ↓  methods available via context.methods
Phase 2: Patching → Any file (including spire/ files)
   ↓  same methods + generated file info
Phase 3: Hookup → Custom logic
```

```typescript
defineTreadle({
  // Phase 1: Generate files
  outputs: [
    // Static output (always generated)
    { template: 'base.rs.ejs', path: 'src/base.rs', language: 'rust' },
    
    // Dynamic output (conditional on methods)
    (ctx) => {
      const creates = ctx.methods?.creates || [];
      if (creates.length > 0) {
        return {
          template: 'commands.rs.ejs',
          path: 'src/commands.rs',
          language: 'rust'
        };
      }
    }
  ],
  
  // Phase 2: Modify files (runs after outputs)
  patches: [
    // Static patch
    { type: 'ensureBlock', targetFile: 'Cargo.toml', ... },
    
    // Dynamic patches (one per method!)
    (ctx) => {
      return ctx.methods?.creates.map(method => ({
        type: 'ensureBlock' as const,
        targetFile: 'src/lib.rs',
        marker: `cmd-${method.name}`,
        template: 'tauri/command.rs.ejs',
        language: 'rust'
      })) || [];
    }
  ],
  
  // Phase 3: Custom logic (runs last)
  hookup: {
    type: 'custom',
    customHookup: async (context, files, data) => {
      console.log(`Generated ${files.length} files`);
    }
  }
});
```

> 🧵 **Methods Flow**: Methods are collected from managements, filtered by `filter`, transformed by `pipeline`, then made available as `context.methods`. All function forms receive this populated context.

---

### Method Helpers (Dynamic Generation)

When you use function forms for `outputs` or `patches`, you receive `context.methods` with powerful helpers:

```typescript
// Available on context.methods:

ctx.methods.all                    // All methods after pipeline
ctx.methods.byManagement()         // Map<string, RawMethod[]>
ctx.methods.byCrud()               // Map<string, RawMethod[]>
ctx.methods.withTag('auth:required')
ctx.methods.withCrud('create')

// Convenience getters (pre-filtered)
ctx.methods.creates   // All create methods
ctx.methods.reads     // All read methods
ctx.methods.updates   // All update methods
ctx.methods.deletes   // All delete methods
ctx.methods.lists     // All list methods

// Iteration helpers
ctx.methods.forEach(m => { ... })
ctx.methods.filteredForEach(
  m => m.crudOperation === 'create',
  m => { ... }
)
```

---

### Per-Output Context (Entity-Specific Generation)

Generate multiple files with entity-specific data using the `context` field:

```typescript
outputs: [(ctx) => {
  const config = ctx.config as { entities: string[] };
  const outputs = [];
  
  for (const entity of config.entities) {
    outputs.push({
      template: 'tauri/commands.ts.ejs',
      path: `src/tauri/commands/${entity.toLowerCase()}.commands.ts`,
      language: 'typescript',
      // Per-output context merged with main template data
      context: {
        entity: {
          name: entity,
          pascal: toPascal(entity),
          lower: entity.toLowerCase()
        }
      }
    });
  }
  
  return outputs;
}]
```

The template receives merged data (main data + per-output context):

```ejs
// tauri/commands.ts.ejs
export class <%= entity.pascal %>Commands {
  async getById(id: number): Promise<<%= entity.pascal %>> {
    // Implementation...
  }
}
```

> 📦 **Context Merging**: Per-output `context` is merged with main `data`. Context values take precedence. Use this for per-entity files where each needs different entity data.

---

### Advanced: Per-Management Files

Generate one output file per management:

```typescript
outputs: [
  // Static base file
  { template: 'base.rs.ejs', path: 'src/lib.rs', language: 'rust' },
  
  // Dynamic: one file per management
  (ctx) => {
    const specs = [];
    
    ctx.methods?.byManagement().forEach((methods, mgmtName) => {
      const creates = methods.filter(m => m.crudOperation === 'create');
      
      if (creates.length > 0) {
        specs.push({
          template: 'management_commands.rs.ejs',
          path: `src/${snakeCase(mgmtName)}_commands.rs`,
          language: 'rust',
          context: { managementName: mgmtName, methods: creates }
        });
      }
    });
    
    return specs;
  }
]
```

---

### The Patches System

Patches modify existing files using idempotent marker blocks:

```typescript
patches: [
  // Static patch (always applied)
  {
    type: 'ensureBlock',
    targetFile: 'Cargo.toml',
    marker: 'spire-deps',
    template: 'cargo/deps.ejs',
    language: 'toml',
    position: { after: '[dependencies]' }
  },
  
  // Dynamic patch (conditional)
  (ctx) => {
    if (ctx.methods?.creates.length === 0) return undefined;
    
    return {
      type: 'ensureBlock',
      targetFile: 'src/lib.rs',
      marker: 'commands-mod',
      template: 'commands_mod.rs.ejs',
      language: 'rust'
    };
  },
  
  // Multiple patches from array
  (ctx) => {
    return ctx.methods?.all.map(method => ({
      type: 'ensureBlock' as const,
      targetFile: 'src/handlers.rs',
      marker: `handler-${method.name}`,
      template: 'handler.rs.ejs',
      language: 'rust',
      position: { after: '// HANDLERS' }
    })) || [];
  }
]
```

**How patches work:**
- Creates marked block: `# SPIRE-LOOM:TREADLE-NAME:MARKER ... # /SPIRE-LOOM:TREADLE-NAME:MARKER`
- If block exists → update it
- If not → insert at `position` (or append if no position)
- Markers scoped by treadle name automatically

> 🏷️ **Marker Scope**: The marker scope is the treadle name (from `defineTreadle({ name: '...' })`). This prevents collisions between treadles patching the same file.

---

### Template Data & Method Integration

Provide data for templates, including method-derived data:

```typescript
defineTreadle({
  data: (context, current, previous) => {
    const core = previous.ring as RustCore;
    const metadata = core.getMetadata();
    
    return {
      coreName: metadata.packageName,
      coreNamePascal: pascalCase(metadata.packageName),
      
      commands: context.methods?.creates.map(m => ({
        name: m.name,
        snakeName: m.name.replace(/([A-Z])/g, '_$1').toLowerCase(),
        params: m.params
      })),
      
      byManagement: Object.fromEntries(
        context.methods?.byManagement() || new Map()
      ),
      
      allMethods: context.methods?.all
    };
  },
  
  outputs: [{ template: 'service.rs.ejs', path: 'src/service.rs', language: 'rust' }]
});
```

---

### Template Lookup Order

Templates are resolved in this order:

1. **Workspace templates** - `{workspaceRoot}/loom/bobbin/{template}`
2. **Builtin templates** - `machinery/bobbin/{template}`

Override builtin templates by placing your own in `loom/bobbin/`:

```
my-project/
  loom/
    WARP.ts
    bobbin/
      tauri/
        commands.ts.ejs    ← Overrides builtin
      kysely/
        adaptor.ts.ejs     ← Custom template
  src/
  ...
```

> 🎨 **Workspace First**: Place custom templates in `loom/bobbin/` to override builtins or add project-specific generators.

---

### User Treadles Location

User treadles are auto-discovered from `o19/loom/treadles/`:

```
o19/loom/treadles/
  kysely-adaptor.ts      # Kysely adaptor generator
  tauri-adaptor.ts       # Tauri command generator
  ...
```

Import them in WARP.ts:

```typescript
import { kyselyAdaptorTreadle } from '@o19/spire-loom/loom/treadles/kysely-adaptor.js';
import { tauriAdaptorTreadle } from '@o19/spire-loom/loom/treadles/tauri-adaptor.js';
```

---

## Complete Working Examples

### Tieup Treadle Example

```typescript
// o19/loom/treadles/kysely-adaptor.ts
import {
  defineTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';

interface Config {
  entities: string[];
  operations: ('create' | 'read' | 'update' | 'delete' | 'list')[];
}

function toPascal(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const kyselyAdaptorTreadle = defineTreadle({
  name: 'kysely-adaptor',
  
  // No matches - this is a tieup treadle
  methods: { filter: 'front', pipeline: [] },
  
  // Dynamic outputs - one per entity
  outputs: [(ctx) => {
    const config = ctx.config as Config | undefined;
    if (!config?.entities) return [];
    
    const outputs: OutputSpec[] = [];
    
    // One adaptor file per entity
    for (const entity of config.entities) {
      outputs.push({
        template: 'kysely/adaptor.ts.ejs',
        path: `src/adaptors/gen/${entity.toLowerCase()}.adaptor.gen.ts`,
        language: 'typescript',
        context: {
          entity: {
            name: entity,
            pascal: toPascal(entity),
            lower: entity.toLowerCase()
          },
          operations: config.operations || []
        }
      });
    }
    
    // Index file
    outputs.push({
      template: 'kysely/index.ts.ejs',
      path: 'src/adaptors/gen/index.gen.ts',
      language: 'typescript',
      context: {
        entities: config.entities.map(e => ({
          name: e,
          pascal: toPascal(e),
          lower: e.toLowerCase()
        }))
      }
    });
    
    return outputs;
  }],
  
  data: (ctx) => {
    const config = ctx.config as Config | undefined;
    return {
      entities: config?.entities || [],
      operations: config?.operations || []
    };
  }
});

export const generateKyselyAdaptors = generateFromTreadle(kyselyAdaptorTreadle);
```

### Matrix Treadle Example

```typescript
// loom/treadles/gen-tauri-commands.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';

const tauriCommandsTreadle = defineTreadle({
  name: 'tauriCommands',
  
  matches: [{ current: 'TauriSpiraler.plugin', previous: 'RustCore' }],
  
  validate: (current, previous) => {
    return previous.ring instanceof RustCore;
  },
  
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },
  
  data: (context, _current, previous) => {
    const core = previous.ring as RustCore;
    return {
      coreName: core.getMetadata().packageName,
      commands: context.methods?.creates,
      queries: [...(context.methods?.reads || []), ...(context.methods?.lists || [])],
      hasCommands: (context.methods?.creates.length || 0) > 0
    };
  },
  
  outputs: [
    { template: 'tauri/lib.rs.ejs', path: 'src/lib.rs', language: 'rust' },
    
    (ctx) => {
      if ((ctx.methods?.creates.length || 0) > 0) {
        return { template: 'tauri/commands.rs.ejs', path: 'src/commands.rs', language: 'rust' };
      }
    },
    
    { template: 'tauri/models.rs.ejs', path: 'src/models.rs', language: 'rust' }
  ],
  
  patches: [
    (ctx) => {
      return ctx.methods?.creates.map(method => ({
        type: 'ensureBlock' as const,
        targetFile: 'src/lib.rs',
        marker: `cmd-${method.name}`,
        template: 'tauri/command_reg.rs.ejs',
        language: 'rust',
        position: { after: '// COMMANDS' }
      })) || [];
    }
  ],
  
  hookup: { type: 'none' }
});

export default generateFromTreadle(tauriCommandsTreadle);
```

---

## Key Principles

1. **WARP.ts is executable** - It runs to build the spiral graph. The decorators attach metadata at runtime.

2. **Managements are imprints** - They define interfaces, not implementations. The `throw new Error('Imprint only')` bodies are never called; they're read by the loom.

3. **Struct fields are accessed via `core`** - `foundframe.inner.core.thestream`. The `@loom.link()` decorator points to these paths.

4. **Methods flow through the spiral** - Methods are collected from inner rings, filtered by reach, transformed by pipelines, and made available as `context.methods`.

5. **The loom generates into `spire/`** - Generated code is isolated from hand-written code. The `spire/` directory is auto-hooked into the package.

6. **Use `loom.*` namespace** - Import `loom` once, access all decorators through it: `@loom.rust.Struct`, `@loom.crud('create')`, etc.

7. **Tieup treadles for extensions** - Use `.tieup()` to attach treadles without matrix matching. Pass configuration via `warpData`.

8. **Workspace templates override builtins** - Place custom templates in `loom/bobbin/` to override or extend.

9. **User treadles in `o19/loom/treadles/`** - Shared treadles live here and are auto-discovered.

10. **Per-output context for entity files** - Use `context` field in OutputSpec to pass entity-specific data to templates.

11. **Sley for method processing** - Use MethodPipeline and sley utilities for transforming and filtering methods before generation.

12. **Bobbin for type mapping** - Convert types between platforms using bobbin utilities.

---

*See also: [DEV.md](DEV.md) for development details • [GLOSSARY.md](GLOSSARY.md) for terminology*

> 🌀 *"The warp is your intention; the loom makes it real."*
