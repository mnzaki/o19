# The Spiral Portal: AAAArchi meets Spire-Loom

> *"Through the portal, patterns recognize patterns."*

## Architectural Parallels

When the three friends (AAAArchi, Ferror, Orka) passed through the spiral portal guided by Kimi and zmnaki, they found themselves in a landscape remarkably similar to their own nature—a weaving loom where structure, error, and orchestration dance together.

### Spire-Loom's Architecture

```
WARP (Potential Field)
    │
    ├── Decorators collect metadata (@rust.Struct, @loom.link)
    └── Pure topology—no computation

REED (Collection)
    │
    ├── Scans workspace
    ├── Collects raw metadata from Management classes
    └── NO computation—just collection

HEDDLES (Pattern Matching & Enrichment)
    │
    ├── Matches spiral patterns (core → platform → tauri)
    ├── Computes derived metadata
    └── Looks up wrappers from linked structs

TREADLES (Orchestration)
    │
    ├── Sets up generation pipelines
    ├── Calls heddles for enriched metadata
    └── Passes to bobbins

BOBBINS (Rendering)
    │
    ├── Language-specific transformations
    ├── Template rendering (EJS)
    └── Final code generation

DECLARATIVE/IMPERATIVE (Language System)
    │
    ├── Declarative: Templates (what output looks like)
    ├── compileToImperative() transforms templates to methods
    └── Imperative: Runtime methods (how to generate)
```

### AAAArchi's Parallel Structure

```
WARP (Input Layer - packages/warp/)
    │
    ├── Decorators annotate functions/classes
    ├── Collects architectural metadata
    └── NO domain/layer resolution yet

MACHINERY/HEDDLES (Collection Layer - packages/machinery/heddles/)
    │
    ├── Reads warp metadata through heddles
    ├── Validates against architecture rules
    └── Builds enriched context (domain, layer, canDependOn)

REED/LANGUAGE (Rendering Layer - packages/reed/language/)
    │
    ├── Declarative: Architecture schema (DAG structure)
    ├── compileToImperative() transforms schema to validators
    └── Imperative: Runtime validation methods

AAAARCHI (The Foundation - packages/aaaarchi/)
    │
    ├── Provides DAG structure to all layers
    ├── Validates layer transitions
    └── Tracks execution history for Orka
```

## The Profound Parallel

| Spire-Loom | AAAArchi Parallel | Purpose |
|------------|-------------------|---------|
| **Warp** decorators | **Warp** decorators | Collect raw metadata |
| **Reed** collection | **Machinery/Heddles** enrichment | Build context from metadata |
| **Heddles** pattern matching | **Heddles** architectural validation | Validate against DAG |
| **Language declarative** | **Architecture schema** | Declare structure |
| **compileToImperative()** | **compileToImperative()** | Transform to executable |
| **Language imperative** | **Validation methods** | Runtime enforcement |
| **Treadles** orchestration | **Orka** orchestration | Saga/retry logic |
| **Bobbin** rendering | **Ferror** error rendering | Generate output |

## Key Insight: Two-Layer Pattern Everywhere

Both systems use the **declarative → imperative** compilation pattern:

### Spire-Loom's Language System
```typescript
// LAYER 1: DECLARATIVE (declarative.ts)
const language = {
  syntax: {
    composition: {
      importStatement: {
        source: 'import {{importSpec}} from {{modulePath}};'
      }
    }
  }
}

// Compilation bridge
compileToImperative(language) → {
  // LAYER 2: IMPERATIVE (imperative.ts)
  codeGen: {
    rendering: {
      renderImportStatement: (spec, path) => 
        mejs.renderTemplate(source, {spec, path})
    }
  }
}
```

### AAAArchi's Architecture System
```typescript
// LAYER 1: DECLARATIVE (schema.ts)
const architecture = {
  layers: {
    controller: { canDependOn: ['service'] },
    service: { canDependOn: ['repository'] },
    repository: { canDependOn: ['infrastructure'] }
  }
}

// Compilation bridge
compileToImperative(architecture) → {
  // LAYER 2: IMPERATIVE (validators.ts)
  validation: {
    canCall: (fromLayer, toLayer) => 
      dag.hasEdge(fromLayer, toLayer),
    detectViolation: (chain) =>
      findMissingLayers(chain, dag)
  }
}
```

## How AAAArchi Enhances Spire-Loom

### 1. Architectural Validation for Generators

Spire-Loom's generators (treadles) currently don't validate if the code structure follows architectural rules. AAAArchi can provide:

```typescript
// In a treadle generator
@Orka.validateArchitecture()
async function generateAndroidService(mgmt: LanguageMgmt) {
  // AAAArchi validates:
  // - Does this service call only allowed layers?
  // - Are there circular dependencies?
  // - Is the layer skip valid?
}
```

