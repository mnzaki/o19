# The Heddles 🏗️

> *"Patterns emerge from the rise and fall of threads."*

The [heddles](../) are the frames that raise and lower warp threads to create patterns. In our loom, they **match** spiral patterns to appropriate generators.

## What the Heddles Do

1. **Traverse** the spiral graph from WARP.ts exports
2. **Build** an intermediate representation (WeavingPlan) with nodes and edges
3. **Match** ring type pairs against the generator matrix
4. **Create** generation tasks for matched patterns

## The Weaving Plan (Intermediate Representation)

```typescript
interface WeavingPlan {
  edges: SpiralEdge[];           // All edges in the spiral graph
  nodesByType: Map<string, SpiralNode[]>;  // Nodes grouped by type
  managements: ManagementMetadata[];  // Management Imprints from loom/
  tasks: GenerationTask[];       // Matched generator tasks
  _isComplete: boolean;          // Safety flag
}
```

## Graph Structure

The spiral creates a tree/graph structure:

```
WARP.ts exports
    │
    ├──► foundframe (SpiralOut wrapping RustCore)
    │       └──► android (RustAndroidSpiraler)
    │       │       └──► RustCore
    │       └──► desktop (DesktopSpiraler)
    │               └──► RustCore
    │
    └──► tauri (SpiralOut)
            └──► SpiralMux [android, desktop]
                    ├──► innerRings: [android, desktop]
                    └──► tauri: TauriSpiraler (MuxSpiraler)
                            ├──► android
                            └──► desktop
```

## Muxing (Multiplexing)

**MuxSpiralers** (like `TauriSpiraler`) aggregate multiple platform rings:

```typescript
// WARP.ts
const tauri = loom.spiral(android, desktop).tauri.plugin();
```

**Edges created:**
1. `TauriSpiraler → RustAndroidSpiraler` (for Android platform files)
2. `TauriSpiraler → DesktopSpiraler` (for Desktop platform files)
3. `SpiralOut → TauriSpiraler` (via getEffectiveTypeName)

**Matrix matches:**
- `(TauriSpiraler, RustAndroidSpiraler) → generateTauriPlugin`
- `(TauriSpiraler, DesktopSpiraler) → generateTauriPlugin`

Each edge triggers generation of platform-specific adapter code.

## The Matching Process

1. **Traverse** each exported ring recursively
2. **Create nodes** for each SpiralRing encountered
3. **Create edges** between parent and child nodes
4. **Apply getEffectiveTypeName** for SpiralOuts wrapping spiralers
5. **Match edges** against the GeneratorMatrix
6. **Create tasks** for matching (currentType, previousType) pairs

### Edge Direction

```
Parent (outer ring) → Node (inner ring)
     │                       │
     │                       └── previous node in matrix
     └── current node in matrix
```

Matrix key: `${currentType}→${previousType}`

## Type Name Resolution

The `getEffectiveTypeName()` function determines what type name to use for matrix matching:

| Ring Type | inner | Result |
|-----------|-------|--------|
| `SpiralOut` | `Spiraler` | Use spiraler's constructor name |
| `SpiralOut` | `CoreRing` | "SpiralOut" |
| `SpiralMux` | spiraler property | Use spiraler's constructor name |
| `SpiralMux` | no spiraler | "SpiralMux" |
| `Spiraler` | - | Constructor name |
| `MuxSpiraler` | - | Constructor name |

This allows matching against `RustAndroidSpiraler` instead of generic `SpiralOut`.

## Generator Matrix

The matrix maps type pairs to generator functions:

```typescript
matrix.setPair('RustAndroidSpiraler', 'RustCore', generateAndroidService);
matrix.setPair('TauriSpiraler', 'RustAndroidSpiraler', generateTauriPlugin);
matrix.setPair('TauriSpiraler', 'DesktopSpiraler', generateTauriPlugin);
```

## Safety: Phase Guard

The plan has `_isComplete: boolean` to prevent premature access:

```typescript
// ❌ DON'T do this during heddles phase
plan.nodesByType.get('RustAndroidSpiraler'); // May be incomplete!

// ✅ SAFE during weaving phase
ensurePlanComplete(plan, 'access nodesByType');
plan.nodesByType.get('RustAndroidSpiraler'); // Guaranteed complete
```

## Directory Structure

```
heddles/
├── pattern-matcher.ts    # Core matching logic, WeavingPlan
├── index.ts              # Exports
└── README.md             # This file
```

---

*Part of the [machinery](../). Preceded by the [reed](../reed/), followed by the [bobbin](../bobbin/) which holds the thread to be woven.*
