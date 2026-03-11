# 🦏 AAAArchi Improvements for Better Ferror Integration

## The Problem

**Ferror was duplicating AAAArchi's domain:layer abstractions:**

```typescript
// OLD: Ferror duplicates domain:layer with magic getters
const ferrorMod = ferroringModule();
const ferror = ferrorMod.user.service;  // Hardcoded "user:service"
throw ferror(error, { ... });  // May not match actual file context!
```

This creates a **conceptual mismatch**:
- AAAArchi has the "source of truth" for domain:layer (from file paths)
- Ferror was ignoring it and using hardcoded values
- Errors could claim "user:service" when actually in "user:controller"

## The Solution

**Ferror now USES AAAArchi's abstractions directly:**

```typescript
// NEW: Ferror uses AAAArchi.forFile() for domain:layer
throw Ferror.forFile(import.meta.url, error)
  .function('createUser')
  .summary('Failed')
  .build();  // domain:layer auto-resolved from file!
```

## What Changed

### 1. New Ferror API (`packages/ferror/src/ferror-next.ts`)

| Old | New |
|-----|-----|
| `ferrorMod.user.service` | `Ferror.forFile(import.meta.url)` |
| Hardcoded domain:layer | Auto-resolved from AAAArchi |
| Context at decoration time | Context at error time (fresh) |
| Magic getters | Builder pattern |

**Builder Pattern:**
```typescript
Ferror.forFile(import.meta.url, error)
  .function('createUser')           // Set function name
  .stance('authoritative')          // Set stance
  .summary('Failed to create user') // Set summary
  .explanation('Details here')      // Set explanation
  .suggest('retry', 'Try again')    // Add suggestion
  .suggestFromAnalysis()            // Auto-add from DAG
  .withContext('key', value)        // Add context
  .tag('critical')                  // Add tag
  .build();                         // Create Ferror
```

### 2. New AAAArchi Utilities (`packages/aaaarchi/src/utils.ts`)

**Path Finding:**
```typescript
import { findLayerPath } from '@o19/aaaarchi';

const path = findLayerPath(layers, 'controller', 'repository');
// Returns: ['controller', 'service', 'repository']
```

**Suggestion Generation:**
```typescript
import { generateSuggestions } from '@o19/aaaarchi';

const suggestions = generateSuggestions(layers, 'controller', 'repository');
// Returns: [
//   { type: 'add-layer', description: 'Add service between...', impact: 'medium' }
// ]
```

**Context Enrichment:**
```typescript
import { enrichContext } from '@o19/aaaarchi';

const enriched = enrichContext(context, layers, dag);
// Returns: { ..., position, depth, calledBy, description }
```

**DAG Analysis:**
```typescript
import { analyzeDAG } from '@o19/aaaarchi';

const analysis = analyzeDAG(dag, layers);
// Returns: { totalNodes, totalEdges, entryPoints, leafNodes, cycles, violations }
```

**Visualization:**
```typescript
import { toMermaid, toTreeView } from '@o19/aaaarchi';

const mermaid = toMermaid(dag);  // For documentation
const tree = toTreeView(layers); // For CLI output
```

## Key Improvements

### 1. Single Source of Truth

**Before:** Two sources of domain:layer (AAAArchi + Ferror hardcoded)
```typescript
// File: user/controller.ts
const ferror = ferrorMod.user.service;  // Says "service"
// But file is actually "controller"!
```

**After:** One source (AAAArchi)
```typescript
// File: user/controller.ts
Ferror.forFile(import.meta.url)  // Correctly says "controller"
```

### 2. Fresh Context Resolution

**Before:** Context captured at decoration time (stale)
```typescript
@ferror.annotate({...})  // Context from when decorator ran
```

**After:** Context resolved at error time (fresh)
```typescript
@ferrorHandler((ctx) => ({...}))  // Context from when error occurred
```

### 3. Rich Suggestions from DAG

**Before:** Static suggestions
```typescript
suggestions: [
  { action: 'fix', message: 'Fix it' }
]
```

**After:** Dynamic suggestions from DAG analysis
```typescript
.suggestFromAnalysis()  // Auto-generates from architecture
// "From controller, you can call: service, domain"
// "Expected path: controller → service → repository"
```

### 4. Better Visualization

**New:** Mermaid diagrams in errors
```typescript
const mermaid = toMermaid(dag, ['controller', 'service', 'repository']);
// Returns graph TD syntax highlighting the error path
```

## Migration Path

### Step 1: Keep Old API (Backward Compatible)

The old `ferroringModule()` API still works but is deprecated.

### Step 2: Adopt New API Gradually

```typescript
// Old
const ferror = ferrorMod.user.service;
throw ferror(error, { stance: 'authoritative', summary: '...' });

// New
throw Ferror.forFile(import.meta.url, error)
  .stance('authoritative')
  .summary('...')
  .build();
```

### Step 3: Use Utilities for Rich Errors

```typescript
import { generateSuggestions, toMermaid } from '@o19/aaaarchi';

const suggestions = generateSuggestions(layers, from, to);
const diagram = toMermaid(dag, errorPath);

throw Ferror.forFile(import.meta.url, error)
  .suggestions(suggestions)
  .withContext('diagram', diagram)
  .build();
```

## Architecture Alignment

This change aligns with the **Two-Layer Pattern** from SPIRAL_PORTAL.md:

```
AAAArchi (Foundation)
    ├── Domain:Layer abstractions (source of truth)
    ├── DAG structure
    └── Path finding / validation
            │
            └── Used by
                    │
                Ferror (Context)
                    ├── Rich error messages
                    ├── Suggestions from DAG
                    └── Violation detection
```

**Principle:** *Structure is potential. Compilation makes it executable.*

- AAAArchi provides the **structure** (domain:layer, DAG)
- Ferror uses it for **executable** error handling

## Files Changed

| File | Change |
|------|--------|
| `ferror/src/ferror-next.ts` | New API using AAAArchi abstractions |
| `aaaarchi/src/utils.ts` | New utilities for path finding, suggestions, visualization |
| `aaaarchi/src/index.ts` | Export utilities |
| `aaaarchi/examples/ferror-integration.ts` | Usage examples |

## Next Steps

1. **Implement `compileToImperative()`** for pre-computed validators
2. **Migrate BAArn demos** to new Ferror API
3. **Add visualization** to error output (Mermaid diagrams)
4. **Document** the new API patterns

---

*🦏 The aardvark provides the structure. The crab carries it with care.*
