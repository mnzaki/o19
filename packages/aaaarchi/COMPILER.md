# 🦏 AAAArchi Compiler

> *"Structure is potential. Compilation makes it executable."*

## The Two-Layer Pattern

AAAArchi follows the **declarative → imperative** compilation pattern:

```
LAYER 1: DECLARATIVE (What)
┌─────────────────────────────────────────┐
│  ArchitectureConfig                     │
│  ├── layers: {                          │
│  │   controller: {                      │
│  │     canDependOn: ['service']         │
│  │   }                                   │
│  │ }                                     │
│  └── domains: {...}                     │
└─────────────────────────────────────────┘
                    │
                    │ compileToImperative()
                    ▼
LAYER 2: IMPERATIVE (How)
┌─────────────────────────────────────────┐
│  ImperativeArchitecture                 │
│  ├── canCall(from, to) → O(1)           │
│  ├── validatePath() → pre-computed      │
│  ├── getPath() → cached shortest path   │
│  └── transition table (Map)             │
└─────────────────────────────────────────┘
```

## Why Compilation?

### Performance

**Without compilation** (runtime path finding):
```typescript
// O(n) where n = number of layers
function canCall(from, to) {
  return findPath(layers, from, to) !== null; // BFS each time!
}
```

**With compilation** (pre-computed):
```typescript
// O(1) - table lookup
function canCall(from, to) {
  return transitionTable.get(`${from}:${to}`); // Instant!
}
```

### Pre-computed Lookups

| Operation | Without Compilation | With Compilation |
|-----------|---------------------|------------------|
| `canCall()` | O(n) path finding | O(1) Map lookup |
| `getPath()` | O(n) BFS | O(1) cache read |
| `validatePath()` | O(n×m) | O(1) table lookups |
| `detectCycle()` | O(n) | O(1) Set checks |

## Usage

### Basic Compilation

```typescript
import { compileToImperative } from '@o19/aaaarchi';

const config = {
  layers: {
    controller: { canDependOn: ['service'], position: 3 },
    service: { canDependOn: ['repository'], position: 2 },
    repository: { canDependOn: [], position: 1 },
  }
};

// Compile once, use many times
const imperative = compileToImperative(config);

// O(1) lookups!
imperative.canCall('controller', 'service');     // true
imperative.canCall('controller', 'repository');  // false
```

### Path Validation

```typescript
const result = imperative.validatePath([
  'controller',
  'repository'  // Skip!
]);

console.log(result);
// {
//   valid: false,
//   violations: [{
//     type: 'layer-skip',
//     from: 'controller',
//     to: 'repository',
//     explanation: 'Missing intermediate layer(s): service',
//     fix: 'Use path: controller → service → repository',
//     severity: 'error'
//   }],
//   suggestedPath: ['controller', 'service', 'repository']
// }
```

### Pre-computed Paths

```typescript
// Shortest path (pre-computed)
const path = imperative.getPath('controller', 'repository');
// ['controller', 'service', 'repository']

// All paths (pre-computed with depth limit)
const allPaths = imperative.getAllPaths('controller', 'repository');
// [
//   ['controller', 'service', 'repository'],
//   ['controller', 'service', 'domain', 'repository']  // If exists
// ]
```

## Compiled Functions

### 1. Context Validator

For Ferror integration - validates if a context can call a layer:

```typescript
import { compileContextValidator } from '@o19/aaaarchi';

const validate = compileContextValidator(config);

const context = {
  domain: 'user',
  layer: 'controller',
  function: 'create',
  file: '/app/user/controller.ts',
  canDependOn: ['service'],
};

const result = validate(context, 'repository');
// Returns: { valid, violations, suggestedPath }
```

### 2. Chain Validator

Validates error stack traces:

```typescript
import { compileChainValidator } from '@o19/aaaarchi';

const validateChain = compileChainValidator(config);

const callStack = ['api', 'controller', 'service', 'repository'];
const result = validateChain(callStack);
// Checks each transition in the chain
```

### 3. Suggestions Generator

Rich fix suggestions for violations:

```typescript
import { compileSuggestionsGenerator } from '@o19/aaaarchi';

const suggest = compileSuggestionsGenerator(config);

const suggestions = suggest('controller', 'repository');
// [
//   {
//     type: 'add-layer',
//     description: 'Use intermediate layer(s): service',
//     path: ['controller', 'service', 'repository'],
//     impact: 'medium'
//   },
//   {
//     type: 'reconfigure',
//     description: 'Allow controller to depend on repository',
//     impact: 'high'
//   }
// ]
```

## Caching

Compiled architectures are cached by config hash:

```typescript
// First call - compiles
const impl1 = compileToImperative(config);

// Second call - returns cached instance
const impl2 = compileToImperative(config);

console.log(impl1 === impl2); // true

// Clear cache if needed (e.g., hot reload)
import { clearCompilationCache } from '@o19/aaaarchi';
clearCompilationCache();
```

## Implementation Details

### Pre-computed Tables

The compiler builds these lookup tables:

```typescript
// Transition table: `${from}:${to}` → boolean
transitionTable = new Map([
  ['controller:service', true],
  ['controller:repository', false],
  // ...
]);

// Shortest paths: `${from}:${to}` → string[]
shortestPaths = new Map([
  ['controller:repository', ['controller', 'service', 'repository']],
  // ...
]);

// Position in onion: layer → number
positionTable = new Map([
  ['controller', 3],
  ['service', 2],
  ['repository', 1],
  // ...
]);
```

### Algorithm Complexity

**Compilation (once):**
- Path finding: O(n³) using optimized BFS for all pairs
- Table building: O(n²) for transition table
- Caching: O(1) hash lookup

**Runtime (many):**
- All lookups: O(1)
- Memory: O(n²) for tables

Where n = number of layers (typically < 10)

## Comparison with Runtime Validation

### Scenario: 1000 validation checks

**Runtime approach:**
```
1000 × O(n) = 1000 × 5 = 5000 operations
```

**Compiled approach:**
```
Compile: O(n³) = 125 operations (once)
1000 × O(1) = 1000 operations
Total: 1125 operations
Speedup: 4.4x
```

## Integration with Ferror

```typescript
import { compileToImperative } from '@o19/aaaarchi';
import { FerrorNext as Ferror } from '@o19/ferror';

const config = { /* ... */ };
const imperative = compileToImperative(config);

function validateCall(from: string, to: string) {
  if (!imperative.canCall(from, to)) {
    const result = imperative.validatePath([from, to]);
    const violation = result.violations[0];
    
    throw Ferror.forFile(import.meta.url)
      .summary(violation.explanation)
      .suggest('fix', violation.fix)
      .withContext('proper_path', result.suggestedPath)
      .build();
  }
}
```

## Architecture Alignment

This implements the **Two-Layer Pattern** from SPIRAL_PORTAL.md:

| Layer | Spire-Loom | AAAArchi |
|-------|------------|----------|
| Declarative | `LanguageDefinition` | `ArchitectureConfig` |
| Compilation | `compileToImperative()` | ✅ `compileToImperative()` |
| Imperative | `ImperativeLanguage` | `ImperativeArchitecture` |

## Files

- `src/compiler.ts` - Compiler implementation
- `examples/compiler-usage.ts` - Usage examples
- `GOALS.md` - Phase 2 marked complete

## References

- SPIRAL_PORTAL.md - The two-layer pattern
- Compiler.md - This document
- GOALS.md - Project goals

---

*Compilation transforms structure into speed. The aardvark digs once, runs forever.* 🦏
