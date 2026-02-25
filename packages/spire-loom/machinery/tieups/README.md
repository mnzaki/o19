# The Tie-Up 🔗

> *"The treadle presses, the tie-up lifts, the pattern emerges."*

The **tie-up** is the linkage layer between [treadles](../treadles/) and [spiralers](../../warp/spiral/spiralers/). It is the cord configuration that connects each treadle to specific spiralers, enabling treadles to extend the spiraler API.

## What Is the Tie-Up?

In traditional weaving, the **tie-up** determines which warp threads lift when a treadle is pressed. In spire-loom, it determines:

- Which **methods** treadles add to spiralers
- How **TypeScript** knows about those methods
- How the **runtime** connects everything

```
WARP.ts                        Treadle                     Spiraler
   │                              │                            │
   │  android.foregroundService() │                            │
   │           │                  │                            │
   │           └─────────────────►│  defineSpiralerContribution  │
   │                              │         ({                  │
   │                              │           spiraler: '...',   │
   │                              │           method: '...'      │
   │                              │         })                   │
   │                              │                            │
   │                              └────────────────────────────►│
   │                                                           │
   │◄──────────────────────────────────────────────────────────┘
   │              TypeScript now knows
   │              about foregroundService()
```

## The Tie-Up Flow

### 1. Treadle Declares Contribution

```typescript
// loom/treadles/gen-android-foreground-service.ts
export const contributes = defineSpiralerContribution({
  spiraler: 'RustAndroidSpiraler',
  method: 'foregroundService',
  optionsType: 'ForegroundServiceOptions',
  returnType: 'RustAndroidSpiraler'
});
```

### 2. Discovery Collects Contributions

```typescript
// During loom initialization
const discovered = await discoverTreadles('./loom/treadles');
const contributions = collectSpiralerContributions(discovered);
// Map: 'RustAndroidSpiraler' → [{ method: 'foregroundService', ... }]
```

### 3. TypeScript Knows

```typescript
// Type augmentation in treadle file
declare module '@o19/spire-loom/machinery/tieups/spiral' {
  interface SpiralerExtensionRegistry {
    RustAndroidSpiraler: {
      foregroundService(options?: ForegroundServiceOptions): RustAndroidSpiraler;
    };
  }
}
```

### 4. User Calls the Method

```typescript
// loom/WARP.ts
const android = foundframe.android.foregroundService({ ... });
// TypeScript validates this call! ✅
```

## API Reference

### `defineSpiralerContribution(contribution)`

Define a method contribution to a spiraler.

```typescript
import { defineSpiralerContribution } from '@o19/spire-loom/machinery/tieups/spiral';

export const contributes = defineSpiralerContribution({
  // The spiraler class name being extended
  spiraler: 'RustAndroidSpiraler',
  
  // The method name being contributed
  method: 'foregroundService',
  
  // Type of the options parameter (for documentation)
  optionsType: 'ForegroundServiceOptions',
  
  // Return type (usually the spiraler itself for chaining)
  returnType: 'RustAndroidSpiraler',
  
  // Description of what this method does
  description: 'Wrap the core with an Android foreground service'
});
```

### `collectSpiralerContributions(discovered)`

Collect all contributions from discovered treadles.

```typescript
import { collectSpiralerContributions } from '@o19/spire-loom/machinery/tieups/spiral';

const discovered = await discoverTreadles('./loom/treadles');
const contributions = collectSpiralerContributions(discovered);
// Returns: Map<string, RuntimeSpiralerContribution[]>
```

### `SpiralerExtensionRegistry`

Type-level registry for spiraler extensions. Augmented by treadle modules.

```typescript
// In your treadle file
declare module '@o19/spire-loom/machinery/tieups/spiral' {
  interface SpiralerExtensionRegistry {
    YourSpiraler: {
      yourMethod(options?: YourOptions): YourSpiraler;
    };
  }
}
```

### `applySpiralerExtensions(spiraler, spiralerName, contributions, implementations)`

Apply collected contributions to a spiraler instance at runtime.

```typescript
import { applySpiralerExtensions } from '@o19/spire-loom/machinery/tieups/spiral';

applySpiralerExtensions(
  spiralerInstance,
  'RustAndroidSpiraler',
  contributions,
  methodImplementations
);
```

## Common Option Types

### `ServiceWrapperOptions`

Base options for service wrapper methods.

```typescript
interface ServiceWrapperOptions {
  /** Name affix for the generated service */
  nameAffix?: string;
}
```

### `ForegroundServiceOptions`

Options for Android foreground service.

```typescript
interface ForegroundServiceOptions extends ServiceWrapperOptions {
  /** Android gradle namespace */
  gradleNamespace?: string;
  /** Notification configuration */
  notification?: {
    title?: string;
    text?: string;
  };
}
```

### `TauriPluginOptions`

Options for Tauri plugin generation.

```typescript
interface TauriPluginOptions extends ServiceWrapperOptions {
  /** Plugin-specific permissions */
  permissions?: string[];
}
```

## Architecture

```
machinery/tieups/
├── spiral.ts          # The tie-up layer for spiral warps
└── README.md          # This file

The tie-up sits between:
- machinery/treadles/     (generators)
- warp/spiral/spiralers/  (WARP DSL)
```

## Why "Tie-Up"?

In a physical loom:
- The **treadles** are the foot pedals
- The **tie-up** connects treadles to heddles via cords
- When you press a treadle, the tie-up determines which threads lift

In spire-loom:
- The **treadles** are generators (code generation phases)
- The **tie-up** connects treadles to spiralers (API extensions)
- When you use a treadle, the tie-up determines which methods are added

> *"The treadle is the intent; the tie-up is the connection; the spiraler is the capability."*

---

*See also: [machinery/treadles/README.md](../treadles/README.md) • [warp/spiral/README.md](../../warp/spiral/README.md)*
