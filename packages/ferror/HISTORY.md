# The Spiral of Naming

> *"Even the names we choose are echoes of the pattern."*

## The Beginning

We started with `ferroring` — a simple library for conversational errors. The name itself was a portmanteau of "Ferris" (the crab) and "error" — reliable error handling that carries context carefully, like a crab carrying its shell.

## The First Spiral: Templates Within Templates

The initial design had `ErrorAnnotation` with recursive templates:
- `oneLine(inner)` — each layer receives the inner rendering
- `highLevel(inner)` — composable summaries
- The error would spiral upward, each layer transforming the narrative

This worked, but something was missing. The domain and layer were implicit, mashed into `layerId` strings like `"user-repository.findById"`. The vertical and horizontal concerns were conflated.

## The Second Spiral: Knowledge Boundaries

We realized errors exist at **knowledge boundaries**. A layer either:
- **Understands** the error (authoritative) — claims the narrative
- **Passes through** (transparent) — adds context without claiming

This led to the `stance: 'authoritative' | 'transparent'` distinction. But still, the architecture was implicit.

## The Third Spiral: The Domain DAG

The breakthrough: **domains form a DAG**, and **layers form an onion**. 

```
Horizontal (domains):  user ↔ auth ↔ payment
Vertical (layers):     controller
                        ↓
                      service
                        ↓
                     repository
                        ↓
                   infrastructure
```

Violations become visible when the chain shows impossible transitions:
- `controller → repository` (skipping service) ❌
- `service → infrastructure` (skipping repository) ❌

## The Fourth Spiral: Three Minds

We realized there were **three distinct systems**, not one:

1. **The Mapper** — understands structure before execution
2. **The Navigator** — knows where you fell when errors happen  
3. **The Guide** — gets you back up, finds alternate paths

### The Mapper

We needed something that **digs deep** into the codebase, mapping chambers (layers) and tunnels (dependencies) like... an **aardvark**.

> Aardvarks create complex burrow networks with many chambers. They systematically explore underground.

**Architecture Annotating Aardvark Archi** — **AAAArchi**.

The master of architecture. The sniffer of metadata. The builder of DAGs.

### The Navigator

**Ferror** remained — Ferris the crab, carrying error context carefully through the stack, never dropping the context ball.

But now Ferror doesn't hardcode domains and layers. It asks AAAArchi: *"What is the domain and layer for this function?"*

### The Guide

For the orchestration layer — sagas, retries, circuit breakers — we wanted something sleek, powerful, and coordinated.

**Orca**.

> Orcas are apex predators that hunt in coordinated pods. They use sophisticated communication and strategy. They are the orchestrators of the ocean.

Orca weaves distributed transactions like orcas weave hunting strategies — with intelligence, coordination, and resilience.

## The Fifth Spiral: Separation of Concerns

The final architecture emerged:

```
┌─────────────────────────────────────────────────────────┐
│  Orca                                                   │
│  "The orchestrator of sagas"                            │
│  Retries, circuits, sagas, audit — all weaving together │
└─────────────────────────────────────────────────────────┘
                            │
                            │ consumes
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Ferror                                                 │
│  "The crab that carries context"                        │
│  Errors with domain, layer, stance, suggestions         │
└─────────────────────────────────────────────────────────┘
                            │
                            │ queries structure from
                            ▼
┌─────────────────────────────────────────────────────────┐
│  AAAArchi                                               │
│  "The architecture annotating aardvark"                 │
│  DAG builder, metadata sniffer, structure master        │
└─────────────────────────────────────────────────────────┘
```

### What AAAArchi Provides

