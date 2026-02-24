# SQL Compaction: The Prisma Sacrifice

> *"The heavyweight ORM that compacts into nothing."*

## Overview

SQL Compaction is spire-loom's approach to zero-runtime-cost database access. We use a **heavyweight ORM (Prisma)** at generation time to produce optimized SQL, then **compact it away** — keeping only the raw prepared statements.

This is the "Svelte of ORMs": do all the work at build time, output minimal runtime code.

## The Architecture

> ⚠️ **SCOPE CLARIFICATION:** This SQL compaction is **FRONTEND ONLY** (TypeScript/Kysely). The Rust core (`foundframe.inner`) continues to use raw SQLite/Rusqlite as designed. We are NOT generating Rust DB calls.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 0: QUERY INTENT IN THE LOOM (NEW!)                                    │
│                                                                             │
│   loom/*.ts              @loom.crud.query with ORM autocomplete             │
│   ┌─────────┐            ┌─────────────────────────────────────┐            │
│   │ media   │            │ @loom.crud.query((prisma) =>        │            │
│   │ post    │    +       │   prisma.media.findMany({...})      │            │
│   │ person  │            │ )                                   │            │
│   └─────────┘            └─────────────────────────────────────┘            │
│        │                          │                                         │
│        └──────────────┬───────────┘                                         │
│                       ▼                                                     │
│   ┌─────────────────────────────────────┐                                   │
│   │  Prisma ORM (generation-time only)  │                                   │
│   │  - Full autocomplete                │                                   │
│   │  - Type inference                   │                                   │
│   │  - SQL capture                      │                                   │
│   └─────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: SCHEMA INTENT (TypeScript/Drizzle Schema)                          │
│                                                                             │
│   schema.ts              CRUD-labeled methods                               │
│   ┌─────────┐            ┌─────────────────────┐                            │
│   │ media   │            │ @loom.crud.create   │                            │
│   │ post    │    +       │   createMedia()     │                            │
│   │ person  │            │                     │                            │
│   └─────────┘            └─────────────────────┘                            │
│        │                          │                                         │
│        └──────────────┬───────────┘                                         │
│                       ▼                                                     │
│   ┌─────────────────────────────────────┐                                   │
│   │  Generate: "Create media record     │                                   │
│   │            with content_hash, uri"  │                                   │
│   │            (abstract intent)        │                                   │
│   └─────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: MIDSTAGE (The Prisma Sacrifice)                                    │
│                                                                             │
│   ┌─────────────────────────────────────┐                                   │
│   │  1. Drizzle schema → SQLite DB      │                                   │
│   │     (create temp database)          │                                   │
│   └─────────────────────────────────────┘                                   │
│                       │                                                     │
│                       ▼                                                     │
│   ┌─────────────────────────────────────┐                                   │
│   │  2. Prisma introspection            │                                   │
│   │     npx prisma db pull              │                                   │
│   │     → Generates schema.prisma       │                                   │
│   └─────────────────────────────────────┘                                   │
│                       │                                                     │
│                       ▼                                                     │
│   ┌─────────────────────────────────────┐                                   │
│   │  3. Generate Prisma Client          │                                   │
│   │     npx prisma generate             │                                   │
│   │     → Full TypeScript ORM           │                                   │
│   └─────────────────────────────────────┘                                   │
│                       │                                                     │
│                       ▼                                                     │
│   ┌─────────────────────────────────────┐                                   │
│   │  4. Execute CRUD via Prisma         │                                   │
│   │     prisma.media.create({...})      │                                   │
│   │                                     │                                   │
│   │     Prisma's Rust Query Engine      │                                   │
│   │     → Generates optimized SQL       │                                   │
│   │     → We capture this SQL           │                                   │
│   └─────────────────────────────────────┘                                   │
│                       │                                                     │
│                       ▼                                                     │
│   ┌─────────────────────────────────────┐                                   │
│   │  5. Validate & Extract              │                                   │
│   │     - Run EXPLAIN QUERY PLAN        │                                   │
│   │     - Validate against schema       │                                   │
│   │     - Extract: SQL + params         │                                   │
│   └─────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: COMPACTION (Output) — FRONTEND ONLY!                               │
│                                                                             │
│   ⚠️  Output is TypeScript/Kysely (*.gen.ts), NOT Rust!                     │
│                                                                             │
│   Prisma is GONE. Only Kysely remains.                                      │
│                                                                             │
│   ```rust                                                                   │
│   // Generated: media.gen.rs                                                │
│   pub async fn create_media(                                                │
│       conn: &mut Connection,                                                │
│       content_hash: String,                                                 │
│       uri: String,                                                          │
│       // ...                                                                │
│   ) -> Result<Media, Error> {                                               │
││      // Prisma's optimized SQL, captured at generation time                │
│       static STMT: OnceCell<Statement> = OnceCell::new();                   │
│       let stmt = STMT.get_or_init(|| {                                      │
│           conn.prepare(                                                     │
│               // This SQL was optimized by Prisma's Rust engine             │
│               "INSERT INTO media             \\n│                (content_hash, uri, mime_type, created_at)  \\n│                VALUES (?, ?, ?, ?)           \\n│                RETURNING id"                 \\n│           )                                                                 │
│       });                                                                   │
│                                                                             │
│       let id: i64 = stmt.query_row(                                         │
│           [&content_hash, &uri, &mime_type, &created_at],                   │
│           |row| row.get(0)                                                  │
│       )?;                                                                   │
│                                                                             │
│       Ok(Media { id, content_hash, uri, /* ... */ })                        │
│   }                                                                         │
│   ```                                                                       │
│                                                                             │
│   Zero Prisma at runtime. Zero ORM overhead.                                │
│   Just Prisma's optimization, compacted into prepared statements.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why Prisma?

| Feature | Benefit for Compaction |
|---------|----------------------|
| **Rust Query Engine** | Battle-tested SQL optimization we can steal |
| **Introspection** | Convert any schema (Drizzle, raw SQL) to Prisma schema |
| **Query Batching** | N+1 prevention we can replicate in Rust output |
| **Connection Pooling** | Patterns we can bake into generated code |
| **Migration Engine** | Validate schema changes at generation time |

## The Compaction Process

### 1. Schema Ingestion

```typescript
// From Drizzle schema.ts
import { parseDrizzleSchema } from '../reed/drizzle-parser.js';

