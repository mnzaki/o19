# 🦡 Scrim-Loom Handoff Document

**Status:** Ready for next developer to continue  
**Current State:** API-compatible with spire-loom, basic validation working  
**Next Priority:** Integrate custom scrim decorators with the main loom flow

---

## What Works Now

### ✅ Drop-in Replacement Verified
```typescript
// WARP.ts imports from spire-loom but gets scrim-loom via symlink
import loom, { rust } from '@o19/spire-loom';
```

**Test result:**
```
🦡 Scrim: Spiral created from unknown layer (domain: app)
✅ WARP.ts loaded successfully!
✅ foundframe spiral exists
✅ fieldWrappers: ['Option', 'Mutex']
```

### ✅ API Compatibility
- All spire-loom exports re-exported
- All subpath exports (`/machinery/treadle-kit`, `/warp/spiral`, etc.) working
- Default `loom` object with `spiral`, `link`, `reach`, `crud`, `rust`, `typescript`

### ✅ Basic AAAArchi Integration
- `wrapSpiral()` detects file scope and logs layer info
- `wrapWeave()` has scaffolding for Weavvy integration (needs `__scrim: true`)

---

## Known Issues & Technical Debt

### 🔴 Issue 1: TWO Parallel Decorator Systems (CRITICAL)

**The Problem:**

We have TWO different decorator implementations that don't talk to each other:

1. **spire-loom's rust decorators** (used by WARP.ts):
   - `@rust.Mutex`, `@rust.Option` from `spire-loom/warp/rust.js`
   - Work via `Reflect.defineMetadata()`
   - Used by foundframe WARP.ts
   - NOT integrated with AAAArchi

2. **scrim's custom decorators** (in `src/warp/decorators.ts`):
   - `@scrim.Struct()`, `@scrim.Field()`, `@scrim.Link()`, `@scrim.Service()`
   - Fully integrated with AAAArchi (`forFile()`, `annotate()`)
   - Use Ferror for validation errors
   - **NOT exported in main index.ts loom object**

**Why This Matters:**
- The scrim decorators have rich validation but aren't being used
- WARP.ts uses rust decorators which bypass AAAArchi
- We're maintaining two code paths for the same functionality

**Possible Solutions:**

**Option A: Wrap spire-loom's rust decorators**
```typescript
// In src/index.ts, wrap rust decorators to add AAAArchi
export const rust = {
  ...spireRust,
  Struct: wrapRustStruct(spireRust.Struct),
  Mutex: wrapRustDecorator(spireRust.Mutex),
  Option: wrapRustDecorator(spireRust.Option),
};
```

**Option B: Bridge the metadata systems**
- After spire-loom decorators run, read their metadata
- Register with AAAArchi separately
- Keep both systems in sync

**Option C: Deprecate scrim decorators**
- Remove custom scrim decorators
- Focus on wrapping spire-loom's decorators instead
- Simpler but less control

**Recommendation:** Option A - wrap existing decorators to add validation transparently

---

### 🟡 Issue 2: Heddles Validator Not Integrated

**The Problem:**

`src/heddles/validator.ts` has a full `ScrimHeddles` class with:
- Layer validation
- Link target validation  
- DAG-based circular dependency detection
- Ferror integration

