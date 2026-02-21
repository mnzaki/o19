# The Machinery 🪡

> *"The loom that weaves code from threads of intention."*

Welcome to the **machinery**—the apparatus that transforms the [warp](../warp/) (your architectural intentions) into the [weft](../warp/) (the code itself). 

This is where planning becomes reality. Where the [WARP.ts](../../loom/WARP.ts) you so carefully arranged is read, understood, and woven into existence.

---

## The Weaving Process

The loom operates through distinct phases, each embodied by a part of the machinery:

### 1. [reed/](reed/) — *The Comb*

Before weaving begins, the [reed](reed/) scans the [workspace](../../WORKSPACE.md) to understand what packages exist, their relationships, and where generated code should go. Like its physical counterpart that spaces and guides the warp threads, the reed organizes the structural foundation.

### 2. [heddles/](heddles/) — *The Frames*

The [heddles](heddles/) raise and lower warp threads to create patterns. In our loom, they match spiral patterns from your WARP.ts to the appropriate code generators. Which [rings](../warp/spiral/pattern.ts) need which generators? The heddles know.

### 3. [bobbin/](bobbin/) — *The Spool*

The [bobbin](bobbin/) holds the thread—the [templates](bobbin/) and intermediate representations that will become code. EJS templates, cached IR, transformation rules... all wound neatly, ready to be carried through the warp.

### 4. [shuttle/](shuttle/) — *The Carrier*

The [shuttle](shuttle/) is where the actual work happens. It carries thread (code) back and forth through the warp, leaving behind files, configurations, and structure. This is the heart of generation—[file operations](shuttle/file-system-operations.ts), [dependency management](shuttle/dependency-manager.ts), [template rendering](shuttle/template-renderer.ts), and [config writing](shuttle/configuration-writer.ts).

### 5. [beater/](beater/) — *The Packer*

After each pass of the shuttle, the [beater](beater/) packs the weft tight. In code terms: formatting. prettier, rustfmt, consistent style. The beater ensures what's woven stays woven, clean and tight.

### 6. [treadles/](treadles/) — *The Pedals*

The [treadles](treadles/) are the high-level phases of generation—one pedal for [Core](treadles/) (Rust traits), one for [Platform](treadles/) (Android, Desktop), one for [Tauri](treadles/) (commands), one for [DDD](treadles/) (domain types), one for [Adaptors](treadles/) (implementations). The weaver presses them in sequence, and the loom dances.

### 7. [sley/](sley/) — *The Threading*

The [sley](sley/) resolves bindings—where does the front-end find its adaptor? Where do read operations go versus write operations? The sley ensures every bind-point connects to the right implementation.

---

## The Weaver

At the center of it all sits the **[weaver](weaver.ts)**—the operator who orchestrates the entire process. The weaver takes your WARP.ts module and guides the machinery through its paces:

```typescript
import * as warp from './loom/WARP.js';
import { Weaver } from '@o19/spire-loom/machinery/weaver';

const weaver = new Weaver(warp);
await weaver.weave(); // The loom awakens
```

---

## So Where Does Code Come From?

It spirals out from intention:

1. You write [WARP.ts](../../loom/WARP.ts)—*planning*
2. The [warp](../warp/) holds your patterns—*preparation*
3. The **machinery** weaves it into existence—*creation*
4. The weft becomes packages, files, functions—*becoming*

> *"The spiral conserves what matters. Even this machinery needs it."*

---

## Temporal Constraints of the Loom

The loom operates in distinct phases. Understanding these phases—and their constraints—is essential for working with the machinery:

### Phase 1: Heddles (Pattern Matching)
During this phase, the **heddles** analyze the WARP.ts structure and build the intermediate representation (`WeavingPlan`). 

**⚠️ CRITICAL CONSTRAINT:** Do not traverse `plan.nodesByType` during this phase. The plan is being constructed incrementally; accessing it during traversal will yield incomplete data. The `WeavingPlan` is marked with `_isComplete: false` during this phase.

### Phase 2: Weaver (Orchestration)
The **weaver** takes the completed plan and iterates over generation tasks.

### Phase 3: Treadles (Generation)
During this phase, **treadles** (generators) receive the complete `WeavingPlan` via `GeneratorContext`. Only now is it safe to traverse `plan.nodesByType` to discover relationships and compute derived values (like Gradle task names).

**The Rule:** The heddles determine *what* to generate; the treadles determine *how*—and may inspect the complete plan to do so.

### Why This Matters

We learned this the hard way: attempting to compute a Gradle task name during the heddles phase resulted in `buildRustUnknown` because the SpiralOut nodes hadn't been fully recorded yet. Moving the computation to the treadles phase—when the plan is complete—yielded the correct `buildRustFoundframe`.

> *"The one who remembers is the one who acts with full context."*

---

*See also: [The Glossary](../GLOSSARY.md) for weaving terminology, [Code Generator Design](../CODE_GENERATOR_DESIGN.md) for how it all fits together.*
