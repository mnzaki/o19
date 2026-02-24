# NEXTUP

## Active Work

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

**Next Steps:**
- [x] Create `machinery/reed/drizzle-parser.ts` — import and parse schema.ts
- [x] Create `machinery/beater/compactor.ts` — abstract base
- [x] Create `machinery/beater/orm-compactor.ts` — ORM-specific layer
- [x] Create `machinery/beater/rust-ormlite-precompiler.ts` — concrete impl
- [ ] Wire into weaver.ts to run during weave
- [ ] Generate first `media.gen.rs` for foundframe

---

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

### DSL updates need implementation!

- `warp/rust.ts`
- `warp/imprint.ts`
- Usage in `o19/loom/WARP.ts` and `o19/loom/device.ts`
- TODO about getting crate/package info after heddles phase

### Interactive CLI Polish

- [ ] Watch mode for file changes
- [ ] Dependency graph visualization
- [ ] Undo/redo in MUD mode
- [ ] Command history persistence

---

*"The loom that can weave a loom is the loom that lives forever."* 🧵🌀
