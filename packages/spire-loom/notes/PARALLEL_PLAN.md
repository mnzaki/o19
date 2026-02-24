# Parallel Work Plan: Spire-Loom + Foundframe

> *"Two threads, one loom. The fabric is stronger when woven together."* 🧵

## Current State (February 2026)

### ✅ Completed
- **New Management Classes Created:**
  - `loom/media.ts` (MediaMgmt) - 5 CRUD methods
  - `loom/post.ts` (PostMgmt) - 5 CRUD methods  
  - `loom/person.ts` (PersonMgmt) - 5 CRUD methods
  - `loom/conversation.ts` (ConversationMgmt) - 11 methods (CRUD + operations)
- **Foundframe Core Fixes:**
  - DeviceManager method aliases added
  - Mutable borrow fixed in desktop.rs
- **Generation Pipeline:** Basic Tauri generation functional

### 🔄 Active Work
- **ORM Architecture:** Designing precompiled query system (see Midstage Architecture below)
- **Media Source System:** Needs persistence layer (blocked on ORM decision)

---

## The Midstage Architecture: Precompiled ORM

> *"Like Svelte shifts work to compile-time, we shift ORM work to generation-time."*

### The Problem
Traditional ORMs do work at runtime:
- Parse query builder expressions → SQL
- Map rows → structs via reflection/runtime codegen
- Manage connection pools dynamically

For foundframe, we can do better. Since **spire-loom already generates code**, we can precompile the ORM entirely.

### The Solution: Three-Stage Weaving

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: Parse (Loom)                                                       │
│                                                                             │
│   schema.ts (Drizzle)  ──►  AST of tables, columns, relationships          │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────┐                                   │
│   │  Spire-Loom: Reed (collect)         │                                   │
│   │  - Extract table definitions        │                                   │
│   │  - Parse column types               │                                   │
│   │  - Identify relationships           │                                   │
│   └─────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: Midstage Generation (Loom → Binary)                                │
│                                                                             │
│   ┌─────────────────────────────────────┐                                   │
│   │  Generate: midstage/main.rs         │                                   │
│   │  - Structs with #[derive(Model)]    │                                   │
│   │  - Query metadata tables            │                                   │
│   │  - "Query description" structs      │                                   │
│   │                                     │                                   │
│   │  Example generated code:            │                                   │
│   │  ```rust                            │                                   │
│   │  #[derive(Query)]                   │                                   │
│   │  struct GetMediaById {              │                                   │
│   │      id: i64,                       │                                   │
│   │  }                                  │                                   │
│   │  // Generates: SELECT * FROM media  │                                   │
│   │  //                WHERE id = ?     │                                   │
│   │  ```                                │                                   │
│   └─────────────────────────────────────┘                                   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────┐                                   │
│   │  Compile: midstage/ → midstage-bin  │                                   │
│   │  - Uses ormlite (minimal runtime)   │                                   │
│   │  - Links to actual SQLite for now   │                                   │
│   │  - Can run against schema           │                                   │
│   └─────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: Database Service Generation (Binary → Final Code)                  │
│                                                                             │
│   Run midstage-bin:                                                         │
│   - Connects to SQLite (or parses schema directly)                          │
│   - For each Query description:                                             │
│     * Validates SQL against database                                        │
│     * Generates prepared statement code                                     │
│     * Generates result deserializer                                         │
│                                                                             │
│   Output:                                                                   │
│   ```                                                                       │
│   foundframe/src/db/                                                        │
│   ├── mod.rs          # Connection management                               │
│   ├── media.rs        # Media queries (hand-written + generated)           │
│   ├── media.gen.rs    # Generated: get_by_id, list_all, etc.               │
│   └── ...                                                                   │
│   ```                                                                       │
│                                                                             │
│   Each query becomes:                                                       │
│   ```rust                                                                   │
│   // Generated code - no runtime ORM!                                       │
│   pub async fn get_media_by_id(                                             │
│       conn: &mut Connection,                                                │
│       id: i64                                                               │
│   ) -> Result<Option<Media>> {                                              │
│       // Prepared statement cached in thread-local                          │
│       static STMT: OnceCell<Statement> = OnceCell::new();                   │
│       let stmt = STMT.get_or_init(|| {                                      │
│           conn.prepare("SELECT id, content_hash, ... FROM media WHERE id = ?")
│       });                                                                   │
│       let row = stmt.query_row([id], |row| {                                │
│           Ok(Media {                                                        │
│               id: row.get(0)?,                                              │
│               content_hash: row.get(1)?,                                    │
│               // ...                                                        │
│           })                                                                │
│       });                                                                   │
│       Ok(row.ok())                                                          │
│   }                                                                         │
│   ```                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Approach?

