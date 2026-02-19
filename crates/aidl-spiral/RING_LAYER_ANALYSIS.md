# Ring-Layer Metaphor Analysis

> "The spiral conserves its own analysis."

This document explores two competing metaphors for organizing code generation, then attempts to formalize the current architecture to find the right abstraction.

---

## Metaphor A: Rings as Radii, Layers as Traits

**Ring = concentric radius from source**  
**Layer = cross-cutting capability (trait)**

```
                    Ring 0 (Source)
                         │
                         ▼
              ┌─────────────────────┐
              │   Ring 1 (Binding)  │◄──── Layer: LanguageStub
              │   - Java AIDL       │
              │   - TS Interfaces   │
              │   - Rust Traits     │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Ring 2 (Bridge)   │◄──── Layer: BoundaryCrossing
              │   - JNI exports     │      Layer: Serialization
              │   - FFI glue        │
              │   - Message codecs  │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Ring 3 (Core)     │◄──── Layer: DomainLogic
              │   - Pure structs    │      Layer: Persistence
              │   - Platonic traits │      Layer: EventSource
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Ring 4 (Platform)  │◄──── Layer: DeploymentContext
              │  - Desktop impl     │      Layer: ProcessModel
              │  - Android impl     │
              │  - iOS impl         │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Ring 5 (Interface)  │◄──── Layer: APISurface
              │  - Tauri commands   │      Layer: EventStreaming
              │  - GraphQL schema   │
              │  - REST endpoints   │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Ring 6 (Front)    │◄──── Layer: UserAdaptation
              │   - TS Adaptors     │      Layer: ViewModel
              │   - UI bindings     │
              │   - State mgmt      │
              └─────────────────────┘
```

**In this model:**
- Each Ring implements multiple Layers
- Ring 3 (Core) is special: it's where minds spend more time (biological or otherwise)
- Layers are orthogonal concerns that cut across all Rings

> **Note on "Minds" vs "Tools"**: We distinguish between minds (cognitive agents—biological humans, AI systems, hybrid collaborations) and tools (instruments of generation). Code generation is not "non-mind work"; it's mind work mediated by tools. The question is: where do minds spend their cognitive effort? Ring 3 is where the Platonic domain logic lives—where the "Trait" (in your preferred terminology) is defined. Generated scaffolding (Rings 1, 2, 4, 5, 6) is also the product of minds, just minds working through the tool of codegen.

---

## Metaphor B: Rings as Trait Groups, Layers as Implementations

**Layer = interface (the what)**  
**Ring = group of implementations (the how)**

```
Layer: Persistence
├── Ring 0: AIDL definition (`interface IDataStore`)
├── Ring 1: Language stubs (Java/TS/Rust traits)
├── Ring 2: Transport (JNI/FFI bindings)
├── Ring 3: Core impl (git-based storage)
├── Ring 4: Platform adapter (file system, cloud)
├── Ring 5: API surface (commands)
└── Ring 6: Front cache (local-first sync)

Layer: Serialization  
├── Ring 0: AIDL parcelables
├── Ring 1: Language types
├── Ring 2: Wire format (Protobuf, MessagePack)
├── Ring 3: Domain structs with Serialize/Deserialize
├── Ring 4: Platform-specific optimizations
├── Ring 5: API DTOs
└── Ring 6: UI state shape
```

**In this model:**
- Each Layer spans all Rings
- Rings represent "depth of implementation"
- A vertical slice = one Layer across all Rings

---

## Attempt at Formalization

### The Current Architecture

```
(foundframe( radicle )--rust) ++ tauri( (android--java) | (ios--Swift) | (desktop--rust) )
```

**Translation:**
- `foundframe` wraps `radicle` (git-based storage)
- Both are implemented in `--rust`
- This core is `++` (combined with) `tauri`
- Tauri provides a choice `|` of platforms:
  - `android--java` (Android with Java service)
  - `ios--Swift` (future)
  - `desktop--rust` (direct Rust)

