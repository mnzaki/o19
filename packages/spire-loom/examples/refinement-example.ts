/**
 * Refinement System Example
 *
 * Demonstrates how to use @loom.refine.withPrisma() in loom/WARP.ts
 */

// In loom/WARP.ts:
import { loom, foundframe } from '@o19/spire-loom/warp';

// Step 1: Create the Prisma refinement configuration
const prisma = foundframe.typescript.prisma({
  schema: './prisma/schema.prisma',
  databaseUrl: 'file:./data.db',
  version: '^5.10.0',
});

// Step 2: Apply refinement to a ring
@loom.refine.withPrisma(prisma)
const front = foundframe.typescript.ddd();

// Step 3: The front ring now has Prisma capabilities
// When we weave, the refinement will:
// 1. Auto-install Prisma in .midstage/
// 2. Make Prisma client available for @loom.crud.query
// 3. Capture SQL and compact to Rust

// In loom/media.ts:
// @spiral(MediaSpiral)
// class MediaWeave {
//   @loom.crud.query((prisma) => 
//     prisma.media.findMany({ where: { id: 1 } })
//   )
//   getMedia(): Promise<Media[]> {}
// }

/**
 * Expected flow during weaving:
 * 
 * 1. Weaver detects @loom.refine.withPrisma on 'front' ring
 * 2. Calls provider.initialize() → sets up midstage
 * 3. Calls provider.refine(ring, context) → triggers TsPrismaCompactor
 * 4. Compactor:
 *    - Generates midstage TypeScript with Prisma
 *    - npm install prisma @prisma/client (dynamic injection!)
 *    - npx prisma generate
 *    - Executes @loom.crud.query lambdas
 *    - Captures SQL via query log
 *    - Validates with EXPLAIN QUERY PLAN
 *    - Outputs *.gen.rs files
 * 
 * Output: foundframe/src/db/media.gen.rs
 * ```rust
 * static STMT: OnceLock<Statement> = OnceLock::new();
 * // ^ Prisma's optimized SQL, captured at generation time
 * ```
 */

console.log('Refinement example configured!');
console.log('Ring "front" has Prisma refinement attached.');
console.log('Run weaving to see the compaction in action.');
