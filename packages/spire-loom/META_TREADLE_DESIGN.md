# Meta-Treadle Design: A Generator for Generators

> *"The loom weaves itself, thread by thread."*

## Current Architecture Analysis

### Dependency Tree Analysis

```
Treadle Generator (e.g., android-generator.ts)
├── imports from heddles/
│   ├── SpiralNode, GeneratedFile, GeneratorContext (types)
│   ├── ensurePlanComplete (guard function)
│   └── GeneratorMatrix (via index.ts)
│
├── imports from warp/
│   ├── AndroidSpiraler (specific spiraler class)
│   ├── RustCore (specific core class)
│   └── SpiralMux (for tauri-generator)
│
├── imports from reed/
│   ├── filterByReach (function)
│   └── ManagementMetadata (type)
│
├── imports from sley/
│   ├── MethodPipeline, addManagementPrefix (pipeline)
│   ├── fromSourceMethods, toSnakeCase (utilities)
│   └── MgmtMethod (type)
│
├── imports from bobbin/
│   ├── generateCode (core generation API)
│   └── RawMethod (type)
│
└── imports from shuttle/
    ├── ensureXmlBlock (config management)
    ├── configureAndroidGradle (gradle integration)
    ├── hookupRustCrate, hookupTauriPlugin (hookup)
    └── configureSpireCargo (cargo management)
```

### Key Observations

#### 1. **Treadle Structure Pattern**

Every treadle follows this structure:

```typescript
// 1. Imports (many dependencies)
import { ... } from '../heddles/index.js';
import { SpecificSpiraler } from '../../warp/spiral/spiralers/xxx.js';
// ... many more

// 2. Options interface (treadle-specific)
export interface XXXGenerationOptions { ... }

// 3. Main generator function (common signature)
export async function generateXXXService(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> { ... }

// 4. Helper functions (convert methods, collect, etc.)
function toRawMethod(method: MgmtMethod): RawMethod { ... }
function collectManagementMethods(...): RawMethod[] { ... }
```

#### 2. **The Generator Function Contract**

```typescript
type GeneratorFunction = (
  current: SpiralNode,      // The outer ring (e.g., AndroidSpiraler)
  previous: SpiralNode,      // The inner ring (e.g., RustCore)
  context?: GeneratorContext // Has plan + workspaceRoot + outputDir
) => Promise<GeneratedFile[]>;
```

#### 3. **Current Pain Points**

**A. Tight Coupling to Specific Spiralers**
```typescript
// android-generator.ts
import { AndroidSpiraler } from '../../warp/spiral/spiralers/android.js';
import { RustCore } from '../../warp/spiral/index.js';

// In the function:
if (!(current.ring instanceof AndroidSpiraler)) return [];
if (!(previous.ring instanceof RustCore)) throw ...;
```

Every treadle is hardcoded to specific spiraler classes. To create a new treadle, you need to:
1. Create a new spiraler class in `warp/spiral/spiralers/`
2. Import it in the treadle
3. Use `instanceof` checks

**B. Boilerplate Method Pipeline Setup**
```typescript
// Repeated in every treadle
const pipeline = new MethodPipeline().translate(addManagementPrefix());
const sourceMethods = fromSourceMethods(mgmt.name, mgmt.methods);
const processedMethods = pipeline.process(sourceMethods);
// ... convert to RawMethod
```

**C. Template Paths Are Hardcoded**
```typescript
generateCode({
  template: 'android/service.kt.ejs',  // Magic string
  outputPath: path.join(packageDir, 'spire', 'android', ...),
  // ...
})
```

**D. Hookup Logic Is Platform-Specific**
```typescript
// Android: XML blocks + Gradle
ensureXmlBlock(manifestPath, { ... });
configureAndroidGradle(gradlePath, { ... });

// Tauri: Rust crate hookup
hookupRustCrate(resolvedPackageDir, 'spire');
hookupTauriPlugin({ libRsPath, ... });
configureSpireCargo({ cratePath, ... });
```

**E. Matrix Registration Is Separate**
```typescript
// In treadles/index.ts
matrix.setPair('AndroidSpiraler', 'RustCore', generateAndroidService);
```

