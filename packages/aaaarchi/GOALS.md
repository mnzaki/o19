# 🦏 AAAArchi Goals & Current State

## What is AAAArchi?

**AAAArchi** (Architecture Annotating Aardvark Archi) is one of **The Three Friends**:

| Friend | Package | Role | Mascot |
|--------|---------|------|--------|
| **AAAArchi** 🦏 | `@o19/aaaarchi` | Foundation - Architecture mapping & DAG validation | Aardvark |
| **Ferror** 🦀 | `@o19/ferror` | Context - Rich error handling | Crab |
| **Orka** 🐋 | `@o19/orka` | Resilience - Saga orchestration | Orca |

**The Three Friends** guide all work in the [Barn Architecture Academy](../../../BAArn/).

## Current State (MVP)

### ✅ What Works

| Feature | Status | Notes |
|---------|--------|-------|
| `forFile()` | ✅ | File scope detection with domain/layer inference |
| `annotate()` | ✅ | Decorator metadata collection |
| `canCall()` | ✅ | Layer transition validation |
| `validatePath()` | ✅ | Multi-layer path violation detection |
| `buildProjectDAG()` | ✅ | Full project DAG construction |
| Default layers | ✅ | domain→usecase→repository→service→controller→infrastructure |

### 🟡 What's Partial

| Feature | Status | Gap |
|---------|--------|-----|
| Path inference | 🟡 | Simple string matching, needs config file support |
| DAG violations | 🟡 | Returns empty array, needs implementation |
| Attempt history | 🟡 | Storage exists, Orka integration pending |

### 🟡 What's Partial

| Feature | Status | Description |
|---------|--------|-------------|
| `compileToImperative()` | ✅ Core done | Needs integration testing with Ferror |
| `toMermaid()` | ✅ Done | In utils.ts |
| Config file support | 🟡 | `.aaarchirc.json` or similar |
| Cross-domain validation | 🟡 | Handle domain→domain dependencies |

## The Profound Parallel

SPIRAL_PORTAL.md reveals AAAArchi and spire-loom share the **same two-layer pattern**:

| Spire-Loom | AAAArchi Parallel |
|------------|-------------------|
| Warp decorators | Warp decorators |
| Reed collection | File scope accumulation |
| Heddles pattern matching | DAG validation |
| Language declarative | Architecture schema |
| `compileToImperative()` | ✅ **`compileToImperative()` ← DONE** |
| Language imperative | ✅ Validation methods ← DONE |

Both discovered:
> *"Structure is potential. Compilation makes it executable. Orchestration makes it resilient."*

## The Three Friends Integration

### 🦏 AAAArchi + 🦀 Ferror

```typescript
// Ferror queries AAAArchi for domain/layer
const ferror = ferroringModule().user.service;

throw ferror(new Error('Layer skip'), {
  function: 'UserController',
  stance: 'authoritative',
  summary: 'Controller bypasses service layer',
  // domain/layer auto-resolved from AAAArchi context!
});
```

### 🦏 AAAArchi + 🐋 Orka

```typescript
// Orka tracks attempts per layer
Orka.saga({
  steps: [{
    layer: 'validation',
    execute: async () => {
      const scope = AAAArchi.forFile(import.meta.url);
      // AAAArchi tracks this attempt for retry escalation
      if (!scope.canCall(targetLayer)) {
        throw new Error('Architecture violation');
      }
    }
  }]
});
```

## Goals by Phase

### Phase 1: Foundation (✅ DONE)
- ✅ File scope detection
- ✅ Basic annotation API
- ✅ Layer transition validation
- ✅ Project DAG building

### Phase 2: Compilation (✅ DONE)
Declarative→imperative pattern implemented:

```typescript
// Input: Declarative schema
const schema = {
  layers: { controller: { canDependOn: ['service'] }, ... }
};

// Output: Imperative validators (O(1) lookups!)
const imperative = compileToImperative(schema);
imperative.canCall('controller', 'service'); // O(1) - precomputed
imperative.validatePath(['controller', 'repository']); // Returns violation + fix
imperative.getPath('controller', 'repository'); // Pre-computed shortest path
```

### Phase 3: BAArn Integration (IN PROGRESS)
The BAArn demo `scrim-loom/` shows the friends in action:

```
BAArn/demos/scrim-loom/
├── Uses AAAArchi for validation
├── Uses Ferror for rich errors  
├── Uses Orka for saga resilience
└── Integrates with spire-loom
```

**Goal:** Graduate patterns from BAArn to production.

### Phase 4: Visualization (FUTURE)
```typescript
// Generate architecture diagrams
const mermaid = AAAArchi.toMermaid();
const d2 = AAAArchi.toD2();
```

## Core API (Stable)

```typescript
// Entry point - get scope for current file
const scope = AAAArchi.forFile(import.meta.url);

// Get architectural context
const ctx = scope.getContext();
// { domain, layer, canDependOn, invariant, file, function }

// Validate layer transition
if (!scope.canCall('repository')) {
  // Violation!
}

// Validate full path
const violations = AAAArchi.validatePath([
  'controller', 
  'repository'  // Missing 'service'!
]);

// Get full project view
const dag = AAAArchi.buildProjectDAG();
```

## Design Principles

1. **Declarative → Imperative**
   - Config is declarative (JSON/schema)
   - Runtime uses compiled imperative validators
   - Fast path validation

2. **File Scope is Key**
   - Every file has an architectural scope
   - Scope = domain + layer + permissions
   - Decorators register in file scope

3. **DAG is Source of Truth**
   - All validation derives from DAG
   - DAG built from accumulated file scopes
   - Visualizable, inspectable

4. **Three Friends Share Context**
   - AAAArchi provides structure
   - Ferror adds error context
   - Orka adds execution history
   - All share the same file scope

## Relationship to Other Systems

### vs Spire-Loom

**Not the same. Complementary.**

| Aspect | Spire-Loom | AAAArchi |
|--------|------------|----------|
| Purpose | Code generation weaving | Architecture validation |
| Decorators | `@rust.Struct`, `@loom.link` | `@annotate()` for metadata |
| Output | Generated code | Validation results + DAG |
| Integration | Uses AAAArchi for validation | Used by generators |

The BAArn demo `scrim-loom/` shows them working together.

### vs BAArn

The BAArn **uses** the Three Friends:
- `demos/scrim-loom/` — Demonstrates integration
- `experiments/` — Test friend patterns
- `lessons/` — Teach friend concepts

## Success Metrics

- [x] ✅ `compileToImperative()` implemented with O(1) validators
- [x] ✅ Pre-computed path finding (shortest + all paths)
- [x] ✅ Compiled context validators for Ferror
- [x] ✅ Compiled chain validators for error stacks
- [x] ✅ Compiled suggestions generators
- [x] ✅ DAG visualization (`toMermaid()` in utils.ts)
- [ ] 🟡 Ferror integration tested in BAArn demos
- [ ] 🟡 Orka tracks validation attempts
- [ ] 🟡 BAArn scrim-loom demo graduates to production

## References

- **SPIRAL_PORTAL.md** — Profound parallel with spire-loom
- **BAArn/lessons/the-three-friends.md** — Three Friends guide
- **BAArn/demos/scrim-loom/** — Working integration demo

---

*🦏 The aardvark digs deep. The structure is revealed.*
