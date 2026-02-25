# The Treadles 👣

> *"The weaver dances, and the loom sings."*
> *"Even this dance has its patterns."*

The [treadles](../) are the foot pedals that control the loom. Each pedal lifts a different combination of heddles, creating different patterns. In our machinery, they are the **generation phases**—pedals for Core, Platform, DDD, and more.

## The Pedal Arrangement

| Pedal | Phase | Generates |
|-------|-------|-----------|
| 🥁 | `core-generator.ts` | Rust traits, domain types |
| 🎸 | `platform-generator.ts` | Android services, Desktop direct |
| 🎹 | `tauri-generator.ts` | Commands, permissions, platform traits |
| 🎺 | `ddd-generator.ts` | TypeScript domain types, Port interfaces |
| 🎻 | `adaptor-generator.ts` | Drizzle ORM implementations |

## The Weaver's Dance

The weaver doesn't press all pedals at once—they dance through them in order:

```
Core → Platform → Tauri → DDD → Adaptors
```

Each phase prepares the ground for the next. Each [treadle](.) lifts the right threads for its pattern.

---

## The Declarative Layer

> *"The loom learns new patterns without forgetting the old."*

Spire-loom offers **two ways** to write treadles:

### 1. Imperative Style (The Original Way)

Write a generator function directly:

```typescript
export async function generateAndroidService(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> {
  // Validation
  // Method collection
  // File generation
  // Package hookup
  return files;
}
```

**Best for**: Complex, one-off generators with unique logic.

### 2. Declarative Style (The Structured Way)

Define your treadle as configuration:

```typescript
export const androidServiceTreadle = defineTreadle({
  matches: [{ current: 'RustAndroidSpiraler', previous: 'RustCore' }],
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix]
  },
  outputs: [
    { template: 'android/service.kt.ejs', path: '{packageDir}/spire/...', language: 'kotlin' }
  ],
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) { /* manifest/gradle */ }
  }
});

// Register it
export const generateAndroidService = generateFromTreadle(androidServiceTreadle);
```

**Best for**: Standard generators that follow common patterns.

---

## Three Layers of Abstraction

Spire-loom provides **three layers** for building treadles:

### Layer 1: The Treadle Kit (Foundation)

Low-level utilities for building treadles. Always available, directly usable.

```typescript
import { createTreadleKit } from '@o19/spire-loom/machinery/treadle-kit';

const kit = createTreadleKit(context);

// Validate
if (!kit.validateNodes(current, previous, { current: 'MySpiraler', previous: 'RustCore' })) {
  return [];
}

// Collect methods
const methods = kit.collectMethods({
  filter: 'platform',
  pipeline: [addManagementPrefix]
});

// Generate files
const files = await kit.generateFiles([
  { template: 'my/service.ts.ejs', path: '...', language: 'typescript' }
], data, methods);

// Hookup
await kit.hookup.android(androidData);
```

### Layer 2: Declarative API (Common Cases)

For 80% of use cases where you just need configuration:

```typescript
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const myTreadle = defineTreadle({
  matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
  methods: { filter: 'platform', pipeline: [addManagementPrefix] },
  outputs: [{ template: '...', path: '...', language: 'typescript' }],
  hookup: { type: 'custom', customHookup: async (...) => { ... } }
});
```

### Layer 3: Platform Wrapper (High-Level Abstraction)

For platform wrappers that follow the common pattern:

```typescript
import { definePlatformWrapperTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const genMyPlatform = definePlatformWrapperTreadle({
  platform: { name: 'MyPlatform', spiraler: 'MySpiraler' },
  wrapperType: 'service',
  methods: { filter: 'platform', pipeline: [] },
  naming: (core, affix) => ({ wrapperName: `${core}Service` }),
  outputs: [{ template: '...', file: '...', language: 'typescript' }],
  hookup: 'rust-crate'
});
```

---

## Custom Treadles

Place custom treadles in `{workspace}/loom/treadles/*.ts`:

```typescript
// loom/treadles/gen-esp32-service.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';

const esp32Treadle = defineTreadle({
  matches: [{ current: 'ESP32Spiraler', previous: 'RustCore' }],
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },
  outputs: [
    { 
      template: 'esp32/service.cpp.ejs', 
      path: '{packageDir}/spire/service.cpp', 
      language: 'cpp' 
    }
  ],
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) {
      // Platform-specific integration
    }
  }
});

export default generateFromTreadle(esp32Treadle);
```

The treadle will be auto-discovered and registered in the generator matrix.

---

## Spiraler Extensions

> *"Treadles can extend spiralers, adding new methods to the WARP DSL."*

Treadles don't just generate code—they can **extend the spiraler API** itself. This enables:

- **Type-safe contributions**: TypeScript knows about new methods
- **Modular extensions**: Add methods without modifying core spiralers
- **Clear contracts**: Treadles declare what they contribute

### How It Works

The **tie-up** layer (`machinery/tieups/spiral.ts`) connects treadles to spiralers:

```
Treadle (gen-android-foreground-service)
    │
    ├── defines: matches (RustAndroidSpiraler, RustCore)
    ├── defines: outputs (service.kt, aidl, jni)
    └── contributes: foregroundService() method → RustAndroidSpiraler
                             │
                             ▼
                    Tie-Up Layer (machinery/tieups/spiral.ts)
                             │
                             ▼
                    RustAndroidSpiraler gains foregroundService() method
                             │
                             ▼
                    TypeScript knows the method exists!
```

### Declaring Contributions

Treadles export a `contributes` object to declare API extensions:

```typescript
// loom/treadles/gen-android-foreground-service.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
import { defineSpiralerContribution } from '@o19/spire-loom/machinery/tieups/spiral';

const treadle = defineTreadle({...});

export const contributes = defineSpiralerContribution({
  spiraler: 'RustAndroidSpiraler',
  method: 'foregroundService',
  optionsType: 'ForegroundServiceOptions',
  returnType: 'RustAndroidSpiraler',
  description: 'Wrap the core with an Android foreground service'
});

export default generateFromTreadle(treadle);
```

### Type Augmentation

For TypeScript to know about contributed methods, add declaration merging:

```typescript
// In your treadle file
import '@o19/spire-loom/machinery/tieups/spiral';

declare module '@o19/spire-loom/machinery/tieups/spiral' {
  interface SpiralerExtensionRegistry {
    RustAndroidSpiraler: {
      foregroundService(options?: ForegroundServiceOptions): RustAndroidSpiraler;
    };
  }
}
```

### Full Example

```typescript
// loom/treadles/gen-my-platform.ts
import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
import { defineSpiralerContribution } from '@o19/spire-loom/machinery/tieups/spiral';

// The treadle definition
const myTreadle = defineTreadle({
  matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
  methods: { filter: 'platform', pipeline: [] },
  outputs: [{ template: 'my/service.ts.ejs', path: '...', language: 'typescript' }],
  hookup: { type: 'custom', customHookup: async (...) => { ... } }
});

// The API contribution
export const contributes = defineSpiralerContribution({
  spiraler: 'MySpiraler',
  method: 'myService',
  optionsType: 'MyServiceOptions',
  returnType: 'MySpiraler'
});

// Type augmentation
declare module '@o19/spire-loom/machinery/tieups/spiral' {
  interface SpiralerExtensionRegistry {
    MySpiraler: {
      myService(options?: MyServiceOptions): MySpiraler;
    };
  }
}

export default generateFromTreadle(myTreadle);
```

Now users can write:

```typescript
// loom/WARP.ts
const myPlatform = foundframe.myPlatform.myService({ ... });
// TypeScript knows myService() exists!
```

### See Also

For the full tie-up API and runtime contribution collection, see [machinery/tieups/README.md](../tieups/README.md).

---

## Anatomy of a Declarative Treadle