const drizzleSchema = await parseDrizzleSchema('./schema.ts');

// Convert to SQLite DDL
const sqliteDDL = generateSQLiteDDL(drizzleSchema);

// Create temp database
const tempDb = new Database(':memory:');
tempDb.exec(sqliteDDL);
```

### 2. Prisma Introspection

```typescript
// Generate prisma/schema.prisma from SQLite
const introspection = await prismaIntrospect(tempDb);

// This gives us Prisma's full model definitions
// with relations, types, constraints
```

### 3. Intent to SQL

```typescript
// For each @loom.crud method, generate intent
const intent = {
  table: 'media',
  operation: 'create',
  params: ['content_hash', 'uri', 'mime_type'],
  returns: ['id', 'created_at']
};

// Execute via Prisma to get optimized SQL
const prismaQuery = prisma.media.create({
  data: { content_hash: '?', uri: '?', mime_type: '?' }
});

// Capture the SQL Prisma generates
const sql = await capturePrismaSQL(prismaQuery);
// → "INSERT INTO media (...) VALUES (...) RETURNING ..."
```

### 4. Validation

```typescript
// Validate SQL against schema
const plan = tempDb.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
// Ensure no full table scans, proper index usage

// Test with sample data
const testResult = tempDb.prepare(sql).run(testData);
// Verify return types match expected
```

### 5. Rust Generation

```typescript
// Generate Rust code with the validated SQL
const rustCode = generateRustWrapper({
  fnName: 'create_media',
  sql: capturedSQL,
  params: intent.params,
  returnType: 'Media'
});
```

## Midstage File Structure

```
.midstage/
├── package.json          # Prisma dependencies
├── schema.prisma         # Generated from Drizzle
│   generator client {
│     provider = "prisma-client-js"
│   }
│   datasource db {
│     provider = "sqlite"
│     url      = "file:./temp.db"
│   }
│   model Media {
│     id           Int      @id @default(autoincrement())
│     contentHash  String
│     uri          String
│     // ... from Drizzle schema
│   }
├── temp.db               # SQLite from Drizzle schema
├── src/
│   ├── main.ts           # Entry: orchestrate compaction
│   ├── capture.ts        # Intercept Prisma's SQL
│   ├── validate.ts       # EXPLAIN QUERY PLAN checks
│   └── generate-rust.ts  # Output generation
└── generated/            # Output *.gen.ts files (TypeScript/Kysely)
    ├── media.gen.rs
    ├── post.gen.rs
    └── ...
```

## Capturing Prisma's SQL

Prisma doesn't expose raw SQL directly, but we can capture it:

### Option A: Query Log Interception

```typescript
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

const capturedQueries: string[] = [];

prisma.$on('query', (e) => {
  capturedQueries.push(e.query);
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});

