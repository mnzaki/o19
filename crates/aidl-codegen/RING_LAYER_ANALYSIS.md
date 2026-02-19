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

**aidl-codegen** reads the AIDL and generates the boundary code based on the computed BoundaryType.

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
# aidl-codegen.yaml
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

## Next Steps

Before coding:
1. ~~Choose between Metaphor A and B (or synthesis)~~ → **Metaphor C: Boundaries**
2. Define the formal syntax for Architecture
3. Determine how Rings, Layers, Boundaries relate
4. Map current `aidl-codegen` to the chosen model

*The spiral generates its own abstractions.*