```typescript
import { defineTreadle, generateFromTreadle } from './declarative-api.js';
import { addManagementPrefix } from '../sley/index.js';

export const myTreadle = defineTreadle({
  // -------------------------------------------------------------------------
  // 1. MATCH PATTERN
  // -------------------------------------------------------------------------
  // When does this treadle run? The matrix uses these to route.
  matches: [
    { current: 'RustAndroidSpiraler', previous: 'RustCore' }
  ],

  // -------------------------------------------------------------------------
  // 2. VALIDATION (optional)
  // -------------------------------------------------------------------------
  // Extra checks beyond the match pattern. Return false to skip silently.
  validate: (current, previous) => {
    if (!(current.ring instanceof RustAndroidSpiraler)) return false;
    return true;
  },

  // -------------------------------------------------------------------------
  // 3. METHODS
  // -------------------------------------------------------------------------
  // Filter by reach and apply transformations.
  // Import transforms directly from '../sley/index.js'—no string magic.
  methods: {
    filter: 'platform',  // 'core' | 'platform' | 'front'
    pipeline: [addManagementPrefix]
  },

  // -------------------------------------------------------------------------
  // 4. METHOD TRANSFORMATION (optional)
  // -------------------------------------------------------------------------
  // Transform methods after pipeline but before generation.
  // Use this for platform-specific method augmentation (e.g., adding link metadata).
  transformMethods: (methods, context) => {
    return methods.map(m => ({ ...m, link: computeLink(m) }));
  },

  // -------------------------------------------------------------------------
  // 5. DATA
  // -------------------------------------------------------------------------
  // Template data beyond methods. Can be static or computed.
  data: (context, current, previous) => {
    const android = current.ring as RustAndroidSpiraler;
    return {
      packageName: android.getGradleNamespace('foundframe'),
      serviceName: 'FoundframeService'
    };
  },

  // -------------------------------------------------------------------------
  // 6. OUTPUTS
  // -------------------------------------------------------------------------
  // What files to generate. Language is auto-detected for method transformation.
  outputs: [
    {
      template: 'android/service.kt.ejs',
      path: '{packageDir}/spire/{serviceName}.kt',
      language: 'kotlin'
    },
    {
      template: 'android/bridge.rs.ejs',
      path: '{packageDir}/spire/src/bridge.rs',
      language: 'rust_jni',
      condition: (context) => /* optional conditional generation */
    }
  ],

  // -------------------------------------------------------------------------
  // 7. HOOKUP
  // -------------------------------------------------------------------------
  // Integrate generated code with the package.
  // Use built-in types for standard patterns, 'custom' for platform-specific logic.
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) {
      // AndroidManifest.xml entries, Gradle config, etc.
    }
  }
});

// Export for registration
export const generateMyService = generateFromTreadle(myTreadle);
```

---

## The Meta-Path

> *"The loom that weaves looms must itself be woven."*

The declarative API exists in `machinery/treadle-kit/declarative.ts`. It is itself a treadle—one that generates generator functions. When you call `generateFromTreadle()`, you're using the loom to weave a pedal.

### Creating New Treadles

> *"The treadle is glue; the helpers are the craft."*

After the thin-rewrite, treadles follow this structure:

```
android-generator.ts          # 160 lines - Pure glue!
├── imports from helpers
├── defineTreadle({ ... })    # The declarative configuration
└── export const generateAndroidService

treadle-helpers.ts            # 180 lines - Shared utilities
├── String utilities (pascalCase, toSnakeCase)
├── Method transformations
└── Data builders

android-helpers.ts            # 200 lines - Android-specific
├── configureAndroidManifest()
├── generateEventCallbackAidl()
└── executeAndroidHookup()    # Complete hookup implementation
```

**The rule**: Keep treadle definitions under 200 lines. Extract helpers when they grow beyond that. The treadle itself should be **glue**—importing, configuring, and exporting.

---

*Part of the [machinery](../). Preceded by the [beater](../beater/) (formatting), followed by the [sley](../sley/) (binding resolution).*

> *"The weaver dances, the loom sings, the pattern conserves."* 🧵
