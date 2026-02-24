# The Refinery 🏭

> *"Prisma's essence, distilled to pure SQL."*

These bobbins contain the templates for the **TypeScript Prisma Compactor** — a staged metaprogramming harness that:

1. **Generates** a midstage TypeScript project with Prisma
2. **Installs** Prisma dynamically (no peer dependencies!)
3. **Captures** Prisma's optimized SQL via query logging
4. **Compacts** to Rust with static prepared statements

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SPIRE-LOOM (no Prisma dependency!)                         │
│                                                             │
│  machinery/beater/ts-prisma-compactor.ts  ──┐               │
│  (The Refinery — orchestrates)              │               │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                                              ▼ renders
┌─────────────────────────────────────────────────────────────┐
│  BOBBINS (templates)                                        │
│                                                             │
│  package.json.ejs        →  Midstage dependencies           │
│  tsconfig.json.ejs       →  TypeScript config               │
│  schema.prisma.ejs       →  Prisma schema                   │
│  compact.ts.ejs          →  Orchestrator script             │
│  capture.ts.ejs          →  SQL capture harness             │
│  rust-codegen.ts.ejs     →  Rust output generator           │
└─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼ generates
┌─────────────────────────────────────────────────────────────┐
│  MIDSTAGE (./.midstage/prisma-refinery/)                    │
│                                                             │
│  npm install  ────────────────────────┐                     │
│  prisma generate  ←── Prisma lives    │  Dynamic injection! │
│  tsc build       only here! ──────────┘                     │
│  node compact.ts                                            │
└─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼ captures
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT (*.gen.rs)                                          │
│                                                             │
│  static STMT: OnceLock<Statement> = OnceLock::new();        │
│  // ^ Prisma's optimized SQL, captured at generation time   │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Dynamic Dependencies

Prisma is **NOT** a peer dependency of spire-loom. It's injected dynamically into the midstage only when this compactor is used.

```typescript
// The Refinery auto-installs Prisma:
await this.injectDependencies();  // npm install in midstage
await this.generatePrismaClient(); // npx prisma generate
```

### Bobbin Pattern

Each `.ejs` file is a **bobbin** — a template that gets wound with data:

```typescript
await this.renderBobbin(
  'schema.prisma.ejs',
  'prisma/schema.prisma',
  { tables, pascalCase, mapToPrismaType }
);
```

### Layer Atop Rings

The Refinery is not a Ring — it's a **transformation layer** that can be applied to any ring's database access. Think of it as:

- A **sheath** around database operations
- A **distillation** process for ORM queries
- An **essence extractor** for SQL optimization

## Usage

```typescript
import { TsPrismaCompactor } from '@o19/spire-loom/machinery/beater';

const refinery = new TsPrismaCompactor({
  midstagePath: './.midstage/prisma-refinery',
  outputPath: '../foundframe/src/db',
  schema: parsedDrizzleSchema,
  database: 'sqlite',
  drizzleSchemaPath: './src/schema.ts',
  databaseUrl: 'file:./.midstage/temp.db'
});

const { generatedFiles } = await refinery.compact();
// → ['../foundframe/src/db/media.gen.rs', ...]
```

## The Name

**"The Refinery"** — like an oil refinery that distills crude petroleum into pure gasoline, this compactor distills heavyweight ORM queries into pure, optimized SQL.

Alternative names considered:
- The Alembic (alchemical vessel)
- The Still (distillation apparatus)
- The Extractor
- The Distillery

---

*"Prisma devours itself to feed the spire."* 🔥🧵