The generator function and its matrix registration are in different files.

---

## Proposed Architecture: The Meta-Treadle

### Core Idea

Instead of writing treadles by hand, describe them declaratively:

```typescript
// loom/machinery/my-treadle.ts
import { defineTreadle } from '@o19/spire-loom/machinery/meta-treadle';

export default defineTreadle({
  // 1. What spiralers does this handle?
  matches: [
    { current: 'MySpiraler', previous: 'RustCore' }
  ],
  
  // 2. What methods do we include?
  methods: {
    filter: 'platform',  // 'private' | 'platform' | 'front' | ['create', 'read']
    pipeline: ['addManagementPrefix']  // Built-in transforms
  },
  
  // 3. What files do we generate?
  outputs: [
    {
      template: 'my-platform/service.ts.ejs',
      path: '{packageDir}/spire/{name}.ts',
      language: 'typescript'
    },
    {
      template: 'my-platform/bridge.rs.ejs', 
      path: '{packageDir}/spire/src/bridge.rs',
      language: 'rust_jni'
    }
  ],
  
  // 4. How do we hook up to the package?
  hookup: {
    type: 'rust-crate',  // 'rust-crate' | 'tauri-plugin' | 'npm-package' | custom
    config: { moduleName: 'spire' }
  }
});
```

### The Meta-Treadle API

```typescript
// machinery/meta-treadle/index.ts

export interface TreadleDefinition {
  /** Matrix match patterns */
  matches: Array<{
    current: string;   // Spiraler class name (e.g., 'AndroidSpiraler')
    previous: string;  // Inner ring class name (e.g., 'RustCore')
  }>;
  
  /** Method filtering and transformation */
  methods?: {
    /** Filter by reach level(s) */
    filter?: 'private' | 'platform' | 'front' | string[];
    /** Pipeline transformations to apply */
    pipeline?: Array<'addManagementPrefix' | 'crudInterfaceMapping' | string>;
    /** Custom filter function (advanced) */
    customFilter?: (method: MgmtMethod) => boolean;
  };
  
  /** Output file specifications */
  outputs: Array<{
    /** Template path (relative to templates/ or absolute) */
    template: string;
    /** Output path template (supports {placeholders}) */
    path: string;
    /** Target language for method transformation */
    language: 'kotlin' | 'rust' | 'rust_jni' | 'aidl' | 'typescript';
    /** Condition for generating this file (optional) */
    condition?: (context: GeneratorContext) => boolean;
  }>;
  
  /** Package hookup configuration */
  hookup?: {
    type: 'rust-crate' | 'tauri-plugin' | 'npm-package' | 'android-gradle' | 'custom';
    config?: Record<string, unknown>;
    /** Custom hookup function (for 'custom' type) */
    customHookup?: (context: GeneratorContext, files: GeneratedFile[]) => void;
  };
  
  /** Template data beyond methods */
  data?: Record<string, unknown> | ((context: GeneratorContext) => Record<string, unknown>);
}

export function defineTreadle(def: TreadleDefinition): TreadleDefinition {
  return def;
}

export function generateFromTreadle(
  definition: TreadleDefinition
): GeneratorFunction {
  return async (current, previous, context) => {
    // 1. Validate match
    // 2. Collect & filter methods
    // 3. Apply pipeline
    // 4. Generate each output
    // 5. Run hookup
  };
}
```

### Auto-Discovery System

Instead of manually registering in `treadles/index.ts`:

```typescript
// machinery/meta-treadle/discovery.ts

export async function discoverTreadles(
  searchPath: string = './loom/machinery'
): Promise<Array<{ name: string; definition: TreadleDefinition }>> {
  // Scan for files matching *.treadle.ts or */treadle.ts
  // Import and collect definitions
}

// In weaver.ts
import { discoverTreadles, generateFromTreadle } from './meta-treadle/index.js';

export async function createAutoMatrix(): Promise<GeneratorMatrix> {
  const matrix = new GeneratorMatrix();
  const treadles = await discoverTreadles();
  
  for (const { name, definition } of treadles) {
    const generator = generateFromTreadle(definition);
    
    for (const match of definition.matches) {
      matrix.setPair(match.current, match.previous, generator);
    }
  }
  
  return matrix;
}
```

