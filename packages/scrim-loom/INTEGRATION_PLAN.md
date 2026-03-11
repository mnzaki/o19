# Integration Plan: QueryableDivination into Scrim-Loom 🦡

> "Scrim-loom is the spiritual successor to spire-loom. Names should reflect continuity, not divergence."

## Naming Philosophy

| Don't Use | Use Instead | Reason |
|-----------|-------------|--------|
| `ScrimDivination` | `Divination` or `QueryableDivination` | Direct concept match |
| `ScrimHeddles.enrich()` | `Heddles.enrich()` (async version) | Same API, enhanced behavior |
| `ScrimValidationProvider` | `DivinationProvider` | Generic, reusable |
| `Weavvy.buildPlan()` | Keep as `Weavvy.buildPlan()` | Weavvy is a character name, distinct from Weaver |

## Core Integration

### 1. New Files (in `src/divination/`)

```typescript
// src/divination/divination.ts
// NOT scrim-divination.ts

export class Divination<T> implements QueryableDivination<T> {
  // Implements both:
  // - Queryable interface (for BoundQuery compatibility)
  // - Async resolution with round tracking
  
  lang: LanguageDefinitionImperative;
  tags?: string[];
  
  // From BAArn prototype
  resolve(): Promise<T>;
  watch(): AsyncGenerator<DivinationRound<T>>;
  
  // Queryable requirement
  cloneWithLang(lang: LanguageDefinitionImperative): Divination<T>;
}
```

```typescript
// src/divination/provider.ts
// Generic provider, not scrim-specific

export class DivinationProvider {
  // Resolves multiple divinations optimally
  // Tracks rounds across all divinations
  // Integrates with mejs for placeholder re-rendering
  
  async *resolveAll(divinations: Divination<any>[]): AsyncGenerator<{
    round: number;
    resolved: Divination<any>[];
    pending: Divination<any>[];
  }>;
}
```

### 2. Enhance Existing Files (no renaming)

#### `src/heddles/validator.ts`

The existing `ScrimHeddles` class (already named, keep it) gets a new method:

```typescript
export class ScrimHeddles {
  // EXISTING method (keep for compatibility)
  enrich(mgmt: ScrimManagement): ScrimManagement {
    // Synchronous validation
  }
  
  // NEW method - creates a Divination for async validation
  createDivination(
    mgmt: ScrimManagement,
    options: { lang: LanguageDefinitionImperative; tags?: string[] }
  ): Divination<ScrimManagement> {
    // Returns a Divination that resolves over multiple rounds
    // Round 1: Validate layer
    // Round 2: Validate link  
    // Round 3: Validate against DAG
  }
}
```

#### `src/weaver/wweavvy.ts`

Weavvy (the character) already extends Weaver. Keep the name.

```typescript
export class Weavvy extends Weaver {
  // EXISTING method signature (keep)
  async buildPlan(workspace: any, warp: any): Promise<WeavingPlan> {
    // CURRENT: calls super.buildPlan() then validates synchronously
    
    // NEW: Use divinations for progressive validation
    const divinations = this.extractDivinations(warp);
    
    for await (const round of this.resolveDivinations(divinations)) {
      // Yield progress
    }
    
    return plan;
  }
  
  // NEW private method
  private extractDivinations(warp: WARP): Divination<ScrimManagement>[] {
    return extractManagements(warp).map(m => 
      scrimHeddles.createDivination(m, { lang: this.primaryLang })
    );
  }
}
```

### 3. Entry Point (`src/index.ts`)

Add exports that feel like spire-loom:

```typescript
// Re-export divination system
export {
  Divination,
  DivinationProvider,
  createDivinationProvider,
  type DivinationRound,
  type DivinationConfig
} from './divination/index.js';

// Helper that feels natural in spire-loom ecosystem
export async function resolveWithTracking<T>(
  divination: Divination<T>
): Promise<{ value: T; rounds: number }> {
  let rounds = 0;
  for await (const round of divination.watch()) {
    rounds = round.round;
    if (round.complete) break;
  }
  return { value: divination.value!, rounds };
}
```

## Architecture Flow (After Integration)

```
WARP.ts uses loom decorators
        ↓
scrim-loom's wrapped spiral() (keeps same name)
        ↓
Heddles.createDivination() (NEW - async path)
        ↓
Divination.resolve() - Round 1: Layer check
        ↓
Divination.resolve() - Round 2: Link validation  
        ↓
Divination.resolve() - Round 3: DAG validation
        ↓
Weavvy.buildPlan() aggregates all divinations
        ↓
Weavvy.weave() executes with saga compensation
```

## Migration for Users

### Current (synchronous)
```typescript
import loom from '@o19/scrim-loom';

const heddles = loom.scrim.heddles;
const enriched = heddles.enrich(management); // Sync
```

### New (async with tracking)
```typescript
import loom, { resolveWithTracking } from '@o19/scrim-loom';

const divination = loom.scrim.heddles.createDivination(management, { 
  lang: loom.typescript,
  tags: ['service', 'bookmark']
});

// Option 1: Simple resolve
const management = await divination.resolve();

// Option 2: With round tracking
const { value, rounds } = await resolveWithTracking(divination);
console.log(`Resolved in ${rounds} rounds`);

// Option 3: Watch progress
for await (const round of divination.watch()) {
  console.log(`Round ${round.round}: ${round.resolved.size} validations complete`);
}
```

## Files to Create/Modify

### Create (new functionality)
- `src/divination/index.ts` - exports
- `src/divination/divination.ts` - Divination class
- `src/divination/provider.ts` - DivinationProvider

### Modify (enhance existing)
- `src/heddles/validator.ts` - add `createDivination()` method
- `src/weaver/wweavvy.ts` - use divinations in buildPlan()
- `src/index.ts` - export new APIs

### Keep Unchanged (already good names)
- `ScrimHeddles` - the class name (established)
- `Weavvy` - the mascot name (character)
- `ScrimManagement` - the type (domain-specific)
- `ArchitecturalViolation` - the error type

## The Aesthetic

> "Scrim-loom doesn't introduce new jargon. It extends spire-loom's vocabulary with async capabilities."

- `Divination` (new concept) - async, multi-round computation
- `Heddles.createDivination()` (new method) - creates divination from management
- `Weavvy` (existing) - the warthog weaver, now with divination powers
- `loom` (default export) - same API, enhanced internally

*the names echo spire-loom, the capabilities extend it* 🦡