| Aspect | Traditional ORM | Precompiled (Ours) |
|--------|-----------------|-------------------|
| **Runtime cost** | Query building, reflection | Zero - just prepared statements |
| **Type safety** | Runtime errors possible | Compile-time verified |
| **Binary size** | ORM library included | Only generated code |
| **Performance** | Good | Excellent - no overhead |
| **Flexibility** | Dynamic queries | Static queries (by design) |

### The "Svelte" Parallel

Just as Svelte:
- **Compiles** components at build time
- **Outputs** optimized vanilla JS
- **Eliminates** the virtual DOM runtime

Our ORM:
- **Compiles** queries at generation time (via midstage)
- **Outputs** optimized SQL + deserialization
- **Eliminates** the query builder runtime

### Schema-Driven Workflow

```typescript
// packages/foundframe-drizzle/src/schema.ts
export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentHash: text('content_hash'),
  mimeType: text('mime_type').notNull(),
  uri: text('uri').notNull(),
  // ...
});

// New: Query definitions alongside schema
export const mediaQueries = {
  getById: defineQuery`
    SELECT * FROM media WHERE id = ${'id'}
  `,
  listByMimeType: defineQuery`
    SELECT * FROM media WHERE mime_type = ${'mimeType'} ORDER BY created_at DESC
  `,
  // Complex join: media + source info
  getWithSource: defineQuery`
    SELECT m.*, s.url as source_url 
    FROM media m
    JOIN media_source s ON m.source_id = s.id
    WHERE m.id = ${'id'}
  `,
};
```

The midstage binary validates these queries against the actual schema at generation time.

---

## Parallel Work Streams

### Stream A: Midstage Infrastructure (New)
**Owner:** spire-kimi  
**Goal:** Build the three-stage ORM generation pipeline

#### Task A1: Drizzle Schema Parser
**Priority:** CRITICAL  
**File:** `machinery/reed/drizzle-parser.ts`

Parse `packages/foundframe-drizzle/src/schema.ts`:
```typescript
// Extract table definitions
interface TableDef {
  name: string;
  columns: ColumnDef[];
  primaryKey?: string;
  foreignKeys: ForeignKeyDef[];
}

// Used to generate midstage structs
```

#### Task A2: Midstage Code Generator
**Priority:** CRITICAL  
**File:** `machinery/treadles/orm-midstage-generator.ts`

Generate `midstage/src/main.rs`:
- Structs with `#[derive(ormlite::Model)]`
- Query description enums
- Validation and code generation logic

#### Task A3: Midstage Compilation & Execution
**Priority:** HIGH  
**File:** `machinery/weaver/midstage-runner.ts`

Steps:
1. Generate midstage code to `packages/spire-loom/.midstage/`
2. Compile: `cargo build --manifest-path .midstage/Cargo.toml`
3. Run: `.midstage/target/release/midstage`
4. Capture output to `foundframe/src/db/*.gen.rs`

#### Task A4: Integration with Loom Pipeline
**Priority:** HIGH  
**File:** `machinery/weaver.ts`

Add to weaving plan:
```typescript
// New task type
interface GenerateDatabaseServiceTask {
  type: 'generate-db-service';
  schemaPath: string;
  outputPath: string;
}

// Run midstage before other generators if schema changed
```

---

### Stream B: Database Service Templates
**Owner:** kimi  
**Goal:** Create templates for final generated code

#### Task B1: Connection Management
**Priority:** HIGH  
**File:** `crates/foundframe/src/db/mod.rs`

Implement:
```rust
pub struct Database {
    pool: Pool<SqliteConnection>, // or thread-local for turbosql
}

impl Database {
    pub async fn new(path: &Path) -> Result<Self>;
    pub async fn migrate(&self) -> Result<()>;
}
```

