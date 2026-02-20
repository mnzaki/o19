# Spire-Loom Glossary

> *"The words we use shape the architecture we build."*

This glossary defines the conceptual vocabulary of spire-loom. Each term carries both technical meaning and metaphorical resonance.

---

## Core Concepts

### Loom
**Technical**: The package `@o19/spire-loom` that exposes weaving patterns. The tool that holds patterns (spiral, circular, vertical, etc.).
**Metaphor**: The weaver's tool; tension and structure; the frame that enables creation.
**Usage**: `import loom from '@o19/spire-loom'` gives access to patterns via `loom.spiral()`, `loom.circular()`, etc.

### Spiral
**Technical**: A pattern exposed by the loom—unfolding from a compact definition into full implementation across layers.
**Metaphor**: The nautilus shell, DNA's helix, galaxies, fern fronds—patterns of growth that preserve structure while expanding.
**Usage**: `loom.spiral()` creates a SpiralRing. `loom.spiral(android, desktop)` creates a SpiralMux that aggregates multiple rings.

### SpiralMux
**Technical**: A special SpiralOut that wraps multiple inner rings, enabling platform aggregation.
**Metaphor**: A crossroads where multiple paths converge; a router that directs based on destination; a heart with multiple chambers.
**Usage**: `spiral(android, desktop).tauri.plugin()` creates Tauri that routes to Android on mobile and Desktop on desktop.
**Example**: Tauri uses SpiralMux to aggregate `foundframe-android` and `foundframe-desktop` into a single plugin that routes at runtime.

### Surface
**Technical**: The executable definition layer—the place where architecture (WARP.ts) and domain contracts (bookmark.ts) are defined. All surface files run to construct the spiral graph and register metadata.
**Metaphor**: The surface of water, where above and below meet; the face of a crystal; the interface between self and world; the skin that holds the form.
**Usage**: `loom/WARP.ts` executes to build the ring architecture. `loom/bookmark.ts` executes to register Management metadata via decorators.
**Note**: Unlike traditional "metadata" that is only parsed, surface files are **executed**—decorators like `@reach` and `@crud` run and attach metadata to classes/methods.

### Spire
**Technical**: A concrete, generated artifact in the spiral—one step in the unfolding.
**Metaphor**: The tapering tower of a cathedral; organic growth reaching upward while rooted below; structure emerging from accumulation.
**Usage**: Each package we generate is a spire: `IFoundframeAndroid`, `IFoundframeTauri`.

> *The spire spirals upward from the foundation, each tier resting on the one below, reaching toward the sky while anchored in stone.*

### Bloom
**Technical**: The moment of code generation—when a compact definition unfolds into its full implementation.
**Metaphor**: A flower opening; potential becoming actual; the moment of revealing what was always latent.
**Usage**: *"The surface blooms into three spires: Android, Tauri, and Front."*

### DDD (Domain-Driven Design Layer)
**Technical**: A kind of spiraling that generates domain types and Port interfaces from Management Imprints. Creates the boundary between pure domain logic and infrastructure concerns.
**Metaphor**: The cell membrane—selectively permeable, defining what enters and exits; the translation layer between thought and action.
**Usage**: `tauri.typescript.ddd()` spirals out to create the DDD layer, from which you can spiral further to adaptors.
**Note**: DDD is a **kind of** spiraling, not a thing itself. It generates:
- Domain entities and value objects
- Port interfaces (abstract contracts for persistence)
- From which adaptors can be spiraled

### Adaptor
**Technical**: A concrete implementation of DDD Port interfaces—bridging the abstract domain contract to a specific technology (ORM, in-memory, mock, etc.).
**Metaphor**: The hand that grasps—the same intention, different implementations; a key cut for a specific lock.
**Usage**: `front.typescript.drizzle_adaptors({ filter: ['read'] })` spirals out from DDD to create Drizzle ORM implementations.
**Hierarchy**: Adaptor is **under** DDD spiraling. Examples: Drizzle ORM, Prisma, in-memory store, mock implementations.

### Unfold
**Technical**: The transformation from definition to implementation.
**Metaphor**: Paper folding (origami)—a compact form containing multitudes; DNA transcription; a story revealing itself.
**Usage**: *"The Management unfolds into platform-specific implementations."*

---

## Structural Terms

### Ring
**Technical**: A layer in the architecture—each Ring corresponds to exactly one package.
**Metaphor**: The rings of a tree (revealing age and growth); concentric ripples; orbital paths.
**Constraint**: Each Ring lives in exactly one package. No more abstract "Binding" or "Bridge"—concrete packages only.

### Core
**Technical**: The innermost Ring—the domain logic that all other Rings call into.
**Metaphor**: The heart; the seed; the center that holds; the foundation stone.
**Example**: `foundframe` (Rust) contains TheStream, entities, pure domain logic.

### Layer
**Technical**: A conceptual level in the stack—may span multiple Rings in complex architectures.
**Metaphor**: Geological strata; atmospheric layers; onion skin.
**Note**: Prefer "Ring" for concrete package mapping. Use "Layer" when discussing abstractions.

### Wrap
**Technical**: When an outer Ring contains or adapts an inner Ring.
**Metaphor**: Wrapper leaves protecting a bud; Russian dolls; nested containers.
**Usage**: *"foundframe-tauri wraps foundframe."* *"foundframe-android wraps foundframe."*

