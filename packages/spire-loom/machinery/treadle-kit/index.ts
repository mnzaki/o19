/**
 * Treadle Kit - Index
 *
 * Public API for defining and using treadles declaratively.
 */

// Core - export everything
export * from './core.js';

// Platform wrapper exports
export { buildTauriPluginNaming } from './platform-wrapper.js';
export type { WrapperNaming } from './platform-wrapper.js';

// Declarative API
export { defineTreadle, generateFromTreadle } from './declarative.js';
export type {
  MatchPattern,
  MethodConfig,
  OutputSpec,
  OutputSpecOrFn,
  PatchSpec,
  PatchSpecOrFn,
  HookupConfig,
  TreadleDefinition,
} from './declarative.js';

// Spec Resolver (for advanced use)
export {
  resolveSpec,
  resolveSpecs,
  resolveSpecsWithCondition,
  resolveSpecsWithFilter,
} from './spec-resolver.js';
export type { SpecOrFn, ConditionalSpec } from './spec-resolver.js';

// Shuttle re-exports (for hookups)
export {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData,
} from '../shuttle/hookup-manager.js';