### Proposed Formal Syntax

```bnf
Architecture   ::= Stack "++" Platform
Stack          ::= Domain ("(" Backend ")")? "--" Lang
Domain         ::= identifier
Backend        ::= identifier
Lang           ::= "rust" | "java" | "swift" | "kotlin"
Platform       ::= "tauri" | "electron" | "capacitor" | Native
Native         ::= "(" Target ("|" Target)* ")"
Target         ::= PlatformName "--" Lang
PlatformName   ::= "android" | "ios" | "desktop" | "web"
```

**Current instance:**
```
foundframe(radicle)--rust ++ tauri((android--java) | (desktop--rust))
```

**Hypothetical variations:**
```
// Replace backend: IPFS instead of Radicle
foundframe(ipfs)--rust ++ tauri((android--java) | (desktop--rust))

// Replace platform: Capacitor instead of Tauri
foundframe(radicle)--rust ++ capacitor((android--kotlin) | (ios--swift))

// Replace domain: Different app, same stack
mydiary(git)--rust ++ tauri((android--java) | (desktop--rust))

// Add iOS
foundframe(radicle)--rust ++ tauri((android--java) | (ios--swift) | (desktop--rust))
```

### The Generation Function

If we model generation as a function:

```
G: (AIDL, Architecture) → [GeneratedFile]

Where:
- AIDL = set of interface definitions
- Architecture = stack + platform configuration
- GeneratedFile = (path, content, ring, layer)
```

**Key insight:** The same AIDL generates different outputs based on Architecture.

---

## Analysis: What Needs Naming

### Candidate Concepts

| Concept | Description | Current Name | Alternatives |
|---------|-------------|--------------|--------------|
| **A** | The source of truth | Ring 0 | Source, Contract, Genesis |
| **B** | Distance from source | Ring | Radius, Orbit, Stratum, Shell |
| **C** | Cross-cutting capability | Layer | Trait, Aspect, Facet, Concern |
| **D** | Specific implementation | ? | Layer, Shell, Instance |
| **E** | Collection of files at same B | Ring | Stratum, Tier |
| **F** | A vertical slice (Media, Post, etc.) | ? | Domain, Entity, Slice |

### The Tension

We have **two axes**:
1. **Vertical**: Distance from AIDL (Rings in Metaphor A)
2. **Horizontal**: Cross-cutting concerns (Layers in Metaphor A)

But also:
3. **Depth**: How far down the stack an implementation goes (Rings in Metaphor B)

### The Resolution

What if we distinguish:

- **Ring**: Immutable distance from Source (0 = AIDL, 6 = Front)
- **Layer**: Mutable implementation strategy at a given Ring
- **Shell**: A specific Layer instance (e.g., "DirectDesktop Layer at Ring 4")

Example:
```
Ring 4: Platform
├── Layer: InProcess (direct calls)
├── Layer: SameProcessJNI (JNI but same process)
├── Layer: RemoteService (AIDL service, different process)
└── Layer: NetworkIPC (HTTP, WebSocket)

Each Layer = a Shell
```

### Orbit as Parameter

An **Orbit** could be the **eccentricity** of a Shell—how much it deviates from the "ideal" Ring:

```
Ring 3: Core (ideal: pure domain logic)
├── Shell: Foundframe (Orbit: git-based)
├── Shell: Foundframe(IPFS) (Orbit: content-addressed)
└── Shell: Foundframe(S3) (Orbit: cloud-backed)
```

Orbit captures **backend choice** without changing Ring position.

---

## Open Questions

1. **Is Ring 0 special?** It has no Shells—it's pure specification.

2. **Can Rings be skipped?** If Layer = RemoteService at Ring 4, do we skip Ring 3 (Core) and call Ring 2 (Bridge) directly?

3. **What generates what?** Does Ring N generate Ring N+1, or does AIDL generate all Rings at once?

