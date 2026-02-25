# The Spiral Warp 🌀

> *"Growth that preserves. Change that maintains."*

The **spiral** is the fundamental warp of spire-loom—a topology of **conservative growth** where each ring wraps and extends what came before, maintaining the core while adding new capability.

## The Spiral Pattern

In nature, the spiral appears everywhere:
- Seashells growing outward while keeping their core
- Galaxies spinning around central mass
- DNA's double helix preserving information across generations

In software, the spiral means:
- **Core** (Rust) → pure domain logic
- **Platform** (Android/iOS/Desktop) → native wrapping
- **Front** (TypeScript) → user interface

Each layer **conserves** the inner layers while adding its own nature.

## Core Concepts

### SpiralRing — *The Unit of Wrapping*

Every spiraler implements `SpiralRing`:

```typescript
interface SpiralRing {
  /** The ring this one wraps (inner) */
  readonly inner?: SpiralRing;
  
  /** Rings this one contains (for multiplexers) */
  readonly innerRings?: SpiralRing[];
  
  /** Get metadata about this ring */
  getMetadata(): RingMetadata;
}
```

Rings know their inner ring—forming a **chain of conservation**.

### SpiralOut — *Extension by Wrapping*

The basic spiral operation: wrap one ring with another.

```typescript
// User writes:
const android = foundframe.android.foregroundService();

// Creates:
RustAndroidSpiraler {
  inner: RustCore { ... }  // Conserved!
  // + Android-specific capabilities
}
```

### SpiralMux — *Extension by Aggregation*

The multiplexing spiral: one ring containing many platforms.

```typescript
// User writes:
const tauri = foundframe.tauri.plugin();

// Creates:
TauriSpiraler {
  innerRings: [
    RustAndroidSpiraler { ... },
    DesktopSpiraler { ... }
  ]
  // Routes to appropriate platform at runtime
}
```

## The Spiralers

Spiralers are the **concrete implementations**—the actual rings users create:

### Core Spialers

| Spialer | Purpose | Wraps |
|---------|---------|-------|
| [RustCore](../rust.ts) | Pure Rust core | Nothing (the center) |

### Platform Spialers

| Spialer | Purpose | Wraps |
|---------|---------|-------|
| [RustAndroidSpiraler](spiralers/android.ts) | Android native service | RustCore |
| [DesktopSpiraler](spiralers/desktop.ts) | Desktop native | RustCore |
| [TypeScriptSpiraler](spiralers/typescript.ts) | TypeScript domain | RustCore |

### Aggregation Spialers

| Spialer | Purpose | Contains |
|---------|---------|----------|
| [TauriSpiraler](spiralers/tauri.ts) | Cross-platform plugin | RustAndroidSpiraler + DesktopSpiraler |
| [TauriAppSpiraler](spiralers/tauri_app.ts) | Tauri application | Multiple plugins |
| [DDDTypeScriptSpiraler](spiralers/ddd_typescript.ts) | DDD TypeScript layer | Domain adaptors |

## The Flow

```
User DSL                     Spiral Graph                    Generated Output
──────────────────────────────────────────────────────────────────────────────

foundframe                   RustCore
    │                            │
    ▼                            ▼
.foregroundService()      RustAndroidSpiraler ──────────────────► Kotlin service
    │                            │                               AIDL interface
    ▼                            │                               JNI bridge
.tauri.plugin()           TauriSpiraler ───────────────────► Tauri commands
                               │        
                        ┌──────┴──────┐
                        ▼             ▼
                RustAndroidSpiraler   DesktopSpiraler
                     │                 │
                     └───────┬─────────┘
                             ▼
                     Runtime routing
```

## The Mathematics

The spiral can be seen as a **functor** in category theory:

```
F: Core → Platform
F preserves structure: F(a ∘ b) = F(a) ∘ F(b)

The spiral is a endofunctor on the category of Rings:
S: Ring → Ring
S adds capabilities while preserving the underlying structure
```

Or more poetically:

> *"The spiral is the fixed point of growth: S(x) = x + new_capability"*

## Why Spiral?

Other topologies are possible (see [distribute/](../distribute/)), but the spiral excels at:

1. **Incremental complexity** — Start with core, add layers as needed
2. **Platform isolation** — Each platform ring is self-contained
3. **Clear boundaries** — Inner/outer makes dependency flow obvious
4. **Testability** — Test core without platform, platform without front
5. **Refactoring safety** — Changes stay within their ring

## Creating New Spiralers

To create a new spiraler:

1. **Extend `SpiralRing`**:
   ```typescript
   class MySpiraler implements SpiralRing {
     constructor(readonly inner: SpiralRing) {}
     getMetadata() { return { ... }; }
   }
   ```

2. **Register in WARP.ts**:
   ```typescript
   spiral(): MySpiraler {
     return new MySpiraler(this.core);
   }
   ```

3. **Create a treadle** (in [machinery/treadles/](../../machinery/treadles/)):
   ```typescript
   export const genMyService = definePlatformWrapperTreadle({
     platform: { name: 'MyPlatform', spiraler: 'MySpiraler' },
     // ...
   });
   ```

4. **Add the tie-up** (in [machinery/tieups/spiral.ts](../../machinery/tieups/spiral.ts)):
   ```typescript
   export const contributes = defineSpiralerContribution({
     spiraler: 'MySpiraler',
     method: 'myService',
     // ...
   });
   ```

See [Creating Custom Spiralers](../../machinery/treadles/TREADLE_NAMING.md) for details.

---

## The Poetry

```
The spiral turns upon itself,
Yet ever outward grows,
Conserving what at center dwells,
While new skin overflows.

Core within and shell without,
Each layer guards the last,
From Rust to world, a spiral route,
From future to the past.
```

> *"The spiral conserves what matters. The core remains."*

---

*See also: [The Warp](../README.md) • [fractal/](../fractal/) • [spiralers/](spiralers/)*
