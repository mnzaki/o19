/**
 * Heddles
 *
 * Pattern matching for the loom. The heddles raise and lower warp threads,
 * matching spiral patterns against the generator matrix to determine
 * what code to generate.
 */

// ============================================================================
// Core Types
// ============================================================================

export {
  type EnrichedMethodMetadata,
  type SpiralEdge,
  type SpiralNode,
  type GenerationTask,
  type WeavingPlan,
  type MethodHelpers,
  type GeneratorContext,
  type GeneratorFunction,
  type GeneratedFile,
  ensurePlanComplete,
} from './types.js';

// ============================================================================
// Matrix
// ============================================================================

export {
  GeneratorMatrix,
  DEFAULT_MATRIX,
} from './matrix.js';

// ============================================================================
// Enrichment (computed metadata from ownership chain)
// ============================================================================

export {
  enrichManagementMethods,
} from './enrichment.js';

// ============================================================================
// Traversal Utilities
// ============================================================================

export {
  getEffectiveTypeName,
  findNodeForRing,
  collectAllLayers,
  collectLayersFromRing,
  detectRelationship,
  findRoots,
  getPathToRoot,
} from './traversal.js';

// ============================================================================
// Metadata
// ============================================================================

export {
  ensureMetadata,
} from './metadata.js';

// ============================================================================
// Plan Builder (Main Heddles class)
// ============================================================================

export {
  Heddles,
  createHeddles,
} from './plan-builder.js';

// ============================================================================
// Legacy Re-export (for backward compatibility)
// ============================================================================

/** 
 * @deprecated Import from specific modules instead. 
 * This re-export will be removed in a future version.
 */
export * from './pattern-matcher.js';