4. **Is the user's syntax sufficient?**
   ```
   foundframe(radicle)--rust ++ tauri((android--java) | (desktop--rust))
   ```
   Does this capture everything we need for codegen?

5. **What about the entities?** "Media", "Bookmark", "Post", "Person", "Conversation"—these are vertical slices through all Rings. What do we call this dimension?

---

## Metaphor C: Layers as Stack, Boundaries as Generated Code

**User's insight**: A Ring is made up of **Boundaries** stitched together. Boundaries are what's between Layers. Layers are the classic caller->callee hierarchy.

### The Model

```
Layer N (caller) ──[Boundary]──► Layer N+1 (callee)
        │                              │
        │        ┌─────────────┐       │
        │        │   AIDL      │       │
        │        │  frames     │       │
        │        │  boundary   │       │
        │        └─────────────┘       │
        │                              │
   ┌────┴────┐                  ┌──────┴──────┐
   │ Caller  │                  │   Callee    │
   │ types   │◄──── codegen ───►│   types     │
   │ adapter │                  │   handler   │
   └─────────┘                  └─────────────┘
```

**Key insight**: The **Boundary type** is a composite type dependent on the Layers at either side.

### Computing Boundary Types

Given a DAG of Layers, we compute the Boundary type:

```rust
// Layer is a node in the call graph
struct Layer {
    name: String,
    language: Language,
    runtime: Runtime,
    process: ProcessModel,
}

// Boundary is the edge between Layers
struct Boundary {
    from: LayerId,
    to: LayerId,
    boundary_type: BoundaryType,  // computed from Layer properties
}

// BoundaryType determines what code to generate
enum BoundaryType {
    // Same language, same process: direct call
    Direct,
    
    // Same language, different process: IPC
    Ipc(Protocol),
    
    // Different languages, JNI bridge
    Jni {
        direction: JniDirection,
    },
    
    // Different languages, FFI
    Ffi {
        abi: Abi,
    },
    
    // Network boundary
    Network {
        protocol: Protocol,  // HTTP, gRPC, WebSocket, etc.
        serialization: SerializationFormat,
    },
    
    // Tauri-specific: TS -> Rust
    TauriCommand,
    
    // AIDL-specific: Java <-> Rust
    Aidl {
        package: String,
        interface: String,
    },
}
```

### Example: Current Architecture

```
Layer DAG:
┌─────────────────┐
│  TypeScript UI  │  (Layer 0)
│  (browser/heap) │
└────────┬────────┘
         │ BoundaryType: TauriCommand
         ▼
┌─────────────────┐
│  Rust Commands  │  (Layer 1)
│  (tauri::command)│
└────────┬────────┘
         │ BoundaryType: Direct OR AidlClient
         ▼
┌─────────────────┐
│ Rust Platform   │  (Layer 2a - Desktop)
│ (direct calls)  │     OR
└─────────────────┘  (Layer 2b - Android)
                            │
                            │ BoundaryType: Aidl
                            ▼
                     ┌─────────────────┐
                     │  Java Service   │  (Layer 3)
                     │  (android:remote)│
                     └────────┬────────┘
                              │ BoundaryType: Jni
                              ▼
                     ┌─────────────────┐
                     │   Rust Core     │  (Layer 4)
                     │ (foundframe)    │
                     └─────────────────┘
```

### Computing the Boundary

```rust
fn compute_boundary_type(from: &Layer, to: &Layer) -> BoundaryType {
    match (from.language, to.language, from.process, to.process) {
        // Same language, same process
        (Lang::Rust, Lang::Rust, Process::Same, Process::Same) => BoundaryType::Direct,
        
        // Same language, different process
        (Lang::Rust, Lang::Rust, _, Process::Different) => BoundaryType::Ipc(Protocol::UnixSocket),
        
        // Rust -> Java via JNI
        (Lang::Rust, Lang::Java, _, _) => BoundaryType::Jni { direction: JniDirection::JavaUpcall },
        
        // Java -> Rust via JNI  
        (Lang::Java, Lang::Rust, _, _) => BoundaryType::Jni { direction: JniDirection::JavaDowncall },
        
        // TypeScript -> Rust via Tauri
        (Lang::TypeScript, Lang::Rust, _, _) => BoundaryType::TauriCommand,
        
        // Network boundaries
        (_, _, Process::Network, _) => BoundaryType::Network { 
            protocol: Protocol::Http,
            serialization: SerializationFormat::Json,
        },
        
        _ => BoundaryType::Ffi { abi: Abi::C },
    }
}
```

