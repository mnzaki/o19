# The Beater ⚒️

> *"After the shuttle passes, the weft must be packed tight."*

The Beater compacts code by removing runtime gaps and packing it tight.

## Architecture Layers

### Layer 1: Generic Compactor Pattern
**File:** `compactor.ts`

The abstract staged metaprogramming pattern:
```
Input → Generate Midstage → Compile → Run → Output
```

This is the loom's self-referential capability — using the loom to weave a smaller, temporary loom.

**Use when:**
- Cross-language generation (TypeScript → Rust)
- Heavy validation required at generation time
- Need full compiler toolchain

**Implement:**
- `generate()` — Write midstage source
- `compile()` — Return compile command  
- `run()` — Return run command
- `parse()` — Extract output from stdout

---

### Layer 2: ORM-Specific Compaction
**File:** `orm-compactor.ts`

Extends `Compactor` with schema awareness.

**Use when:**
- Database ORM generation
- Need schema → SQL → target language

---

### Layer 3: Concrete Implementations

#### A. Full Compactor Pattern (Cross-Language)

**`rust-query-builder-precompiler.ts`** ⚠️ **ARCHIVED**
- TypeScript → Rust (via Rust midstage)
- **STATUS:** Archived pending design of minimal Rust query builder runtime
- **PROBLEM:** Raw SQL approach not type-safe (see file header for architecture vision)
- **FUTURE:** Generate SeaQuery or custom query builder calls, not raw SQL
- Outputs `*.gen.rs`

**`ts-prisma-kysely-aot.ts`** (Full Pattern)
- TypeScript → TypeScript (but needs isolated execution)
- Uses `npm install` + `tsc` in midstage
- Outputs `*.gen.ts`
- **Use when:** Need clean isolation or complex dependencies

#### B. In-Process Shortcut (Same Language)

**`ts-compactor.ts`** 🆕
- TypeScript → TypeScript (in-process)
- **No midstage compilation!**
- Uses dynamic imports + direct execution
- Outputs `*.gen.ts`
- **Use when:** Same language, faster iteration

---

## Strategy Matrix

| From | To | Strategy | File | Status |
|------|-----|----------|------|--------|
| TypeScript | Rust | **ARCHIVED** | `rust-query-builder-precompiler.ts` | 🚧 Pending query builder runtime design |
| TypeScript | TypeScript (complex) | Full Compactor | `ts-prisma-kysely-aot.ts` | 📋 Available |
| TypeScript | TypeScript (simple) | **In-Process** | `ts-compactor.ts` | ✅ **ACTIVE** |

---

## The SQL Precompilation Challenge

**Problem:** Prisma queries don't map 1:1 to SQL strings due to:
1. **Combinatorial explosion** — Optional filters create $2^n$ SQL variations
2. **IN clause arity** — `WHERE id IN ($1, $2, $3)` vs `($1, $2, $3, $4)`
3. **Dynamic identifiers** — `ORDER BY ${column}` (can't be parameterized)
4. **NULL semantics** — `IS NULL` vs `= $1`
5. **include/select** — Changes JOIN structure

**Solution:** "Memoized Query Plans"
1. Execute query with Prisma in dry-run/build phase
2. Hash the query structure (keys + array lengths)
3. Capture the SQL emitted
4. Generate lookup table: `hash → SQL`
5. Runtime: Check hash, execute pre-captured SQL or fallback to Prisma

**Our Approach:**
- Use in-process execution (`ts-compactor.ts`)
- Capture one SQL per `@loom.crud.query` decorator
- If query can't be fulfilled (dynamic parts), **The Loom Halts**

---

## The Loom Halts

> *"When the pattern cannot be woven, the loom must halt."*

If a query has dynamic parts that can't be precompiled:

```typescript
// ❌ CANNOT PRECOMPILE — dynamic column name
@loom.crud.query((prisma, column: string) =>
  prisma.media.findMany({ orderBy: { [column]: 'desc' } })
)
sortByColumn(column: string): Promise<Media[]> {}

// ✅ CAN PRECOMPILE — static structure
@loom.crud.query((prisma) =>
  prisma.media.findMany({ orderBy: { createdAt: 'desc' } })
)
getRecentMedia(): Promise<Media[]> {}
```

**Behavior:** Throw error at build time
```
🔧 CRINKLE! Cannot precompile query MediaWeave.sortByColumn:
  Dynamic column name in orderBy: [column]
  
  Options:
  1. Use static column name
  2. Remove @loom.crud.query decorator (use runtime Prisma)
  3. Define multiple @loom.crud.query variants for each column
```

---

## File Status

| File | Status | Purpose |
|------|--------|---------|
| `compactor.ts` | ✅ Core | Abstract compactor pattern |
| `orm-compactor.ts` | ✅ Core | ORM-specific base class |
| `ts-compactor.ts` | ✅ **ACTIVE** | In-process TypeScript (Kysely) |
| `ts-prisma-kysely-aot.ts` | 📋 Available | Full pattern TypeScript |
| `prisma-kysely-bridge.ts` | ✅ Active | Prisma Client Extension bridge |
| `rust-query-builder-precompiler.ts` | 🚧 **ARCHIVED** | Rust precompiler (pending query builder design) |
| ~~`ts-prisma-compactor.ts`~~ | ❌ **DELETED** | Old query-log approach |

---

## Archived Files

### `rust-query-builder-precompiler.ts`

**Status:** 🚧 **ARCHIVED** — Not currently usable

**Reason:** 
- Original approach generated raw SQL strings (not type-safe)
- We need a Rust equivalent to Kysely (query builder)
- Raw SQL in Rust is as problematic as raw SQL in TypeScript

**Future Architecture:**
Instead of:
```rust
// ❌ Raw SQL (current archived approach)
static STMT: OnceCell<Statement> = OnceCell::new();
conn.prepare("SELECT * FROM media WHERE id = ?")
```

Generate:
```rust
// ✅ Query builder calls (future approach)
db.select_from("media")
  .where_eq("id", id)
  .fetch_optional()
```

**Requirements for Reactivation:**
1. Design minimal Rust query builder runtime
   - Type-safe table/column references
   - Builder API (select, insert, update, delete)
   - SQL generation + rusqlite integration
2. Or adopt SeaQuery (if weight acceptable)
3. Update precompiler to generate builder calls instead of raw SQL

---

## Deleted Files

### `ts-prisma-compactor.ts`

**Status:** ❌ **DELETED**

**Reason:** Uses Prisma query log to capture SQL, but has fundamental issues:
- Hard to correlate log with original query
- Timing issues (async log vs sync execution)
- Doesn't handle the combinatorial explosion problem

**Replacement:** Use `ts-compactor.ts` (in-process) or `ts-prisma-kysely-aot.ts` (full pattern)
