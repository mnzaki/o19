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
// Public API: Context Methods (re-exported)
// ============================================================================

export {
  toRawMethod,
  buildMethodLink,
  extractManagementFromBindPoint,
  buildContextMethods
} from './context-methods.js';

// ============================================================================
// Public API: Kit (re-exported)
// ============================================================================

export { createTreadleKit } from './kit.js';

export type { TreadleKit, MethodConfig } from './types.js';

// ============================================================================
// Public API: Shuttle Integration (re-exported for convenience)
// ============================================================================

export { hookup } from '../shuttle/index.js';
export type { hookup as HookupTypes } from '../shuttle/index.js';

// ============================================================================
// Public API: Declarative API (re-exported)
// ============================================================================

export { declareTreadle, generateFromTreadle } from './declarative.js';

export type {
  MatchPattern,
  OutputSpec,
  PatchSpec,
  TreadleDefinition,
  OutputSpecOrFn,
  PatchSpecOrFn
} from './declarative.js';

// ============================================================================
// Public API: Stringing (re-exported for convenience)
// ============================================================================

export {
  pascalCase,
  camelCase,
  toSnakeCase,
  toSnakeCaseFull,
  buildServiceNaming,
  buildAndroidPackageData,
  buildWrapperNaming,
  buildAndroidServiceNaming,
  buildTauriPluginNaming,
  mapToAidlType,
  addAidlTypesToParams,
  addAidlTypesToMethods
} from '../stringing.js';

export type {
  ServiceNaming,
  AndroidPackageData,
  WrapperNaming,
  AidlParam,
  AidlMethod
} from '../stringing.js';

// ============================================================================
// Public API: Query Builder (re-exported for convenience)
// ============================================================================

export { createQueryAPI } from '../sley/query.js';

export type { BoundQuery, QueryAPI, MethodQueryAPI, CrudOperation } from '../sley/query.js';

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

export type { EntityFieldMetadata, ComputedEntityHelpers } from './computed-entity-helpers.js';

// ============================================================================
// Public API: Context Entities (re-exported)
// ============================================================================

export { buildContextEntities } from './context-entities.js';

// ============================================================================
// Public API: Enhancement Types (re-exported for treadle authors)
// ============================================================================

export type { LanguageView, EnhancedMethod } from '../reed/enhanced/index.js';
