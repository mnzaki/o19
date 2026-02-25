/**
 * The Beater ⚒️
 *
 * "After the shuttle passes, the weft must be packed tight."
 *
 * The Beater compacts code by:
 * 1. Precompilation (ORM, validation, etc.) — remove runtime gaps
 * 2. Formatting — surface tidiness
 *
 * Three layers of abstraction:
 * - Compactor: Generic staged metaprogramming (generate → compile → run → output)
 * - OrmCompactor: Schema-aware compaction for database queries
 * - Concrete implementations: Various compactors for different use cases
 *
 * Architecture:
 * ```
 * Layer 1 (Generic):     Compactor ─────────────────────────┐
 *                              │                          │
 * Layer 2 (ORM):        OrmCompactor                      │
 *                              │                          │
 * Layer 3 (Concrete):   TsPrismaKyselyAot (full pattern) ──┤── Same pattern
 *                      TsCompactor (in-process) ──────────┘   Different approach
 *
 *                      [FUTURE: RustQueryBuilderPrecompiler]
 *                      Pending design of minimal Rust query builder runtime
 * ```
 */

// ============================================================================
// Layer 1: Abstract Compaction Pattern
// ============================================================================
// The "write → compile → run → write" staged metaprogramming pattern.
// Use for cross-language generation or when you need full isolation.
export {
  Compactor,
  defineCompactor,
  type CompactorConfig,
  type CompactorResult,
  type CompactorSpec
} from './compactor.js';

// ============================================================================
// Layer 2: ORM-Specific Compaction
// ============================================================================
// Extends Compactor with schema awareness for database query generation.
///export {
///  OrmCompactor,
///  defineOrmCompactor,
///  type OrmCompactorConfig,
///} from './orm-compactor.js';

// ============================================================================
// Layer 3: Concrete Implementations
// ============================================================================

// --- Cross-Language: TypeScript → Rust ---
// ARCHIVED: See rust-query-builder-precompiler.ts for future architecture
// export {
//   RustOrmlitePrecompiler,
//   precompileRustOrmlite,
// } from './rust-query-builder-precompiler.js';

// --- Same Language: TypeScript → TypeScript ---

// ⚡ In-Process (Fast, Simple)
// No midstage compilation. Stays in main process.
// Use for: TypeScript → TypeScript when you don't need isolation
//export {
//  TsCompactor,
//  compactTypeScript,
//  type TsCompactorConfig,
//  type TsCompactorResult,
//} from './ts-compactor.js';

// 🔧 Full Pattern (Isolation, Complex Dependencies)
// Uses full Compactor pattern with midstage generation + compilation
// Use for: Complex setups, clean isolation, multiple dependencies
//export {
//  TsPrismaKyselyAot,
//  compactWithPrismaKysely,
//  type TsPrismaKyselyAotConfig,
//} from './ts-prisma-kysely-aot.js';

// --- Utilities ---

// Prisma-Kysely Bridge for SQL capture
//export {
//  createPrismaKyselyBridge,
//  capturePrismaSQL,
//  type QueryCaptureCallback,
//} from './prisma-kysely-bridge.js';

// ============================================================================
// Naming Conventions
// ============================================================================
//
// "The Loom Halts" — when a query cannot be precompiled, the loom stops
// with a clear error message explaining why and offering alternatives.
//
// Example:
//   🔧 THE LOOM HALTS!
//   Cannot precompile query MediaWeave.sortBy:
//   Dynamic column name in orderBy: [column]
//
//   Options:
//   1. Use static column name
//   2. Remove @loom.crud.query decorator (use runtime Prisma)
//   3. Define multiple @loom.crud.query variants
//