#### Task B2: Media Source Schema Addition
**Priority:** HIGH  
**File:** `packages/foundframe-drizzle/src/schema.ts`

Add table for media source persistence:
```typescript
export const mediaSource = sqliteTable('media_source', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(), // file:///path, s3://bucket
  adapterType: text('adapter_type').notNull(),
  cursorState: text('cursor_state', { mode: 'json' }),
  capabilities: text('capabilities', { mode: 'json' }).notNull(),
  config: text('config', { mode: 'json' }),
  lastPolledAt: integer('last_polled_at', { mode: 'timestamp_ms' }),
  lastError: text('last_error'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});
```

#### Task B3: Media Source Persistence
**Priority:** MEDIUM  
**File:** `crates/foundframe/src/media/source.rs`

Redesign with persistence:
```rust
pub struct MediaSourceRegistry {
    db: Arc<Database>,
    // No more in-memory HashMap - all in DB
}

impl MediaSourceRegistry {
    pub async fn register(&self, source: MediaSource) -> Result<i64>;
    pub async fn list_active(&self) -> Result<Vec<MediaSource>>;
    pub async fn update_cursor(&self, id: i64, cursor: SourceCursor) -> Result<()>;
    pub async fn get_cursor(&self, id: i64) -> Result<Option<SourceCursor>>;
}
```

---

## Handoff Points

### When Stream A completes:
- [ ] `pnpm spire-loom` generates midstage code
- [ ] Midstage compiles successfully
- [ ] Midstage binary runs and outputs `*.gen.rs` files
- [ ] Generated code compiles with `cargo check -p o19-foundframe`

### When Stream B completes:
- [ ] `media_source` table in Drizzle schema
- [ ] Connection management in `foundframe/src/db/`
- [ ] Media source registry uses DB persistence
- [ ] Full `cargo check -p o19-foundframe` passes

### Integration Test:
```bash
cd o19
pnpm spire-loom  # Should trigger midstage generation
cargo check -p o19-foundframe
cargo test -p o19-foundframe  # If tests exist
```

---

## Quick Reference

### Midstage File Structure

```
packages/spire-loom/
├── machinery/
│   ├── reed/
│   │   └── drizzle-parser.ts      # NEW: Parse schema.ts
│   ├── treadles/
│   │   └── orm-midstage-generator.ts  # NEW: Generate midstage
│   └── weaver/
│       └── midstage-runner.ts     # NEW: Compile & run midstage
└── .midstage/                     # gitignored, generated
    ├── Cargo.toml
    └── src/
        ├── main.rs                # Entry point
        ├── schema.rs              # Generated from Drizzle
        └── queries/
            ├── media.rs
            └── ...
```

### Database Output Structure

```
crates/foundframe/
└── src/
    └── db/                        # NEW: Database layer
        ├── mod.rs                 # Connection, migrations
        ├── media.rs               # Hand-written complex queries
        ├── media.gen.rs           # GENERATED: simple queries
        ├── media_source.rs
        ├── media_source.gen.rs
        └── ...
```

### Debug Commands

```bash
# Run just the ORM generation
cd o19
pnpm spire-loom --stage midstage

# Check midstage compilation
ls -la packages/spire-loom/.midstage/target/release/midstage

# Verify generated queries
grep -r "SELECT" crates/foundframe/src/db/*.gen.rs

# Test database layer
cargo test -p o19-foundframe -- db::
```

---

## Notes

- **Minimal Runtime:** The goal is near-zero runtime ORM cost. All query building happens at generation time.
- **Schema as Source of Truth:** Drizzle schema drives everything. Rust code is generated, not hand-maintained.
- **Escape Hatches:** Complex queries can be hand-written in `*.rs` files (not `*.gen.rs`), using the same connection layer.
- **Migration Strategy:** Initially, keep ormlite for midstage only. Eventually, we might replace it with raw sqlite for even less overhead.
- **Svelte Inspiration:** This is "compile-time ORM" — shift work to where it costs least.

---

*Last updated: February 2026*  
*Weaving the midstage, spinning toward zero-cost ORM*