### Management
**Technical**: A vertical domain concern—an entity and its operations that span all Rings.
**Metaphor**: To manage is to care for; stewardship; governance without control.
**Example**: `BookmarkMgmt`, `PostMgmt`, `PersonMgmt`—each exists in all Rings but manifests differently.

### Management Imprint (or "Imprint")
**Technical**: The surface definition of a Management—the shape it impresses upon each Ring.
**Metaphor**: A fossil leaves an imprint in each layer of rock; a seal presses its form into wax; DNA encodes its pattern in every cell.
**Usage**: *"The BookmarkMgmt imprint blooms into Rust traits, JNI exports, and TypeScript interfaces."*
**Note**: Not a "definition" (which implies completeness), but an imprint—the pattern that each ring interprets in its own medium. Shorter form: just "imprint" when context is clear.
**Syntax**: 
```
@reach Global
abstract BookmarkMgmt {
  VALID_URL_REGEX = /^https?:\/\/.+/
  MAX_TITLE_LENGTH = 200
  
  addBookmark(url: string, title?: string): string
}
```
(No `export`, `static`, `readonly`—these are implied by context.)

---

## Process Terms

### Spiral Out
**Technical**: The function that initiates generation from a Ring.
**Metaphor**: Growth that preserves—each turn of the spiral echoes the last.
**Usage**: `spiralOut(core, { android, tauri })`

### Reach
**Technical**: The scope of a Management—how far up the spiral it extends.
**Categories**:
- **Private**: Core only (internal state)
- **Local**: Platform and below (community/square)
- **Global**: Interface and Front (network/world)

### Preset
**Technical**: A pre-configured stack architecture (radicle_foundframe_tauri, etc.).
**Metaphor**: A seed packet—a contained potential, ready to bloom in appropriate soil.
**Note**: Being phased out in favor of explicit `loom/WARP.ts` definitions.

---

## Generation Terms

### Surface (verb)
**Technical**: To expose or define the interface of a system.
**Usage**: *"We surface the domain through TypeScript classes."*

### Generate
**Technical**: To produce code from a definition.
**Metaphor**: Genesis; creation ex nihilo (though actually creation ex definitione).

### Bind
**Technical**: To connect two layers across a boundary.
**Metaphor**: The ties that bind; ligaments; connectors.
**Example**: JNI bindings, Tauri command bindings.

### Bridge
**Technical**: Code that translates between different contexts (languages, processes, runtimes).
**Metaphor**: The Bifrost; causeways; the Golden Gate.
**Example**: JNI bridge between Java and Rust.

---

## Architectural Patterns

### The Bottleneck
**Technical**: The pattern where multiple Managements converge into a single service interface, then diverge again.
**Metaphor**: An hourglass; a river delta in reverse; a symphony's conductor.
**Usage**: *"IContentMgmt, IPkbMgmt, IDeviceMgmt bottleneck into IFoundframeRadicle for Android, then fan out again."*

### Temporal Stratification
**Technical**: The division between accumulated becoming (past/future) and accumulation of becoming (present).
**Metaphor**: Sedimentary layers; memory vs. perception; the archive vs. the reading room.
**Example**: `foundframe` (Rust) holds the past; `foundframe-front` (JS) holds the present moment.

### Conservation of Contract
**Technical**: The principle that a single definition (surface) generates all bindings.
**Metaphor**: Energy conservation; the hermetic principle of correspondence.
**Usage**: *"Define once, bloom everywhere."*

---

## Package Names (The New Convention)

Each Ring = One Package. No more abstract names.

| Old Name | New Name | Contains |
|----------|----------|----------|
| "Binding" | `foundframe-android` | Android service, JNI, Java stubs |
| "Bridge" | `foundframe-android` (JNI layer) | Rust JNI exports |
| "Platform" | `foundframe-tauri` | Platform trait, Tauri commands |
| "Interface" | `foundframe-tauri` | Command handlers |
| "Front" | `radicle-desktop` | TypeScript app, UI |
| "Core" | `foundframe` | Domain logic, TheStream |

The package names tell the truth: `foundframe` is the core. `foundframe-android` is for Android. `radicle-desktop` is a desktop app.

---

## Word Relationships

```
Surface (the definition)
    ↓ blooms/unfolds into
Spire (concrete artifacts)
    ↓ wrap each other forming
Rings (layers/packages)
    ↓ spiraling out from
Core (the center)
```

```
Spiral (the process)
    = surfaces (defines)
    + blooms (generates)
    + wraps (architects)
```

```
Management (vertical domain)
    spans all
Rings (horizontal layers)
    with varying
Reach (scope)
```

---

## Usage Examples

> *"We surface the Bookmark domain in `loom/bookmark.ts`, then spiral out to bloom the Android spire with foreground service generation."*

> *"The foundframe-android ring wraps foundframe, bridging Java to Rust via JNI."*

> *"IContentMgmt has Global reach, so it surfaces in all rings from Core to Front."*

> *"The architecture bottlenecks at IFoundframeRadicle for Android—multiple managements converging into one service interface."*

---

## Naming Principles

1. **Prefer concrete over abstract**: `foundframe-android` not "Binding"
2. **Prefer organic over mechanical**: "bloom" not "instantiate"
3. **Prefer active over passive**: "spiral out" not "is generated"
4. **Preserve metaphorical resonance**: Each term should evoke the solarpunk aesthetic

---

*The spiral conserves its own naming. Even this glossary needs it.*
