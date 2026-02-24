/**
 * WARP — The Weaving Abstraction & Reflection Protocol
 *
 * "The warp is the foundation. All weaving begins here."
 */

// Spiral system (rings, surfaces, spirals)
export * from './spiral/index.js';

// Imprint decorators (management definitions)
export * from './imprint.js';

// CRUD decorators (@loom.crud.create, @loom.crud.query, etc.)
export * as crud from './crud.js';

// Rust generation helpers
export * as rust from './rust.js';

// === REFINEMENT SYSTEM ===
// Refinement providers and decorators (@loom.refine.withPrisma)
export * as refinement from './refine/index.js';
export {
  type RefinementProvider,
  type RefinementMetadata,
  type RefinementResult,
  type WeavingContext,
  REFINEMENT_KEY,
} from './refine/types.js';
export {
  withRefinement,
  getRefinements,
  hasRefinements,
  getRefinement,
} from './refine/decorator.js';

// === OPERATION ROUTING ===
// OperationMux for read/write splitting (exported via spiral/index.js)

// === TIEUPS ===
// Custom treadle attachment for code generation
// === LAYERS ===
// Layer and Layering base classes
export { Layer, Layering, ExternalLayer } from './layers.js';

// === TIEUPS ===
// Custom treadle attachment for code generation
export {
  tieup,
  type CustomTreadle,
  type TreadleContext,
  type TreadleUtils,
  type TreadleResult,
  type TieupConfig,
  type StoredTieup,
  getTieups,
  addTieup,
  executeTieups,
} from './tieups.js';

// The loom namespace - main API
import { refine } from './refine/index.js';
import { operationMux, hybridAdaptor } from './spiral/operation-mux.js';

// Convenience: export loom namespace
export const loom = {
  refine,
  operationMux,
  hybridAdaptor,
  // crud is exported separately above
  // tieup is now on Layer class
} as const;