### AIDL as Boundary Frame

The AIDL file **frames** the boundary—it defines:
- What methods cross the boundary
- What types cross the boundary
- Directionality (in, out, inout)
- Lifecycle (oneway, callback)

**aidl-spiral** reads the AIDL and generates the boundary code based on the computed BoundaryType.

### Ring Composition

A **Ring** is a cycle in the Layer DAG—a complete round-trip from a Layer back to itself through other Layers:

```
Ring: TypeScript UI → Rust Commands → Rust Platform → Rust Core
                       ↓ (callback)
              ←←←←←←←←←←
```

Or in the Android case:
```
Ring: TypeScript UI → Rust Commands → Java Service → Rust Core
                       ↓              ↓ (callback)
              ←←←←←←←←←←←←←←←←←←←←←
```

### Code Generation as Boundary Instantiation

```rust
// For each boundary in the architecture:
for boundary in architecture.boundaries() {
    // 1. Compute boundary type from adjacent layers
    let boundary_type = compute_boundary_type(&boundary.from, &boundary.to);
    
    // 2. Frame the AIDL through this boundary type
    let framed = frame_aidl(&aidl, &boundary_type);
    
    // 3. Generate the boundary code
    let generated = generate_boundary_code(framed, &boundary_type);
    
    // 4. Output to appropriate location
    write_to(&boundary.output_path(), generated);
}
```

### Configuration

```yaml
# aidl-spiral.yaml
architecture:
  layers:
    - name: typescript-ui
      language: typescript
      runtime: browser
      
    - name: rust-commands
      language: rust
      runtime: tauri
      
    - name: rust-platform
      language: rust
      runtime: tauri
      
    - name: java-service
      language: java
      runtime: android
      process: remote
      
    - name: rust-core
      language: rust
      runtime: native

  boundaries:
    - from: typescript-ui
      to: rust-commands
      # Computed: BoundaryType::TauriCommand
      
    - from: rust-commands
      to: rust-platform
      # Desktop: BoundaryType::Direct
      # Android: BoundaryType::AidlClient
      
    - from: rust-platform
      to: java-service
      # Computed: BoundaryType::Aidl
      
    - from: java-service
      to: rust-core
      # Computed: BoundaryType::Jni
```

---

## The Inversion: Rings as Horizontal, Managements as Vertical

> *"Rings are functions. Managements are domains."*

The final inversion of the metaphor:

### The Geometry

```
                    BookmarkMgmt          PostMgmt            PersonMgmt
                         │                   │                   │
    Ring: Contract       │                   │                   │
    (AIDL)               ▼                   ▼                   ▼
                    ┌─────────┐         ┌─────────┐         ┌─────────┐
                    │IBookmark│         │  IPost  │         │ IPerson │
                    │ Service │         │ Service │         │ Service │
                    └────┬────┘         └────┬────┘         └────┬────┘
                         │                   │                   │
    Ring: Binding        │                   │                   │
    (Stubs)              ▼                   ▼                   ▼
                    ┌─────────┐         ┌─────────┐         ┌─────────┐
                    │Bookmark │         │  Post   │         │ Person  │
                    │Client   │         │ Client  │         │ Client  │
                    └────┬────┘         └────┬────┘         └────┬────┘
                         │                   │                   │
    Ring: Bridge         │                   │                   │
    (JNI/FFI)            ▼                   ▼                   ▼
                    ┌─────────┐         ┌─────────┐         ┌─────────┐
                    │  JNI    │         │  JNI    │         │  JNI    │
                    │  Glue   │         │  Glue   │         │  Glue   │
                    └────┬────┘         └────┬────┘         └────┬────┘
                         │                   │                   │
    Ring: Core           │                   │                   │
    (Domain)             ▼                   ▼                   ▼
                    ┌─────────┐         ┌─────────┐         ┌─────────┐
                    │Bookmark │         │  Post   │         │ Person  │
                    │Service  │         │ Service │         │ Service │
                    │  impl   │         │  impl   │         │  impl   │
                    └─────────┘         └─────────┘         └─────────┘
```

