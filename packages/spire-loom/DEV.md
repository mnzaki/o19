# Spire-Loom Architecture & Data Flow

## The Weaving Metaphor

The loom weaves code from patterns (like a textile loom weaves fabric from threads):

```
WARP (Patterns)                WEFT (Generation)
     |                              |
loom/*.ts (User)                 Generated Code
     |                              |
     v                              ^
+---------+     +---------+     +---------+     +---------+     +---------+
|  REED   | --> | HEDDLES | --> |TREADLES | --> |  CHAIN  | --> | BOBBINS |
+---------+     +---------+     +---------+     +---------+     +---------+
  Collect        Enrich          Orchestrate      Tie-Up         Render
  (parse)        (compute)       (weave)         (midstage)      (templates)
```

### The Chain (New!)
**Location**: `machinery/chain/`

The Chain is the **tie-up** that binds schema to spire. For ORM generation:
1. **Reed** parses Drizzle schema (imports the module)
2. **Chain** generates midstage → compiles → runs → outputs `*.gen.rs`
3. **Bobbin** includes generated code in final output

The Chain enables **zero-runtime-cost ORM** — all query compilation happens at generation time.

## Data Flow Principles

### 1. REED - Collection Only
**Location**: `machinery/reed/`

The reed scans the workspace and collects **immediately available metadata** from `loom/*.ts` files.

**What it does:**
- Parses Management classes and their decorators
- Extracts method signatures
- Collects `@rust.Struct` config as-is (no interpretation)
- Stores link targets (e.g., `foundframe.inner.core.thestream`)

**What it does NOT do:**
- Compute derived values
- Look up wrapper types from linked structs
- Resolve references
- Add metadata not explicitly present in source

**Example:**
```typescript
// REED collects this as-is:
@rust.Struct({ useResult: true })
class Foundframe { ... }

// Result: { name: 'Foundframe', rustConfig: { useResult: true } }
// No computation, just collection.
```

### 2. HEDDLES - Pattern Matching & Enrichment
**Location**: `machinery/heddles/`

The heddles raise/lower warp threads based on patterns. They **enrich** the collected metadata with **computed values**.

**What it does:**
- Matches spiral patterns (core → platform → tauri)
- Computes derived metadata from relationships
- Looks up wrapper types (`@rust.Mutex`, `@rust.Option`) from linked structs
- Propagates `useResult` from struct to methods
- Adds method-level metadata that's computable from ownership

**Key Principle:**
Methods don't carry all their metadata - look at their owner (Management) and follow links to compute what's missing.

**Example:**
```typescript
// HEDDLES computes for BookmarkMgmt methods:
// 1. Find linked struct: foundframe.inner.core.thestream
// 2. Look up field wrappers: ['Mutex', 'Option']
// 3. Check struct config: { useResult: true }
// 4. Enrich each method with:
//    { wrappers: ['Mutex', 'Option'], useResult: true }
```

### 3. TREADLES - High-Level Orchestration
**Location**: `machinery/treadles/`

The treadles are the high-level levers and pedals that trigger weaving. They **orchestrate** the generation process without computing metadata.

**What it does:**
- Sets up generation pipelines
- Calls heddles to get enriched metadata
- Passes enriched data to bobbins
- Handles file I/O and workspace integration

**What it does NOT do:**
- Compute useResult, wrappers, or other metadata
- Transform method signatures
- Add computed fields

### 4. BOBBINS - Final Rendering
**Location**: `machinery/bobbin/`

The bobbins hold the weft threads (templates) and do the final rendering.

**What it does:**
- Language-specific transformations (e.g., snake_case, type mapping)
- Template rendering with EJS
- Final code generation

**What it does NOT do:**
- Compute high-level metadata (useResult, wrappers)
- Resolve links or relationships
- Access struct configs

**Allowed Transformations:**
- Convert `bookmarkAdd` → `bookmark_add` (naming)
- Convert `string` → `String` (type mapping)
- Build `Result<T, E>` from `useResult: true` + `innerReturnType: T`

**NOT Allowed:**
- Look up `@rust.Struct({ useResult })` config
- Access field wrappers from linked struct
- Resolve which struct a method belongs to

## Correct Metadata Flow

```
loom/WARP.ts:
  @rust.Struct({ useResult: true })
  class Foundframe {
    @rust.Mutex @rust.Option thestream = TheStream;
  }

  @loom.link(foundframe.inner.core.thestream)
  class BookmarkMgmt {
    addBookmark(): void { ... }
  }

REED collects:
  Management: { name: 'BookmarkMgmt', link: thestreamLayer, methods: [...] }
  Struct: { name: 'Foundframe', config: { useResult: true }, fields: { thestream: { wrappers: ['Mutex', 'Option'] } } }

HEDDLES enriches (pattern: struct → management → methods):
  For BookmarkMgmt.addBookmark:
    - Follow link to thestream
    - Get field wrappers: ['Mutex', 'Option']
    - Get struct config useResult: true
    - Enrich method: { ..., wrappers: ['Mutex', 'Option'], useResult: true }

TREADLES orchestrates:
  - Call heddles to get enriched methods
  - Pass to bobbins for generation

BOBBINS renders:
  - Transform types: void → ()
  - Apply useResult: Result<()>
  - Generate code from template using serviceAccessPreamble built from wrappers
```

