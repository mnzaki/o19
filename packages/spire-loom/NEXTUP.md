# NEXTUP

## Active Work

Actual divining.

```
const importsDiviner = declareDiviner({
  /* wrap return type to collect imports without having calculated import path */
})
export const createMethodsDiviners: { runDiviners, extendBoundQuery } = declareDivinerSet({
  imports: importsDiviner,
})

const newFilesDiviner = declareDiviner({
  newFiles: (ctx) => {
    
  },
  /* wrap a diviner given as argument, make their `toString()` nested one more
  time to increase the number of runs needed
  */
})

export const createEntitiesDiviners: { runDiviners, extendBoundQuery } = declareDivinerSet({
  newFiles: newFilesDiviner
})

```

`extendBoundQuery = { imports: importsDiviner }` for example

We define a `runDiviners(extendBoundQuery, items, accumulator): boolean` function which returns
true if the diviner still requires running again

---

the treadle says

```
newFiles = (ctx) => {
  const methodsDiviner = createMethodsDiviners(ctx)
  const methods = createQueryAPI(..., methodsDiviner)
  const entitiesToProduce = methods.imports.map(import => /* importToEntity */)
  const entities = createQueryAPI(..., createEntitiesDiviners(entitiesToProduce))
  
  const entityPathPrefix = 'ts/entities/'
  const entityFiles = entities.newFiles
  const someFilesThatUseEntityReturnTypes = [{ template: 'sometemplate.ts.ejs' }]
  return [...entityFiles, ...someFilesThatUseEntityReturnTypes]
}
```

The important points are:
1. `methods.imports is itself a BoundQuery of course! so
    imports needs to be defined as `extends LanguageThing` and should have language
    propagated correctly.
2. `createEntitiesDiviners` should return `{ newFiles }` should the
   `createQueryAPI should apply to the BoundQuery object appropriately. Those
   diviners are of course 2 stage, because they wait for the imports diviner to
   return! and this part needs thinking, to synthesize the previous ideas'
   sections and this functionality/usage

so how do you think we achieve this in a minimally beautiful way? give me your
ideas


## Critical TODOs

### 🛑 Safety: Never Write Broken Spires

**Rule**: Never write to a spire unless the new spire generates **fully without errors**.

**Implementation:**
- Generate all files to a temp directory first
- Compile check: `cargo check -p o19-foundframe`
- Only if successful, atomically swap temp → final
- On failure, crinkle the cranks and brangle the gears — the loom shuts down!

**Location**: Add to `machinery/weaver.ts` — wrap generation in transaction/rollback logic.

---


### The Beater: Precompiled ORM Generation

Building the three-stage ORM pipeline in `machinery/beater/`:

**Three Layers of Abstraction:**
1. **Compactor** (`compactor.ts`) — Generic staged metaprogramming pattern
2. **OrmCompactor** (`orm-compactor.ts`) — Schema-aware compaction for queries  
3. **RustOrmlitePrecompiler** (`rust-ormlite-precompiler.ts`) — Concrete Rust/SQLite impl

**The Pattern:**
```
Input → Generate Midstage → Compile → Run → Output
```

**Status:**
- [x] Create `machinery/reed/drizzle-parser.ts` — import and parse schema.ts
- [x] Create `machinery/beater/compactor.ts` — abstract base
- [x] Create `machinery/beater/orm-compactor.ts` — ORM-specific layer
- [x] Create `machinery/beater/rust-ormlite-precompiler.ts` — concrete impl
- [ ] Wire into weaver.ts to run during weave
- [ ] Generate first `media.gen.rs` for foundframe

---

## Meta-Weaving: The Loom That Weaves Itself

### 🌀 Treadle for Creating Beaters (Future!)

Just as we have `definePlatformWrapperTreadle` for creating treadles,
we should have `defineBeaterTreadle` for creating beaters.

**The Meta-Pattern:**
```typescript
// A treadle that generates a compactor that compacts... (turtles all the way down!)
export default defineBeaterTreadle({
  name: 'custom-orm',
  language: 'rust',
  ormLibrary: 'diesel', // or 'sea-orm', 'sqlx'
  
  // Generates the beater midstage
  generateBeater: (schema) => { ... },
  
  // The beater then generates the final ORM code
  generateOutput: (validatedSchema) => { ... }
});
```

**Why?** Let users define their own compaction strategies for:
- Different databases (PostgreSQL, MySQL)
- Different languages (Kotlin, Swift)
- Different ORMs (Diesel, SeaORM, SQLx)

**Location**: `machinery/treadles/beater-generator.ts`

---

## Backlog

### Interactive CLI Polish

- [ ] Watch mode for file changes
- [ ] Dependency graph visualization
- [ ] Undo/redo in MUD mode
- [ ] Command history persistence

> *"The loom that can weave a loom is the loom that lives forever."* 🧵🌀
