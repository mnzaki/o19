# Missing Metadata for Full DbBinding Generation

Based on analysis of `foundframe/src/db/actor.rs`, here's what's needed for optimal code generation.

## Current Working Pattern

The existing `MediaSource` in `actor.rs` shows the hand-written pattern we want to generate:

```rust
// 1. Data struct
pub struct MediaSource {
    pub id: i64,
    pub url: String,
    pub adapter_type: String,
    pub cursor_state: Option<String>,  // nullable
    // ...
}

// 2. Insert params struct  
pub struct InsertMediaSource {
    pub url: String,
    pub adapter_type: String,
    pub cursor_state: Option<String>,
    // ... (no id, no created_at/updated_at)
}

// 3. DbCommand variants
pub enum DbCommand {
    InsertSource { params: InsertMediaSource, respond: ... },
    GetById { id: i64, respond: ... },
    // ...
}

// 4. DbHandle async methods
impl DbHandle {
    pub async fn insert_source(&self, params: InsertMediaSource) -> Result<i64>;
}
```

## Required Entity Metadata

```typescript
interface EntityMetadata {
  name: string;              // "Bookmark"
  tableName: string;         // "bookmark" (snake_case)
  
  // Operations to generate
  operations: ('create' | 'read' | 'update' | 'delete' | 'list')[];
  
  fields: FieldMetadata[];
}
```

## Required Field Metadata

```typescript
interface FieldMetadata {
  // Identity
  name: string;              // "displayName" (camelCase in Rust)
  columnName: string;        // "display_name" (snake_case in SQL)
  
  // Types
  tsType: string;            // TypeScript type: "string", "number", "Record<string,unknown>"
  rustType: string;          // Mapped: "String", "i64", "serde_json::Value"
  sqlType: string;           // "TEXT", "INTEGER", "BOOLEAN"
  
  // Constraints
  nullable: boolean;         // Maps to Option<T> in Rust, NULL in SQL
  isPrimary: boolean;        // PRIMARY KEY AUTOINCREMENT
  unique: boolean;           // UNIQUE constraint
  
  // Auto-generated timestamps
  isCreatedAt: boolean;      // Auto-set on insert
  isUpdatedAt: boolean;      // Auto-set on update
  
  // Operation inclusion
  forInsert: boolean;        // Include in INSERT (false for id, created_at)
  forUpdate: boolean;        // Include in UPDATE (false for id, created_at)
  
  // Default value (optional)
  default?: string;          // "unixepoch()", "1", etc.
}
```

## Type Mapping Reference

| TypeScript | Rust | SQLite | Notes |
|------------|------|--------|-------|
| `number` | `i64` | `INTEGER` | timestamps, ids, counts |
| `string` | `String` | `TEXT` | urls, names, content |
| `boolean` | `bool` | `BOOLEAN` | flags, is_active |
| `Record<string,unknown>` | `serde_json::Value` | `TEXT` | JSON stored as string |
| `T \| null` | `Option<T>` | `NULL` | nullable fields |
| `Array<T>` | `Vec<T>` | `TEXT` | JSON array |

## What to Store in Decorators

Instead of complex decorators, we could store this metadata in the `@EntityMgmt` decorator:

```typescript
@BookmarkMgmt
export class Bookmark {
  // Static metadata field that the decorator reads
  static __entityMeta = {
    tableName: 'bookmark',
    fields: [
      { name: 'id', tsType: 'number', isPrimary: true },
      { name: 'url', tsType: 'string', nullable: false, forInsert: true, forUpdate: false },
      { name: 'title', tsType: 'string', nullable: true, forInsert: true, forUpdate: true },
      { name: 'createdAt', tsType: 'number', isCreatedAt: true, forInsert: false, forUpdate: false },
    ],
    operations: ['create', 'read', 'list', 'update', 'delete']
  };
  
  // Actual fields (no decorators needed)
  id: number;
  url: string;
  title?: string;
  createdAt: number;
}
```

The `@BookmarkMgmt` decorator would read `Bookmark.__entityMeta` and register with the loom.

## Alternative: Parser-Based Approach

Instead of decorators, parse the TypeScript source:

```typescript
// During treadle execution:
const source = readFileSync('bookmark.ts', 'utf8');
const fields = parseTypeScriptFields(source);
// Extract: property names, types, optionality from syntax
```

Pros:
- No runtime decorator overhead
- Works with existing syntax

Cons:
- More complex implementation
- No place for extra metadata (sqlType hints, etc.)

## Recommended Path

1. **Short-term**: Use static `__entityMeta` field pattern
   - Simple to implement
   - Explicit metadata
   - Type-safe with TypeScript interfaces

2. **Long-term**: Parser-based with optional decorators
   - Parse for basic fields
   - Use decorators only for overrides/hints

## Files to Update

When metadata is available, update:
- `rust/db/entity_data.rs.ejs` - Full data structs
- `rust/db/entity_trait.rs.ejs` - Complete Db traits
- `rust/db/commands.rs.ejs` - SQL query generation
- `rust/db/migration.rs.ejs` - CREATE TABLE statements (new)