## Current Code Issues

### Issue 1: computeMetadata in management-collector.ts
The reed should NOT compute `useResult` or `wrappers`. Move this to heddles.

### Issue 2: link metadata in toRawMethod
The treadle should NOT look up link metadata. Heddles should enrich methods before treadles see them.

### Issue 3: serviceAccessPreamble in code-generator.ts
The bobbin builds this from wrappers - this is OK (final transformation), but wrappers should come from heddles, not reed.

## The Fix

1. **Reed** (`management-collector.ts`): Remove `useResult` computation. Just collect raw metadata.

2. **Heddles** (`pattern-matcher.ts` or new `enricher.ts`): Add enrichment step:
   - For each management, look up linked struct
   - Extract `useResult` from struct config
   - Extract `wrappers` from linked field
   - Enrich each method with computed metadata

3. **Treadles** (`tauri-generator.ts`): Remove metadata computation. Use enriched methods from heddles.

4. **Bobbin** (`code-generator.ts`): Keep type transformations, but receive `useResult` and `wrappers` from heddles via enriched methods.

## Method Ownership Lookup

When a method needs metadata from its owner:

```typescript
// In heddles - enrich methods from their management
function enrichMethods(management: ManagementMetadata): EnrichedMethod[] {
  const linkMetadata = resolveLink(management.link);
  
  return management.methods.map(method => ({
    ...method,
    // Computed from ownership chain:
    useResult: linkMetadata?.structConfig?.useResult ?? false,
    wrappers: linkMetadata?.fieldWrappers ?? [],
    fieldName: linkMetadata?.fieldName ?? '',
  }));
}
```

The method itself doesn't have `useResult` - but its owner (Management) has a link, and the link points to a struct with config. Heddles compute this relationship.

---

*This architecture keeps concerns separated: reed collects, heddles enrich, treadles orchestrate, bobbins render.*

---

# Design Wisdom

## The Regex Principle: A Design Constraint, Not A Parsing Strategy

> **The loom's extension API should remain simple enough that it *could* be parsed with regex.**

This is **not** about actually using regex to parse things. It's a **design constraint** — a way to judge complexity. If our API is too complex for regex, it's too complex for humans.

### The Real Rule: Import, Don't Parse

**Always import modules when possible.** The loom is TypeScript — we can import `WARP.ts`, `schema.ts`, any `.ts` file and get actual runtime objects.

```typescript
// ✅ CORRECT: Import the module
const schema = await import('./schema.ts');
const tables = extractTables(schema);  // Get real objects

// ❌ WRONG: Regex parsing (unless absolutely necessary)
const tables = source.match(/export const (\w+) = sqliteTable/);  // Fragile!
```

### Why The Regex Principle Still Matters

1. **Simplicity is Survival**: If the API is too complex for regex, it's too complex for humans.

2. **Hackability**: When you *do* need to extract something simple (a name, a path), regex should suffice.

3. **Constraints Breed Creativity**: The "regex ceiling" forces us to keep the extension surface clean.

4. **Judgment Tool**: Ask "could this be regex-parsed?" If no, simplify the API.

### What This Means

```typescript
// GOOD: Simple enough that it *could* be regex-parsed
@rust.Struct({ useResult: true })
class Foundframe { ... }

// GOOD: But we actually import and inspect
const warp = await import('./WARP.ts');
const spirals = Object.entries(warp).filter(([k, v]) => isSpiral(v));

// BAD: Would need AST parsing (don't do this)
@rust.Struct({ 
  useResult: someComplexFunction({ 
    nested: { deeply: { nested: 'config' } }
  })
})
class Foundframe { ... }
```

### When to Actually Use Regex

Only for **surgical source editing** where we must preserve:
- Whitespace
- Comments  
- Formatting

Example: Replacing a specific export in WARP.ts while keeping the author's hand-crafted style.

```typescript
// Surgical replacement (preserve formatting)
const newSource = source.replace(
  /export const (\w+) = loom\.spiral\(Foundframe\)/,
  `export const $1 = loom.spiral(Foundframe, NewStruct)`
);
```

### The Wisdom

> *"The loom that can be parsed with regex is the loom that can be extended by anyone.
> But the loom that *imports* its configuration is the loom that truly understands itself."*

**Import first. Parse (with regex or AST) only when you must preserve source formatting.**

If we ever find ourselves needing complex parsing for the extension API, we should **simplify the API**, not add the parser.

---

*Keep it simple. Keep it regex. Keep it loom.*

---

## Related Documents

### Architecture & Naming

- **[Treadle Naming Convention](./machinery/treadles/TREADLE_NAMING.md)** - Naming patterns for generators (`gen-{framework}-{concern}`)
  - Why `gen-android-service` not `android-generator`
  - How spiraler methods map to treadle names
  - When to split vs. combine treadles

### Planning

- **[Parallel Work Plan](../../PARALLEL_PLAN.md)** - Current parallel work streams for machinery + foundframe

---

*"The loom turns, and the spire rises."* 🏗️
