# The Warp 🧶

> *"Before weaving, there is the setting of threads."*
> *"The warp holds the potential; the weft makes the pattern real."*

The **warp** is the **potential field**—the space through which architectural patterns flow. It is the foundation, the substrate, the *becoming-space* that awaits the weaver's intention.

## What Is the Warp?

In traditional weaving:
- The **warp** are the lengthwise threads set up first on the loom
- They remain stationary, holding tension, providing structure
- The **weft** threads shuttle through them, creating patterns

In spire-loom:
- The **warp** is the **Domain-Specific Language** (DSL) you write in [loom/WARP.ts](../../../loom/WARP.ts)
- It defines the *potential* of your architecture—the rings, the bindings, the possibilities
- The [machinery](../machinery/) is the weft, shuttling through to make it real

## The Philosophy of Warp

The warp is **pure topology**—it doesn't know about:
- Code generation
- File systems
- Build systems
- Platform specifics

The warp knows only:
- **Rings** (wrappers around cores)
- **Patterns** (how rings connect)
- **Imprints** (what marks the core)

This separation is sacred. The warp dreams; the machinery manifests.

## Kinds of Warp

The warp is **extensible**—new topological patterns can be defined:

### [spiral/](spiral/) — *Conservative Growth* 🌀

The [spiral](spiral/) is the first and fundamental warp—rings wrapping rings, growth that preserves. Each ring maintains what came before while adding new capability. [SpiralOut](spiral/pattern.ts), [SpiralMux](spiral/pattern.ts), and [Spiralers](spiral/spiralers/) create the architectural graph.

```
Core (Rust) → Platform (Android/Tauri) → Front (TypeScript)
     ↓
Each ring conserves the inner while adding its own nature
```

### [fractal/](fractal/) — *Self-Similar Decomposition* 🌿 (conceptual)

A hypothetical warp for [horizontal scaling through sharding](fractal/)—breaking the core into self-similar shards. Each shard has the same Managements as the whole, but handles a slice of the domain. Consumers see the same interface regardless of scale.

*See [warp/fractal/README.md](fractal/README.md) for the vision.*

### Your Warp Here? 🌌

The warp system is designed for extension. New topologies welcome:
- **Reactive warp** — streams and signals
- **Blockchain warp** — on-chain/off-chain boundaries  
- **Embedded warp** — device tree overlays
- **Quantum warp** — *when you're ready*

## The Common Elements

All warps share:

### [imprint.ts](imprint.ts) — *The Mark* 🔖

The [@reach](imprint.ts) decorator and [Management](imprint.ts) base class mark your domain concerns. Like a seal pressed into wax, the imprint leaves its shape on every ring—regardless of warp topology.

### [crud.ts](crud.ts) — *The Taxonomy* 📋

The [@crud](crud.ts) decorator marks methods with their Create, Read, Update, Delete, List operations. The loom understands these to route and filter appropriately—in any warp.

### [rust.ts](rust.ts) — *The Core* ⚙️

The [RustCore](rust.ts) is the foundation—pure Rust, no platform. Every warp starts here.

## Using the Warp

```typescript
// loom/WARP.ts
import loom from '@o19/spire-loom';

// Spiral warp: rings wrapping rings
export const foundframe = loom.spiral();  // Core ring
export const android = foundframe.android.foregroundService();  // Platform ring

// Future: Fractal warp
// export const cluster = foundframe.fractal.split({ shardBy: 'tenant' });  // Sharded core
```

This is **planning**—arranging the threads before the machinery weaves them into code.

---

## From Warp to Weft

```
WARP.ts ──► warp (DSL/potential) ──► machinery (weaving) ──► generated code (actual)
    │                                                         │
    │  User intention                                         │  Working software
    │  Pure topology                                          │  Platform reality
    │  Dreams                                                 │  Manifestation
    │                                                         │
    └────────────────── spire-loom bridges ───────────────────┘
```

The warp is your **intention**. The [machinery](../machinery/) makes it **real**.

---

## The Metaphysics

```
WARP          MACHINERY        GENERATED
─────────────────────────────────────────
Potential  →  Process    →     Actual
Topology   →  Loom       →     Code
Pattern    →  Weaving    →     Software
Being      →  Becoming   →     Having Become
```

The warp is **Being**—it simply *is*, holding all possibilities.
The machinery is **Becoming**—the process of realization.
The generated code is **Having Become**—manifested reality.

> *"The spiral conserves what matters. But the warp? The warp merely is."*

---

*See also: [spiral/README.md](spiral/README.md) • [fractal/README.md](fractal/README.md) • [The Glossary](../GLOSSARY.md) • [The Machinery](../machinery/)*