### Benefits

1. **Declarative**: Describe WHAT, not HOW
2. **Type-Safe**: Full TypeScript inference
3. **Composable**: Mix and match pipeline stages
4. **Auto-Discovered**: No manual registration
5. **Extensible**: Custom hookups, conditions, transforms
6. **Testable**: Pure definitions, testable in isolation

---

## Alternative: The "Treadle Kit" Approach

Instead of a fully declarative API, provide a toolkit for building treadles:

```typescript
// machinery/treadle-kit/index.ts

export interface TreadleKit {
  /** Validate node types */
  validateNodes(
    current: SpiralNode,
    previous: SpiralNode,
    expected: { current: string; previous: string }
  ): boolean;
  
  /** Collect methods with filtering */
  collectMethods(
    plan: WeavingPlan,
    options: {
      reach?: 'private' | 'platform' | 'front';
      pipeline?: MethodPipeline;
    }
  ): RawMethod[];
  
  /** Generate files from templates */
  generateFiles(
    templates: Array<{
      template: string;
      outputPath: string;
      language: Language;
    }>,
    data: Record<string, unknown>,
    methods: RawMethod[]
  ): Promise<GeneratedFile[]>;
  
  /** Standard hookups */
  hookup: {
    rustCrate(packageDir: string, moduleName: string): void;
    tauriPlugin(options: TauriHookupOptions): void;
    androidGradle(options: AndroidGradleOptions): void;
  };
}

// Usage in custom treadle:
import { createTreadleKit } from '../treadle-kit/index.js';

export async function generateMyService(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> {
  const kit = createTreadleKit(context);
  
  // 1. Validate
  if (!kit.validateNodes(current, previous, { 
    current: 'MySpiraler', 
    previous: 'RustCore' 
  })) {
    return [];
  }
  
  // 2. Collect methods
  const methods = kit.collectMethods(context.plan, {
    reach: 'platform',
    pipeline: new MethodPipeline().translate(addManagementPrefix())
  });
  
  // 3. Generate
  const files = await kit.generateFiles([
    { template: 'my/service.ts.ejs', outputPath: '...', language: 'typescript' }
  ], data, methods);
  
  // 4. Hookup
  kit.hookup.rustCrate(packageDir, 'spire');
  
  return files;
}
```

---

## Recommendation: Hybrid Approach

I recommend a **hybrid** that combines both approaches:

### Layer 1: Treadle Kit (Foundation)
Low-level utilities for building treadles. Always available.

### Layer 2: Declarative API (Common Cases)
For 80% of use cases where you just need:
- Match pattern
- Method filtering
- Template → Output mapping
- Standard hookup

### Layer 3: Full Custom (Escape Hatch)
For complex cases, write raw generator functions using the kit.

```typescript
// machinery/meta-treadle/index.ts
export { defineTreadle, generateFromTreadle } from './declarative.js';
export { createTreadleKit } from './kit.js';
export { discoverTreadles } from './discovery.js';
```

---

## Implementation Phases

### Phase 1: Treadle Kit
Extract common utilities from existing treadles:
- `validateNodes()`
- `collectMethods()`
- `generateFiles()`
- Standard hookup functions

### Phase 2: Declarative API
Build `defineTreadle()` on top of the kit.

### Phase 3: Auto-Discovery
Add scanning for `*.treadle.ts` files.

### Phase 4: Meta-Generator
Create a treadle that generates treadle boilerplate:

```bash
# Generate a new treadle scaffold
spire-loom --generate-treadle my-platform

# Creates:
# loom/machinery/my-platform/
#   ├── my-platform.treadle.ts
#   └── templates/
#       └── service.ts.ejs
```

---

## Open Questions

1. **Template Location**: Should custom treadles use spire-loom's template directory or their own?
2. **Pipeline Extensibility**: How do users register custom pipeline transformations?
3. **Hookup Plugins**: Should hookup be pluggable (like `vite` plugins)?
4. **Testing**: How do we test generated treadles?
5. **Documentation**: Auto-generate docs from treadle definitions?

---

*The loom that weaves looms must itself be woven.* 🧵