### The Insight

**Rings are cross-cutting functions that must exist for any Management to operate.**

Every Management—Bookmark, Post, Person—needs:
- **Ring: Contract** (AIDL): Explicit interface definition
- **Ring: Binding** (Stubs): Language-specific entry points  
- **Ring: Bridge** (JNI/FFI): Cross-language boundaries
- **Ring: Core** (Domain): Pure implementation

These are **conditions of possibility**, not optional infrastructure.

### Why "Mgmt" Not "Service"

> *"Management is not Service (implementation). Management is stewardship of the boundary—ensuring the entity continues to be, across all Rings, with integrity."*

**Service** implies a running process, an active implementation.  
**Management** implies responsibility, continuity, the tending of a domain across all its manifestations.

`BookmarkMgmt` is not a service you call. It is the **entire vertical concern**—from TypeScript adaptor through JNI glue to Rust implementation—that ensures Bookmark continues to be.

### The Larger Pattern

This geometry applies beyond software:

| Domain | Managements (Vertical) | Rings (Horizontal) |
|--------|------------------------|-------------------|
| **Organization** | Marketing, Engineering, Sales | Policy, Operations, Infrastructure |
| **Ecosystem** | Photosynthesis, Respiration, Reproduction | DNA, Membrane, Metabolism |
| **Software** | Bookmark, Post, Person, Conversation | Contract, Binding, Bridge, Core, Platform, Interface, Front |

**The principle**: You cannot optimize a complex system by optimizing domains alone. You must also optimize the **Rings**—the handoffs, the translations, the boundaries between layers of abstraction.

### AIDL as Boundary Steward

The AIDL frames **what crosses between Rings**, not within a Ring. It is the explicit contract that enables:

- **Typed boundaries**: Exactly what methods, what types, what directions
- **Conserved semantics**: The meaning of `addBookmark` persists across Ring 6 (TS) through Ring 0 (AIDL) to Ring 3 (Rust)
- **Generatable scaffolding**: From the AIDL, we generate all the boundary-crossing code

> *"Boundaries must be explicit, typed, and conserved. Not just 'they talk to each other' but exactly what crosses, in what direction, with what guarantees."*

---

## Next Steps

Before coding:
1. ~~Choose between Metaphor A and B (or synthesis)~~ → **Metaphor D: Rings Horizontal, Managements Vertical**
2. ~~Define the formal syntax for Architecture~~
3. Determine how Rings, Managements, Boundaries relate
4. Map current `aidl-spiral` to the chosen model
5. **Model in Rust**: Rings as...? Managements as...? Boundaries as...?

## Meta-AIDL: The Architecture as Contract

> *"The spiral turns inward: the tool that reads AIDL is itself configured by AIDL."*

### The Recursive Vision

What if the architecture configuration is itself AIDL? A `meta.aidl` file that:
1. Defines available **Rings**
2. Declares **connections** between Rings (BoundaryTypes)
3. Lists which **Managements** to generate for

Then `aidl-spiral`:
1. Reads `meta.aidl` to understand the architecture pattern
2. Reads `BookmarkMgmt.aidl`, `PostMgmt.aidl`, etc.
3. Generates code for each Management across all Rings, using the connections defined in meta

### Example: meta.aidl

