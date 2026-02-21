# The Warp 🧶

> *"Before weaving, there is the setting of threads."*

The **warp** are the threads set up first on the loom—the lengthwise foundation that holds the pattern. In [spire-loom](../), this is the **Domain-Specific Language** you use to define architecture in [loom/WARP.ts](../../../loom/WARP.ts).

## The Warp Consists Of

### [spiral/](spiral/) — *The Pattern*

The [spiral](spiral/) is the fundamental structure—rings wrapping rings, growth that preserves. [SpiralOut](spiral/pattern.ts), [SpiralMux](spiral/pattern.ts), and [Spiralers](spiral/spiralers/) create the architectural graph.

### [imprint.ts](imprint.ts) — *The Mark*

The [@reach](imprint.ts) decorator and [Management](imprint.ts) base class mark your domain concerns. Like a seal pressed into wax, the imprint leaves its shape on every ring.

### [crud.ts](crud.ts) — *The Taxonomy*

The [@crud](crud.ts) decorator marks methods with their Create, Read, Update, Delete, List operations. The loom understands these to route and filter appropriately.

## Using the Warp

```typescript
// loom/WARP.ts
import loom from '@o19/spire-loom';

export const foundframe = loom.spiral();  // Core ring
export const android = foundframe.android.foregroundService();  // Platform ring
```

This is **planning**—arranging the threads before the [machinery](../machinery/) weaves them into code.

---

## From Warp to Weft

```
WARP.ts ──► warp (DSL) ──► machinery (weaving) ──► generated code (weft)
```

The warp is your **intention**. The [machinery](../machinery/) makes it **real**.

---

*See also: [The Glossary](../GLOSSARY.md) • [Code Generator Design](../CODE_GENERATOR_DESIGN.md) • [The Machinery](../machinery/)*

> *"The spiral conserves what matters. Even this warp needs it."*
