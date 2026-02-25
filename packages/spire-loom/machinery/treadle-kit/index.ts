/**
 * Treadle Kit 🧰
 *
 * Low-level utilities for building treadles.
 * This is the foundation that both declarative and imperative treadles build upon.
 *
 * > *"The weaver's kit holds all the tools of the craft."*
 */

// ============================================================================
// Core Types
// ============================================================================

export {
  type MethodConfig,
  type TreadleKit,
} from './types.js';

// ============================================================================
// Method Helpers
// ============================================================================

export {
  toRawMethod,
  buildMethodLink,
  extractManagementFromBindPoint,
  buildMethodHelpers,
} from './method-helpers.js';

// ============================================================================
// Kit Implementation
// ============================================================================

export {
  createTreadleKit,
  // Hookup utilities (re-exported for convenience)
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData,
} from './kit.js';

// ============================================================================
// Declarative API
// ============================================================================

export {
  defineTreadle,
  generateFromTreadle,
  type MatchPattern,
  type OutputSpec,
  type PatchSpec,
  type HookupConfig,
  type TreadleConfig,
  type TreadleDefinition,
  type OutputSpecOrFn,
  type PatchSpecOrFn,
} from './declarative.js';

// ============================================================================
// Stringing (pattern mapping utilities) - re-exported for convenience
// ============================================================================

export {
  // Case conversions
  pascalCase,
  camelCase,
  toSnakeCase,
  toSnakeCaseFull,
  // Naming
  type ServiceNaming,
  type AndroidPackageData,
  buildServiceNaming,
  buildAndroidPackageData,
  // AIDL type mapping
  mapToAidlType,
  addAidlTypesToParams,
  type AidlParam,
} from '../stringing.js';