**But it's NOT used by:**
- `wrapSpiral()` in index.ts (just logs, doesn't validate)
- `Weavvy.buildPlan()` (has scaffolding but not wired up)

**Integration Point:**
```typescript
// In Weavvy.buildPlan() or wrapSpiral()
const enriched = scrimHeddles.enrich({
  name: mgmtName,
  layer: detectedLayer,
  domain: detectedDomain,
  methods: extractedMethods
});
scrimHeddles.throwIfErrors(enriched);
```

---

### 🟡 Issue 3: Weavvy Not Used by Default

**The Problem:**

```typescript
// In wrapWeave()
const useScrim = (ur as any)?.__scrim ?? false;
if (useScrim) {
  // Use Weavvy
} else {
  return spireWeave(ur, w!);  // <-- Default path doesn't use Weavvy!
}
```

Weavvy exists but is opt-in via `__scrim: true`. To make it default:

```typescript
// Option 1: Flip the default
const useSpire = (ur as any)?.__spire ?? false;
if (useSpire) {
  return spireWeave(ur, w!);
} else {
  // Use Weavvy by default
}

// Option 2: Always use Weavvy but with spire-loom compatibility mode
const weavvy = createWeavvy({ 
  validateArchitecture: true,
  fallbackToSpire: true  // New option
});
```

---

### 🟢 Issue 4: Dead Code

**Can be removed:**

1. **Scrim namespace constructor call** (index.ts line 219):
```typescript
// This creates an instance just to get constructor:
Weavvy: createWeavvy().constructor as any,
// Replace with:
Weavvy: WeavvyClass,  // Export the class directly
```

2. **Reflect metadata shim** (decorators.ts lines 280-302):
```typescript
// spire-loom already imports 'reflect-metadata'
// This shim is redundant
```

**Should keep (for now):**

- Machinery stubs - necessary for API compatibility
- Warp stubs - necessary for subpath imports

---

## File-by-File Analysis

### Core Files

| File | Status | Notes |
|------|--------|-------|
| `src/index.ts` | ✅ Working | Main entry, API compatible |
| `src/warp/decorators.ts` | 🟡 Unused | Rich decorators not integrated |
| `src/heddles/validator.ts` | 🟡 Unused | Validation logic ready but not wired |
| `src/weaver/wweavvy.ts` | 🟡 Partial | Works but not default |

### Stubs (Necessary for API compatibility)

| File | Purpose |
|------|---------|
| `src/machinery/*/index.ts` | Re-export spire-loom subpaths |
| `src/warp/*.ts` | Re-export spire-loom warp subpaths |
| `src/cli/index.ts` | Re-export CLI |

---

## Next Steps (Priority Order)

### 1. Integrate Rust Decorators with AAAArchi (HIGH)
**Goal:** Make `@rust.Mutex`, `@rust.Struct` etc. trigger AAAArchi validation

```typescript
// In src/index.ts
function wrapRustStruct(originalStruct: any) {
  return function(...args: any[]) {
    // Call original
    const result = originalStruct(...args);
    
    // Add AAAArchi annotation
    const scope = AAAArchi.forFile(import.meta.url);
    scope.annotate(result, { ... });
    
    return result;
  };
}
```

### 2. Wire Up Heddles Validator (HIGH)
**Goal:** Actually use the validation logic in ScrimHeddles

- Call `scrimHeddles.enrich()` in `wrapSpiral()` or `Weavvy.buildPlan()`
- Decide on throw vs warn behavior
- Test with intentional violations

### 3. Make Weavvy the Default (MEDIUM)
**Goal:** Use Weavvy for weaving by default

- Flip the `__scrim` check or remove it
- Ensure compensation logic works
- Test error scenarios

### 4. Consolidate Decorators (MEDIUM)
**Decision needed:** Keep scrim custom decorators or remove them?

- If keep: Export them properly and document when to use
- If remove: Delete `src/warp/decorators.ts` and focus on wrapping

### 5. Cleanup (LOW)
- Remove dead code
- Add proper JSDoc
- Update README with actual usage

---

## Testing Strategy

### Current Test
```bash
cd demos/foundframe
node --import=tsx test-import.ts
```

### Recommended New Tests

1. **Decorator validation test:**
```typescript
// Should throw with Ferror when layer is invalid
@rust.Struct({ layer: 'invalid-layer' })
class BadStruct {}
```

2. **Layer skip detection:**
```typescript
// Should detect controller→repository skip
@scrim.Service({ layer: 'controller', link: 'repository.Thing' })
class BadService {}
```

3. **Weaving with violations:**
```typescript
// Should provide rich error context
const result = await loom.weave(warp, { __scrim: true });
// Should throw Ferror with suggestions
```

---

## Architecture Decision Needed

### The Core Question

**Should scrim-loom:**

A) **Wrap spire-loom** (current approach, needs completion)
   - Transparent to users
   - Same API
   - Validation "invisible" until errors

B) **Extend spire-loom** (alternative)
   - Export additional scrim-specific APIs
   - Users opt-in to validation
   - More explicit but more work for users

C) **Fork spire-loom** (not recommended)
   - Full copy with modifications
   - Maintenance nightmare
   - Breaks compatibility

**Current approach is A** — finish the wrapping implementation.

---

## Quick Reference

### Key Exports
```typescript
// From src/index.ts
export { rust, typescript, Management, crud, reach, link, spiral } from '@o19/spire-loom';
export { scrimHeddles, ScrimHeddles } from './heddles/index.js';
export { Weavvy, createWeavvy } from './weaver/index.js';
export const scrim = { heddles, createWeavvy, Weavvy };
export default loom;  // Compatible with spire-loom
```

### Key Types
```typescript
// ScrimManagement from heddles/validator.ts
interface ScrimManagement {
  name: string;
  layer: string;
  domain: string;
  _violations?: ArchitecturalViolation[];
  _computed?: { canGenerate, validTargets, dagContext };
}
```

### Three Friends Integration Points
```typescript
// AAAArchi: File scope detection
const scope = AAAArchi.forFile(import.meta.url);
const ctx = scope.getContext();  // { domain, layer, ... }

// Ferror: Rich error creation
const ferror = ferroringModule().scrim.weaver;
throw ferror(error, { function, stance, summary, suggestions });

// Orka: Saga execution (stub)
const saga = Orka.saga({ steps: [...], onCompensationFailure: ... });
const result = await saga.execute({ maxAttempts: 3 });
```

---

## Contact & Context

**Created by:** Kimi (o19 spiral stream)  
**Date:** 2026-03-11  
**APP Document:** `.kimi/o19/1NBOX/APP-001-scrim-loom-api-compatibility.md`  
**Demo:** `demos/foundframe/` - working example with unmodified WARP.ts

**For next developer:**
1. Read this HANDOFF.md
2. Check APP-001 for original plan
3. Run `cd demos/foundframe && node --import=tsx test-import.ts` to verify
4. Pick an issue from "Next Steps" above
5. Update this document as you go

---

*"The warthog digs deep, but sometimes needs help finishing the burrow."* 🦡