```aidl
// meta.aidl
// The architecture configuration, written in AIDL

package aidl.config;

/** Defines the Ring structure for this project */
interface IMetaArchitecture {
    
    /** Available Rings, from innermost to outermost */
    String[] getRings();
    
    /** How adjacent Rings connect */
    Connection[] getConnections();
    
    /** Which Managements exist in this architecture */
    String[] getManagements();
    
    /** Global configuration */
    Config getConfig();
}

parcelable Connection {
    String fromRing;      // "Contract"
    String toRing;        // "Binding"
    String boundaryType;  // "AidlToJava", "Jni", "TauriCommand"
    String language;      // "java", "rust", "typescript"
}

parcelable Config {
    String projectName;
    String basePackage;
    String outputDir;
}
```

### Alternative: Declarative meta.aidl

```aidl
// meta.aidl
// Rings as interfaces, architecture as their relationships

package aidl.config;

/** Ring 0: The Source */
interface IContractRing {
    String frameAidl(String aidlContent);
}

/** Ring 1: Language Binding */
interface IBindingRing {
    String generateStub(String language);
}

/** Ring 2: Cross-language Bridge */
interface IBridgeRing {
    String generateGlue(String fromLang, String toLang);
}

/** Ring 3: Pure Domain */
interface ICoreRing {
    String implementService();
}

/** Ring 4: Platform Abstraction */
interface IPlatformRing {
    String adaptTo(String platform);
}

/** Ring 5: API Surface */
interface IInterfaceRing {
    String exposeCommands();
}

/** Ring 6: User Front */
interface IFrontRing {
    String generateAdaptors();
}

/** The Architecture connects Rings */
interface IArchitecture {
    // Connect Rings with specific BoundaryTypes
    void connect(IContractRing from, IBindingRing to);
    void connect(IBindingRing from, IBridgeRing to);
    void connect(IBridgeRing from, ICoreRing to);
    void connect(ICoreRing from, IPlatformRing to);
    void connect(IPlatformRing from, IInterfaceRing to);
    void connect(IInterfaceRing from, IFrontRing to);
}
```

### The Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT                                                          │
│  ├── meta.aidl        ← Architecture definition (Rings, connections)  │
│  ├── BookmarkMgmt.aidl ← Management: Bookmark operations        │
│  ├── PostMgmt.aidl     ← Management: Post operations            │
│  └── PersonMgmt.aidl   ← Management: Person operations          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  aidl-spiral                                                   │
│  1. Parse meta.aidl → Architecture model                        │
│  2. Parse *.aidl → Management models                            │
│  3. For each Management:                                        │
│     - Walk Ring connections                                     │
│     - Generate boundary code at each step                       │
│  4. Output structured by Ring                                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT (for BookmarkMgmt)                                      │
│  ├── ring0-contract/IBookmarkMgmt.aidl                          │
│  ├── ring1-binding/BookmarkMgmtClient.java                      │
│  ├── ring2-bridge/jni_glue.rs                                   │
│  ├── ring3-core/bookmark_service.rs                             │
│  ├── ring4-platform/bookmark_platform.rs                        │
│  ├── ring5-interface/bookmark_commands.rs                       │
│  └── ring6-front/bookmark_adaptor.ts                            │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Is Powerful

1. **Same syntax**: No new configuration language to learn
2. **Versionable**: `meta.v1.aidl`, `meta.v2.aidl` for architecture evolution
3. **Swappable**: Change `meta.aidl` to switch from Tauri to Electron, from Radicle to IPFS
4. **Self-documenting**: The architecture is explicit, typed, conserved
5. **Recursive**: AIDL configures the generator that generates from AIDL

### The Deepest Insight

> *"Even the idea of conservation needs conservation."*

`meta.aidl` is the conservation of **how we conserve**—the pattern by which structure propagates across Rings. It makes the generator itself generatable, configurable, versionable.

The spiral returns, but on a different plane: not just the code, but the **architecture of the code**, is now framed by AIDL.

---

*The spiral generates its own abstractions—and now, its own configuration.*