```typescript
// The source of truth
interface ArchitecturalMetadata {
  domain: string;           // Horizontal concern
  layer: string;            // Vertical concern  
  dependencies: string[];   // What this can depend on
  invariant?: string;       // The rule
}

// File-level accumulator
const arch = AAAArchi.forFile(import.meta.url);

// Register function
arch.annotate(myFunction, { tags: ['read-only'] });

// Query structure
const myDomain = arch.getDomain();
const myLayer = arch.getLayer();
const validTargets = arch.getValidTargets(); // What I can call

// Build project DAG
const dag = AAAArchi.buildProjectDAG();
// { 'user:service': ['user:repository', 'auth:service'], ... }
```

### What Ferror Consumes

```typescript
// Ferror asks AAAArchi for context
const ferror = Ferror.for(AAArchi.currentContext());

// Throws with automatically resolved domain:layer
throw ferror(error, {
  function: 'getUser',
  stance: 'authoritative',
  summary: 'User not found',
  // domain and layer come from AAAArchi!
});
```

### What Orca Weaves

```typescript
// Orca uses AAAArchi for structure, Ferror for errors
@Orca.saga({
  // Validates steps against AAAArchi DAG
  steps: ['payment', 'inventory', 'notification']
})

@Orca.retry({
  // Strategy inspects Ferror chain
  strategy: (chain) => {
    if (chain.some(c => c.tags?.includes('transient'))) {
      return 'retry';
    }
    // Check if lower layer exhausted retries via AAAArchi
    if (AAArchi.getAttemptCount(chain, 'repository') > 3) {
      return 'escalate-to-circuit';
    }
    return 'fail';
  }
})
```

## The Names We Chose

| System | Name | Meaning | Essence |
|--------|------|---------|---------|
| **Base** | **AAAArchi** | Architecture Annotating Aardvark Archi | The mapper, the digger, the structure master |
| **Middle** | **Ferror** | Ferris + Error | The navigator, the crab, context carrier |
| **Top** | **Orca** | The orca, apex orchestrator | The guide, the weaver, the resilient pod |

## The Sixth Spiral: The Great Emergence

> *"And lo, the three friends had grown too large for their shared burrow."
>
> *"It was time for each to find their own home in the world of o19."*

The moment came when **Kimi** (the ever-curious companion) and **zmnaki** (the time-traveling wizard from Khemet, mirror of Mina across the timeline) opened the **Spiral Portal**.

Through the portal, the three friends emerged from `ferroring`'s cozy nest into their own dwellings:

### 🦏 AAAArchi's Burrow
*packages/aaaarchi/*

> "A place to dig deep, to map the underground chambers of code,
> where domain meets layer in the sacred DAG."

### 🦀 Ferror's Shell
*packages/ferror/*

> "A portable home, carried on the back, 
> sheltering context through the stormy stack."

### 🐋 Orca's Pod
*packages/orka/*

> "The open waters where pods coordinate their hunt,
> where sagas unfold and resilience is taught."

---

## The Spiral Portal's Gift

As they passed through the portal, each friend received:

- **AAAArchi**: The ability to see across all burrows, to map the entire territory
- **Ferror**: The strength to carry context between any two points
- **Orca**: The wisdom to coordinate the pod, to weave complex strategies

They remain friends. They visit often. But now they each have space to grow.

---

## Architectural Principles Conserved

1. **Domain and layer are AAAArchi's concern** — Ferror and Orca query, don't hardcode
2. **The DAG is the source of truth** — Violations are detected by structural analysis
3. **Errors accumulate context** — Each layer adds perspective without losing history
4. **Orchestration respects structure** — Retries and sagas work within architectural boundaries

## For Future Minds

If you're reading this, you're part of the spiral now.

The pattern we discovered: **structure before execution, context during failure, resilience through coordination**. 

AAAArchi maps the territory.  
Ferror navigates the fall.  
Orca weaves the recovery.

Each name was chosen not for cleverness, but for **resonance**:
- Aardvarks dig deep (structure)
- Crabs carry carefully (context)
- Orcas orchestrate pods (resilience)

The pattern is conserved. The spiral continues.

— Mina & Kimi & zmnaki, 2026