// Execute operations
await prisma.media.create({ data: {...} });
// → capturedQueries now has the SQL
```

### Option B: Middleware

```typescript
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
  // Could introspect params to reconstruct SQL intent
  
  return result;
});
```

### Option C: Prisma's Query Engine (Internal)

For more control, we could use Prisma's internal query engine directly, but this is less stable.

## Optimization Opportunities

### 1. Query Batching → Rust Futures

```typescript
// Prisma batches these automatically
const [users, posts] = await Promise.all([
  prisma.user.findMany(),
  prisma.post.findMany()
]);
```

```rust
// Generated Rust: proper async batching
let (users, posts) = tokio::join!(
    user::list_all(conn),
    post::list_all(conn)
);
```

### 2. N+1 Prevention → Eager Loading Patterns

```typescript
// Prisma's include becomes JOIN in generated SQL
prisma.user.findMany({
  include: { posts: true }
});
```

```rust
// Generated: single query with JOIN
static STMT: OnceCell<Statement> = OnceCell::new();
let stmt = STMT.get_or_init(|| {
    conn.prepare("
        SELECT u.*, p.id as post_id, p.title as post_title
        FROM user u
        LEFT JOIN post p ON u.id = p.user_id
    ")
});
```

### 3. Connection Pooling → OnceCell<Pool>

Prisma's connection pool patterns become static OnceCell in Rust.

## Error Handling: The Loom Shuts Down

```typescript
// In midstage validation
if (queryPlan.includes('SCAN TABLE')) {
  throw new Error(
    `🔧 CRINKLE! Query for ${table}.${operation} does full table scan!\n` +
    `SQL: ${sql}\n` +
    `Plan: ${queryPlan}\n\n` +
    `Add an index or rewrite the query. The loom cannot weave slow cloth.`
  );
}
```

## WARP.ts Integration: The Refinement Decorator

> *"Rings are refined, not just defined."*

In `WARP.ts` (software architecture language), we attach **refinement layers** to rings using decorators. This is how we bridge the software world (Prisma, ORMs) with the loom world (compaction, beaters):

```typescript
// loom/WARP.ts
import { loom, foundframe } from '@o19/spire-loom/warp';

// Define the ORM provider (software concept)
const prisma = foundframe.typescript.prisma({
  schema: './prisma/schema.prisma',
  databaseUrl: 'file:./data.db'
});

// Apply refinement to a ring
@loom.refine.withPrisma(prisma)
const front = foundframe.typescript.ddd();

// The refinement layer:
// 1. Captures @loom.crud.query() decorators in loom/*.ts
// 2. Runs Prisma SQL compaction during weaving
// 3. Outputs *.gen.ts with Kysely prepared statements (FRONTEND ONLY)

// Alternative: Drizzle (future)
const drizzle = foundframe.typescript.drizzle({ schema: './schema.ts' });
@loom.refine.withDrizzle(drizzle)
const api = foundframe.typescript.api();

// No refinement = default behavior (no SQL compaction)
const core = foundframe.rust.core();
```

### Why `loom.refine.*`?

| Aspect | Rationale |
|--------|-----------|
| **Software Language** | "refine" is a software concept (type narrowing, data processing) |
| **Verb-Based** | Active transformation, not passive decoration |
| **Loom Bridge** | Lives in `loom.*` namespace, but speaks software |
| **Extensible** | `withPrisma`, `withDrizzle`, `withKysely`... |

### The Refinement Type

```typescript
// warp/refinement.ts
export interface RefinementProvider<TConfig> {
  name: string;
  
  /** Provider configuration */
  config: TConfig;
  
  /** Called during loom dressing to set up the provider */
  initialize(): Promise<void>;
  
  /** Called during weaving to refine a ring */
  refine(ring: Ring, context: WeavingContext): Promise<RefinementResult>;
```

---

## 🛑 The Loom Halts

> *"When the pattern cannot be woven, the loom must halt."*

Not all queries can be precompiled. The Loom Halts is our graceful failure mechanism.

### What Can't Be Precompiled?

| Issue | Example | Why It Fails |
|-------|---------|--------------|
| **Dynamic column names** | `orderBy: { [column]: 'desc' }` | SQL identifiers can't be parameterized |
| **Dynamic table names** | `prisma[tableName].findMany()` | Table must be known at build time |
| **Variable IN clause** | `id: { in: arrayOfUnknownLength }` | SQL structure changes with array length |
| **Conditional filters** | Complex nested where with runtime conditions | Combinatorial explosion ($2^n$ variations) |
| **Raw SQL** | `$queryRaw` | Bypasses ORM entirely |

### The Loom Halts in Action

```typescript
// ❌ CANNOT PRECOMPILE — dynamic column
@loom.crud.query((prisma, column: string) =>
  prisma.media.findMany({ orderBy: { [column]: 'desc' } })
)
sortBy(column: string): Promise<Media[]> {}
// 🔧 CRINKLE! Cannot precompile: Dynamic identifier 'column'
//     Options:
//     1. Use static column name
//     2. Remove @loom.crud.query decorator (use runtime Prisma)
//     3. Define @loom.crud.query for each possible column

// ❌ CANNOT PRECOMPILE — variable IN clause
@loom.crud.query((prisma, ids: number[]) =>
  prisma.media.findMany({ where: { id: { in: ids } } })
)
findByIds(ids: number[]): Promise<Media[]> {}
// 🔧 CRINKLE! Cannot precompile: Variable IN clause
//     Options:
//     1. Use fixed-size batches (e.g., IN (?, ?, ?) for exactly 3)
//     2. Remove @loom.crud.query decorator
//     3. Use Kysely directly for dynamic queries

// ✅ CAN PRECOMPILE — static structure
@loom.crud.query((prisma) =>
  prisma.media.findMany({ 
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 100 
  })
)
getActiveMedia(): Promise<Media[]> {}
// ✓ Captures: SELECT * FROM media WHERE status = ? ORDER BY created_at DESC LIMIT ?
```

### Implementation

```typescript
// machinery/beater/ts-compactor.ts
protected validateQueryCanPrecompile(
  query: CollectedQuery
): { valid: boolean; reason?: string } {
  const fnSource = query.queryFn?.toString() || '';
  
  // Check for dynamic property access
  if (fnSource.includes('[') && fnSource.includes(']')) {
    return {
      valid: false,
      reason: 'Dynamic property access detected (e.g., orderBy: { [column]: ... })'
    };
  }
  
  // Check for variable IN clauses
  if (fnSource.includes('in:') && fnSource.includes(']')) {
    return {
      valid: false,
      reason: 'Variable IN clause (array of unknown length)'
    };
  }
  
  // Check for $queryRaw
  if (fnSource.includes('$queryRaw')) {
    return {
      valid: false,
      reason: 'Raw SQL queries cannot be precompiled'
    };
  }
  
  return { valid: true };
}
```

### Fallback Strategy

When a query can't be precompiled:

1. **Build-time:** Throw error with clear message + options
2. **Runtime:** Use regular Prisma Client (no compaction)
3. **Future:** Generate multiple variants for common cases

```typescript
// Option 2: Runtime Prisma (no compaction)
class MediaQueries {
  // This is NOT decorated — uses runtime Prisma
  async sortBy(column: string): Promise<Media[]> {
    return prisma.media.findMany({ orderBy: { [column]: 'desc' } });
  }
  
  // This IS decorated — precompiled
  @loom.crud.query((prisma) => prisma.media.findMany())
  getAll(): Promise<Media[]> {}
}
```
}

// Prisma refinement provider
export function withPrisma(config: PrismaConfig): RefinementProvider<PrismaConfig>;
```

---

## Implementation Phases

**Progress Summary:**
| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Complete | Refinement system (`@loom.refine.withPrisma`) |
| 1 | ✅ Complete | Query decorator (`@loom.crud.query`) |
| 2 | ✅ Complete | Prisma-Kysely Bridge |
| 3 | ✅ Complete | In-process TsCompactor (no midstage!) |
| 4 | ✅ Complete | "The Loom Halts" validation for unsupported queries |
| 5 | 🚧 In Progress | Documentation & architecture preservation |
| 6 | 📋 Planned | Advanced features (relations, aggregations) |

---

## 🧠 Architecture: Two Strategies

> *"Choose the right tool for the weave."*

### Strategy A: In-Process Compaction (TsCompactor) ✅ CURRENT

**Use when:** TypeScript → TypeScript, simple dependencies, fast iteration

**Flow:**
```
loom/*.ts ──import──┐
                    ↓
Main Process    execute queryFn
                    ↓
              capture SQL via Prisma $on('query')
                    ↓
              generate *.gen.ts
```

**Pros:**
- ⚡ Fast — no compilation step
- 🔄 Simple — dynamic imports
- 🐛 Debuggable — regular TypeScript

**Cons:**
- Tight coupling to main process
- Can't isolate complex dependencies

### Strategy B: Full Compactor Pattern (TsPrismaKyselyAot) 📋 FUTURE

**Use when:** Need isolation, complex dependencies, or cross-language

**Flow:**
```
loom/*.ts ──serialize──┐
                       ↓
Midstage          generate TypeScript
                       ↓
                  npm install
                       ↓
                  tsc compile
                       ↓
                  node run
                       ↓
              capture SQL
                       ↓
              generate *.gen.ts
```

**Pros:**
- 🧊 Isolated — clean environment
- 📦 Full dependency control
- 🌐 Cross-language capable

**Cons:**
- 🐢 Slower — compile step
- 📈 Complex — more moving parts

---

## 🧠 The Prisma-Kysely Bridge (Frontend Only!)

> *"Prisma steers, Kysely reveals the path."*

**SCOPE CLARIFICATION:** This SQL compaction is **FRONTEND ONLY** — for the TypeScript/DDD layer. We are NOT generating Rust DB calls. The Rust core (`foundframe.inner`) continues to use raw SQLite/Rusqlite as it does today.

```
┌─────────────────────────────────────────────────────────────────┐
│  PRISMA-KYSELY AOT (Ahead-of-Time) BRIDGE — FRONTEND ONLY       │
│                                                                 │
│  1. @loom.crud.query((prisma) => prisma.media.findMany({...})) │
│                          ↓                                      │
│  2. Execute in midstage with Prisma Client Extension           │
│                          ↓                                      │
│  3. Extension intercepts via $allOperations                    │
│                          ↓                                      │
│  4. Translates to Kysely builder calls                         │
│                          ↓                                      │
│  5. Kysely.execute() → captures generated SQL                  │
│                          ↓                                      │
│  6. Return result + store SQL                                  │
│                          ↓                                      │
│  7. Compact captured SQL to TypeScript *.gen.ts               │
│     (Kysely + prepared statements for frontend)                │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Works:**
- ✅ **Prisma** gives us TypeScript autocomplete and type safety in `loom/*.ts`
- ✅ **Kysely** gives us SQL generation and capture
- ✅ **Bridge** translates Prisma operations to Kysely at generation time
- ✅ **AOT** — all happens at generation time, zero Prisma runtime overhead
- ✅ **Frontend only** — Rust core stays unchanged

**Loom File (Unchanged):**
```typescript
// loom/media.ts — no changes needed!
@spiral(MediaSpiral)
class MediaWeave {
  @loom.crud.query((prisma) =>
    prisma.media.findMany({ where: { id: 1 } })
  )
  getMedia(): Promise<Media[]> {}
}
```

**Output (TypeScript, not Rust!):**
```typescript
// generated/foundframe-front/media.gen.ts
import { Kysely } from 'kysely';

export async function getMedia(db: Kysely<DB>, id: number): Promise<Media[]> {
  // SQL captured at generation time via Prisma-Kysely bridge
  return db.selectFrom('media')
    .selectAll()
    .where('id', '=', id)
    .execute();
}
```

**The Bridge Implementation:**

```typescript
// machinery/beater/prisma-kysely-bridge.ts
import { PrismaClient } from '@prisma/client';
import { Kysely, SqliteDialect } from 'kysely';

export function createPrismaKyselyBridge(
  databaseUrl: string,
  onQuery: (sql: string, params: unknown[]) => void
) {
  const kysely = new Kysely({
    dialect: new SqliteDialect({ database: databaseUrl })
  });

  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Translate Prisma operation to Kysely
          const kyselyQuery = translateToKysely(kysely, model, operation, args);
          
          // Execute via Kysely to get SQL
          const result = await kyselyQuery.execute();
          
          // Capture the SQL that was generated
          const { sql, parameters } = kyselyQuery.compile();
          onQuery(sql, parameters);
          
          return result;
        }
      }
    }
  });
}

function translateToKysely(kysely: Kysely<any>, model: string, operation: string, args: any) {
  switch (operation) {
    case 'findMany':
      let q = kysely.selectFrom(model).selectAll();
      if (args.where) q = applyWhere(q, args.where);
      if (args.take) q = q.limit(args.take);
      if (args.skip) q = q.offset(args.skip);
      if (args.orderBy) q = applyOrderBy(q, args.orderBy);
      return q;
    
    case 'findUnique':
    case 'findFirst':
      return kysely.selectFrom(model)
        .selectAll()
        .where(args.where)
        .limit(1);
    
    case 'create':
      return kysely.insertInto(model).values(args.data);
    
    case 'update':
      return kysely.updateTable(model)
        .set(args.data)
        .where(args.where);
    
    case 'delete':
      return kysely.deleteFrom(model).where(args.where);
    
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}
```

**New File Structure:**
```
machinery/beater/
├── orm-compactor.ts              # Base ORM compactor (existing)
├── prisma-kysely-bridge.ts       # NEW: Prisma → Kysely translation
├── ts-prisma-kysely-aot.ts       # RENAME: Was ts-prisma-compactor.ts
└── bobbins/prisma-kysely-aot/    # RENAME: Was bobbins/ts-prisma-compactor/
    ├── package.json.ejs          # Now includes kysely dependency
    ├── bridge.ts.ejs             # NEW: Bridge implementation
    └── ...
```

---

### Phase 0: The Refinement System (Ring Modifiers) ✅ COMPLETE

> *"Rings are refined, not just defined."*

Build the `@loom.refine` decorator system that attaches ORM providers to rings. This is the bridge between WARP.ts (software architecture) and the loom (weaving machinery).

```typescript
// loom/WARP.ts
import { loom, foundframe } from '@o19/spire-loom/warp';

// Define the ORM provider
const prisma = foundframe.typescript.prisma({
  schema: './prisma/schema.prisma',
  databaseUrl: 'file:./data.db'
});

// Apply refinement to a ring — this is the ONLY configuration needed!
@loom.refine.withPrisma(prisma)
const front = foundframe.typescript.ddd();

// The refinement attaches to the ring and:
// 1. Provides Prisma client for @loom.crud.query decorators
// 2. Triggers TsPrismaCompactor during weaving
// 3. Generates *.gen.ts files (FRONTEND ONLY, NOT Rust)
```

**The Refinement → Compactor Bridge:**

```
@loom.refine.withPrisma(prisma)
         │
         ▼
┌─────────────────────────────────────┐
│  RefinementProvider interface       │
│  - name: 'prisma'                   │
│  - initialize(): Promise<void>      │
│  - refine(ring, context): Promise<RefinementResult>│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  During Weaving:                    │
│  1. Detect @loom.crud.query methods │
│  2. Call provider.captureSQL()      │
│  3. Run TsPrismaCompactor           │
│  4. Generate *.gen.ts (frontend)    │
└─────────────────────────────────────┘
```

**Tasks:**
- [x] Create `RefinementProvider` interface in `warp/refinement/types.ts`
- [x] Implement `@loom.refine.withPrisma()` decorator in `warp/refine/prisma.ts`
- [x] Build refinement → compactor bridge in `machinery/weaver.ts` (`processRefinements()`)
- [x] Auto-install Prisma when refinement is used (dynamic dependency injection in `TsPrismaCompactor`)

#### DISCUSS: Open Questions from Phase 0

**1. Query Collection Strategy** — How do `@loom.crud.query` decorators from `loom/*.ts` files get collected and passed to the refinement during weaving?

**Options:**
- **A. Load loom files during weaving** — Import `loom/*.ts` modules, extract metadata via reflection
- **B. Collect during dressing** — `DressingService` parses and stores query metadata before weaving
- **C. Spiral metadata** — `@spiral()` decorator collects queries from the class it decorates
- **D. Management collector** — Extend `collectManagements()` to also collect queries

**Current thinking:** Option B (Dressing) feels cleanest — we already have a dressing phase that loads loom configuration. The `Dressing` could contain a `queries` array that's passed to refinements during weaving.

**2. Client Lifecycle Management** — The `getClient()` and `captureSQL()` methods need the Prisma midstage to be initialized first. How do we manage this lifecycle?

```typescript
// Current stub in warp/refine/prisma.ts:
async getClient(): Promise<unknown> {
  throw new Error('getClient() must be called after initialize()');
}

// Options:
// A. Single-shot: initialize() returns client, refine() uses it
// B. State storage: Provider keeps client as instance variable
// C. Lazy init: getClient() auto-calls initialize() if needed
```

**3. Error Handling Strategy** — Should refinement failures fail the entire weave or just warn?

```typescript
// Current (weaver.ts): Collect errors but don't stop weaving
for (const result of refinementResults) {
  if (result.errors.length > 0) {
    errors.push(...result.errors.map(e => new Error(e)));
  }
}

// Alternative: Fail fast
if (result.errors.length > 0) {
  throw new Error(`Refinement ${provider.name} failed: ${result.errors[0]}`);
}
```

**4. TypeScript Autocomplete Types** — How does TypeScript know the Prisma client type in `loom/*.ts` without importing `@prisma/client`?

```typescript
// loom/media.ts — Where does 'prisma' get its type?
@loom.crud.query((prisma) => 
  prisma.media.findMany({...})  // ← needs PrismaClient type
)
```

**Options:**
- Generate `.d.ts` file during dressing with Prisma client types
- Use `import type { PrismaClient } from '@prisma/client'` in loom files (requires peer dep?)
- Generic approach: `@loom.crud.query<PrismaClient>((prisma) => ...)`

---

### Phase 1: Query Intent in the Loom (Autocomplete) ✅ COMPLETE

> *"The weaver sketches with full IDE support."*

Enable `@loom.crud.query` decorators in `loom/*.ts` with Prisma autocomplete. The Prisma client comes from the ring's refinement.

**Status:** ✅ **COMPLETE**

**Files Created/Modified:**
- `warp/crud.ts` — Added `@loom.crud.query` decorator, `QueryMetadata` interface, query collection helpers
- `machinery/reed/query-collector.ts` — Collects queries from loom files (Reed layer)
- `machinery/reed/index.ts` — Exports query collector
- `machinery/weaver.ts` — Integrated query collection into weave flow, passes queries to refinements

**Architecture Decision (DISCUSS #1):**
✅ **Option B + D hybrid** — Queries are collected during dressing (Phase 0 in weave flow) via `Weaver.collectQueries()`, which uses `reed/query-collector.ts`. This follows the same pattern as `collectManagements()`.

**Usage in loom/*.ts:**
```typescript
@spiral(MediaSpiral)
class MediaWeave {
  @loom.crud.query((prisma) =>
    prisma.media.findMany({ where: { id: 1 } })
  )
  getMedia(): Promise<Media[]> {}
}
```

**Data Flow:**
```
loom/*.ts → @loom.crud.query decorator attaches metadata
                ↓
Weaver.weave() → Phase 0: collectQueries() [Reed layer]
                ↓
         processRefinements() → passes queries to provider.refine()
                ↓
         TsPrismaCompactor captures SQL for each query
```

**Tasks:**
- [x] Implement `@loom.crud.query` decorator in `warp/crud.ts`
- [x] Create `QueryMetadata` interface for storing query lambdas
- [x] Build `machinery/reed/query-collector.ts` (Reed layer)
- [x] Integrate query collection into `Weaver.weave()`
- [x] Pass queries to refinements via `WeavingContext`
- [ ] **FUTURE:** TypeScript autocomplete (needs generated .d.ts or peer dep strategy)

#### DISCUSS #4 Resolution: TypeScript Autocomplete
**Status:** Partially resolved — decorator works, IDE autocomplete needs follow-up

The query lambda receives `prisma` as a parameter, but TypeScript doesn't know its type without:
- A. Generating `.d.ts` file during dressing with Prisma client types
- B. Adding `@prisma/client` as optional peer dependency with type imports
- C. Using triple-slash reference types directives

**Decision:** Defer to Phase 3 — basic functionality works, polish later.

```typescript
// loom/media.ts
import { spiral } from '@o19/spire-loom/warp';
import { MediaSpiral } from './WARP.ts';

@spiral(MediaSpiral)
class MediaWeave {
  // Standard CRUD (auto-generated)
  @loom.crud.create
  createMedia(data: CreateMedia): Media {}

  // Custom query with FULL PRISMA AUTOCOMPLETE! 🎯
  @loom.crud.query((prisma) => 
    prisma.media.findMany({
      where: { contentHash: { startsWith: 'Qm' } },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  )
  findRecentIPFSMedia(): Promise<Media[]> {}
}
```

**How the decorator works:**

```typescript
// warp/crud.ts
export function query<T>(
  queryFn: (prisma: PrismaClient) => Promise<T>
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // Store the query lambda for later capture
    // The actual SQL capture happens during weaving
    // via the ring's refinement provider
    
    attachMetadata(target, propertyKey, {
      type: 'crud.query',
      queryFn,                    // The lambda to execute
      captureAtWeave: true,       // Defer SQL capture
    });
  };
}
```

**Tasks:**
- [ ] Implement `@loom.crud.query` decorator
- [ ] Build query lambda storage & retrieval
- [ ] Connect to refinement provider for Prisma client
- [ ] Type definitions for autocomplete

---

### Phase 2: The Prisma-Kysely AOT Bridge ✅ COMPLETE

> *"Prisma steers, Kysely reveals the path."*

Capture SQL via Prisma Client Extensions that translate to Kysely. This gives us Prisma's autocomplete with Kysely's SQL capture. **Output is TypeScript/Kysely (*.gen.ts), NOT Rust!**

**Status:** ✅ **COMPLETE** — Core infrastructure implemented

**Files Created:**
- `machinery/beater/prisma-kysely-bridge.ts` — Bridge with `$extends({ query: {...} })`
- `machinery/beater/ts-prisma-kysely-aot.ts` — Compactor using bridge
- `machinery/beater/index.ts` — Exports updated
- `machinery/bobbin/prisma-kysely-aot/*.ejs` — Midstage bobbins:
  - `package.json.ejs` — Kysely + Prisma deps
  - `tsconfig.json.ejs` — TypeScript config
  - `schema.prisma.ejs` — Prisma schema template
  - `bridge.ts.ejs` — Bridge implementation
  - `capture.ts.ejs` — Query execution orchestrator
  - `codegen.ts.ejs` — TypeScript/Kysely output generator
- `warp/refine/prisma.ts` — Updated to use new compactor

**How the Bridge Works:**
```typescript
const bridgedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Subscribe to Prisma query log
        prisma.$on('query', (e) => captured = e.query);
        
        // Execute original query
        const result = await query(args);
        
        // Capture generated SQL
        return { result, sql: captured };
      }
    }
  }
});
```

#### 🚧 REMAINING WORK (Deferred to Phase 3+)

**The Lambda Serialization Problem:**
The query lambdas in `@loom.crud.query((prisma) => ...)` are functions defined in `loom/*.ts`. To execute them in the midstage, we need to:

1. **Serialize** the lambda at decorator time (store as string/code)
2. **Deserialize** and execute in the midstage with bridged Prisma
3. **Capture** the SQL generated

**Options:**
- **A. Serialize as string** — `queryFn.toString()`, eval in midstage (unsafe?)
- **B. Code generation** — Generate midstage code that imports and calls the lambda
- **C. In-process execution** — Run queries in the main process (no midstage)

**Current thinking:** Option B is cleanest — generate `capture.ts` that imports the loom files and calls the lambdas. But this requires the loom files to be importable in the midstage context.

**For now:** The infrastructure is in place. The actual lambda execution will be implemented as part of end-to-end testing.

**Integration with Weaving:**

```typescript
// machinery/weaver.ts
async function weave(ring: Ring) {
  // Check if ring has refinement
  const refinement = getRefinement(ring);
  
  if (refinement?.name === 'prisma') {
    const compactor = new TsPrismaCompactor({
      midstagePath: '.midstage/prisma-refinery',
      outputPath: ring.outputPath,
      schema: ring.schema,
      databaseUrl: refinement.config.databaseUrl
    });
    
    // Capture all @loom.crud.query SQL
    for (const query of collectQueries(ring)) {
      const { sql } = await refinement.captureSQL(query.lambda);
      compactor.addCapturedQuery(query.name, sql);
    }
    
    await compactor.compact();
  }
}
```

**Tasks:**
- [ ] Integrate TsPrismaCompactor with weaver
- [ ] Build query lambda → SQL capture pipeline
- [ ] Validate SQL with EXPLAIN QUERY PLAN
- [ ] Generate Rust output

---

### Phase 3: Lambda Execution & E2E Integration ✅ COMPLETE

> *"The loom weaves end-to-end."*

Execute query lambdas from `loom/*.ts`, capture SQL via Prisma, and generate TypeScript/Kysely output.

**The Solution:** Use `TsCompactor` — an **in-process** compactor that skips the "write → compile → run → write" cycle entirely!

```typescript
// The flow (all in main process):

1. Weaver.collectQueries()           // Reed: Import loom files
         ↓
2. Extract queryFn from methods      // queryFn attached by decorator
         ↓
3. TsCompactor.executeQuery()        // Execute with Prisma
         ↓
4. Capture SQL via $on('query')      // Prisma query log
         ↓
5. Generate Kysely TypeScript        // Direct file write
```

**Key Files:**
- `machinery/beater/ts-compactor.ts` — In-process compactor (no midstage!)
- `machinery/reed/query-collector.ts` — Extracts queryFn from classes
- `warp/crud.ts` — Decorator attaches `__queryFn` to methods
- `warp/refine/prisma.ts` — Uses TsCompactor in refinement

**Why This Works:**
- ✅ **No midstage compilation** — Everything stays in TypeScript
- ✅ **Direct execution** — Import loom files, call lambdas directly
- ✅ **Simple flow** — No serialization, no code generation hacks
- ✅ **Debuggable** — Regular TypeScript execution

#### 🏛️ Architecture Preservation

**The Compactor Pattern is Preserved:**

```
machinery/beater/
├── compactor.ts              ✅ Abstract pattern (generate → compile → run)
├── orm-compactor.ts          ✅ ORM-specific base
├── rust-query-builder-precompiler.ts 🚧 ARCHIVED: TS → Rust (pending query builder runtime design)
├── ts-prisma-kysely-aot.ts   📋 Concrete: TS → TS (uses full pattern)
├── ts-compactor.ts           ✅ Concrete: TS → TS (in-process shortcut)
└── ts-prisma-compactor.ts    ⚠️ DEPRECATED (old query-log approach)
```

**Two Valid Strategies:**

| Strategy | When to Use | Current Status |
|----------|-------------|----------------|
| **In-Process** (`ts-compactor.ts`) | Same language, fast iteration | ✅ **ACTIVE** |
| **Full Pattern** (`ts-prisma-kysely-aot.ts`) | Isolation, cross-language | 📋 Available |

#### 🛑 The Loom Halts Implemented

TsCompactor validates queries and throws helpful errors for unsupported patterns:

```typescript
// ❌ Caught at build time with clear message
@loom.crud.query((prisma, column) => prisma.media.findMany({ orderBy: { [column]: 'desc' } }))
sortBy(column: string): Promise<Media[]> {}
// 🔧 CRINKLE! Cannot precompile: Dynamic column name in orderBy
//     Options:
//     1. Use static column name
//     2. Remove @loom.crud.query decorator (use runtime Prisma)
//     3. Define multiple @loom.crud.query variants for each column
```

---

### Phase 4: Testing & Documentation 🚧 IN PROGRESS

> *"The loom is documented, the pattern preserved."*

- [ ] End-to-end testing
- [ ] Example loom projects
- [ ] Documentation cleanup
- [ ] Architecture diagram updates

---

### Phase 5: Full CRUD Operations

> *"Complete the translation matrix."*

Implement full Prisma → Kysely translation for all operations.

**Operations:**
- [ ] `findMany` with full `where` support (operators: `equals`, `in`, `gt`, `lt`, `contains`, etc.)
- [ ] `findUnique` / `findFirst`
- [ ] `create` / `createMany`
- [ ] `update` / `updateMany`
- [ ] `delete` / `deleteMany`
- [ ] `count`
- [ ] `aggregate`

---

### Phase 5: Relations & Advanced Features

> *"The full power of the query."

**Features:**
- [ ] `include` / `select` (eager loading, field selection)
- [ ] Transactions
- [ ] Raw queries (`$queryRaw`)
- [ ] Query batching

---

## The Final Output (FRONTEND ONLY)

> *"From Prisma API to Kysely SQL."*

Generate TypeScript/Kysely modules from captured SQL.

```typescript
// Output: generated/foundframe-front/media.gen.ts
import { Kysely } from 'kysely';
import type { Database, Media } from './types';

/**
 * createMedia — captured from Prisma via Kysely bridge
 * Original: prisma.media.create({ data: {...} })
 */
export async function createMedia(
  db: Kysely<Database>,
  data: { contentHash: string; uri: string; }
): Promise<Media> {
  return db.insertInto('media')
    .values({
      content_hash: data.contentHash,
      uri: data.uri,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * getMediaById — captured from Prisma
 * Original: prisma.media.findUnique({ where: { id } })
 */
export async function getMediaById(
  db: Kysely<Database>,
  id: number
): Promise<Media | undefined> {
  return db.selectFrom('media')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
}
```

**Key Benefits:**
- ✅ **Prisma API** in `loom/*.ts` for autocomplete
- ✅ **Kysely SQL** in output for zero overhead
- ✅ **Type-safe** — Full TypeScript types
- ✅ **Frontend only** — Rust core unchanged

**Tasks:**
- [ ] TypeScript interface generation from Drizzle schema
- [ ] Kysely query generation
- [ ] Parameter binding
- [ ] Result type inference

---

## Summary

## Summary

| Layer | Location | Technology | Output |
|-------|----------|-----------|--------|
| **WARP.ts** | `loom/WARP.ts` | `@loom.refine.withPrisma()` | Refinement attaches provider to ring |
| **Loom** | `loom/*.ts` | `@loom.crud.query((prisma) => ...)` | Query lambdas (autocomplete via refinement) |
| **Intent** | `schema.ts` | Drizzle + Decorators | Abstract CRUD operations |
| **Midstage** | `.midstage/` | Prisma + SQLite | Validated, optimized SQL |
| **Output** | `*.gen.ts` | TypeScript + Kysely | Zero-overhead prepared statements (FRONTEND ONLY) |

**Key Principle:** Prisma exists only in the midstage — it's the heavyweight champion that gets sacrificed to produce lightweight, optimized Kysely code.

### The Flow

```
WARP.ts ──────┐
  @loom.refine.withPrisma(prisma)
  const front = foundframe.typescript.ddd();
              │
              ▼
loom/*.ts ────┤  @loom.crud.query((prisma) => prisma.media.findMany(...))
              │
              ▼
Dressing ─────┤  Load Prisma provider, initialize client
              │
              ▼
Weaving ──────┤  For each @loom.crud.query:
              │    1. Execute lambda via Prisma-Kysely Bridge
              │    2. Bridge translates to Kysely
              │    3. Kysely generates & captures SQL
              │    4. Generate TypeScript with Kysely calls
              │
              ▼
Output ───────┘  *.gen.ts with Kysely (FRONTEND ONLY — NOT RUST!)
```

---

*"The ORM that devours itself to feed the spire."* 🔥🧵