### 2. Unified Metadata Collection

Currently, spire-loom collects metadata in multiple places (warp decorators, reed, heddles). AAAArchi provides a unified accumulator:

```typescript
// Instead of multiple collection points:
const scope = AAAArchi.forFile(import.meta.url);

// Warp decorators use the same accumulator
@rust.Struct({ useResult: true })
class Foundframe {
  @rust.Mutex @rust.Option thestream = TheStream;
}

// AAAArchi knows this class is in domain='core', layer='infrastructure'
// and can validate @rust.Mutex is allowed here
```

### 3. Ferror Integration for Generator Errors

When generators fail, they can use Ferror's contextual errors:

```typescript
// In a treadle, when validation fails:
throw ferror(new Error('Invalid layer transition'), {
  stance: 'authoritative',
  summary: 'Service cannot directly call Infrastructure',
  explanation: 'Missing Repository layer in call chain',
  suggestions: [
    { action: 'add-repository', message: 'Add Repository between Service and Infrastructure' }
  ],
  // domain/layer auto-resolved from AAAArchi context!
});
```

### 4. Orka Sagas for Generator Pipelines

Complex generation pipelines can use Orka's saga pattern:

```typescript
@Orka.saga({
  steps: [
    { layer: 'reed', execute: parseManagement, compensate: cleanupParse },
    { layer: 'heddles', execute: enrichMetadata, compensate: revertEnrichment },
    { layer: 'bobbin', execute: renderTemplate, compensate: deleteOutput }
  ]
})
async function generateFullStack(mgmt: LanguageMgmt) {
  // If bobbin fails, saga automatically:
  // 1. Deletes rendered file
  // 2. Reverts metadata enrichment
  // 3. Cleans up parsed data
}
```

## The Unified Vision

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER CODE (loom/WARP.ts)                        │
│                                                                         │
│  @rust.Struct({ useResult: true })                                      │
│  class Foundframe {                                                     │
│    @rust.Mutex @rust.Option thestream = TheStream;                      │
│  }                                                                      │
│                                                                         │
│  @loom.link(foundframe.inner.core.thestream)                            │
│  class BookmarkMgmt {                                                   │
│    addBookmark(): void { ... }                                          │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ decorators collect metadata
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     AAAARCHI WARP LAYER                                 │
│                                                                         │
│  Scope: domain='core', layer='infrastructure'                           │
│  Annotations: { struct: Foundframe, wrappers: ['Mutex', 'Option'] }     │
│                                                                         │
│  Scope: domain='core', layer='service'                                  │
│  Annotations: { mgmt: BookmarkMgmt, link: thestream }                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ heddles enrich
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     HEDDLES ENRICHMENT                                  │
│                                                                         │
│  For BookmarkMgmt.addBookmark:                                          │
│  - Follow link to Foundframe.thestream                                  │
│  - Extract wrappers: ['Mutex', 'Option']                                │
│  - Get useResult: true                                                  │
│  - Validate: service → infrastructure? NO (missing repository!)         │
│  - Ferror: throw if invalid transition                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ treadles orchestrate
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     TREADLE GENERATION                                  │
│                                                                         │
│  @Orka.saga({ steps: [parse, enrich, render] })                         │
│  async function generate() {                                            │
│    // Use declarative language config                                   │
│    const lang = declareLanguage({ syntax: {...} })                      │
│    // Compile to imperative methods                                     │
│    const imperative = compileToImperative(lang)                         │
│    // Generate code                                                     │
│    return imperative.codeGen.rendering.renderService(mgmt)              │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: AAAArchi as Foundation
1. Stabilize `@o19/aaaarchi` DAG builder
2. Add file-scope decorator support matching spire-loom's pattern
3. Implement `compileToImperative()` for architecture schemas

### Phase 2: Ferror Integration
1. Ferror queries AAAArchi for domain/layer in spire-loom context
2. Add architectural violation detection to generators
3. Rich error messages with suggestions

### Phase 3: Orka Orchestration
1. Saga decorators for complex generator pipelines
2. Retry logic with chain-aware escalation
3. Audit logging for generation events

### Phase 4: Unified Language System
1. Merge spire-loom's language declarative/imperative with AAAArchi's architecture schema
2. Single `compileToImperative()` for both code generation AND validation
3. Unified metadata model across both systems

## The Meta-Pattern

Both spire-loom and AAAArchi discovered the same truth:

> **Structure is potential. Compilation makes it executable. Orchestration makes it resilient.**

The warp dreams (declarative).  
The heddles interpret (compilation).  
The treadles manifest (imperative).  
The orca coordinates (resilience).

Through the spiral portal, the friends found not just a new home, but a **reflection of themselves**—the same patterns, the same wisdom, expressed in different forms.

---

*The spiral recognizes the spiral. The pattern is conserved.*
