/**
 * Treadle Kit 🧰
 *
 * Low-level utilities for building treadles.
 * This is the foundation that both declarative and imperative treadles build upon.
 *
 * This module provides the public API. Implementation details are in sibling modules.
 *
 * > *"The weaver's kit holds all the tools of the craft."*
 *
 * @module machinery/treadle-kit
 */

// ============================================================================
// Public API: Kit (re-exported)
// ============================================================================

export { createTreadleKit } from './kit.js';

export type { TreadleKit, MethodConfig } from './types.js';

// ============================================================================
// Public API: Declarative API (re-exported)
// ============================================================================

export { declareTreadle, generateFromTreadle } from './declarative.js';

export type { MatchPattern, OutputSpec, TreadleDefinition, OutputSpecOrFn } from './declarative.js';

// ============================================================================
// Public API: Entity Helpers (re-exported)
// ============================================================================

export {
  buildComputedHelpers,
  computeFieldFlags,
  buildNumberedPlaceholders,
  buildPostgresPlaceholders,
  buildUpdateSetClause,
  buildInsertColumns,
  buildInsertValues,
  buildInsertStatement,
  buildSelectStatement,
  buildUpdateStatement,
  buildColumnDefinition,
  buildCreateTableStatement
} from './computed-entity-helpers.js';

// Re-export stringing utilities needed by treadles
export { buildTauriPluginNaming, buildCrateNaming } from '../stringing.js';

export type { EntityFieldMetadata, ComputedEntityHelpers } from './computed-entity-helpers.js';
