/**
 * The Sley 🪡
 *
 * Threading layer - resolves bindings between rings.
 *
 * The warp is threaded through the reed, and the pattern is set.
 * The sley ensures every bind-point connects to its correct destination.
 */

// Operation Router - CRUD routing for OperationMux
export {
  routeOperation,
  routeOperations,
  analyzeRouting,
  isHybridRouting,
  getReadAdaptor,
  getWriteAdaptor,
  generateCompositeImports,
  generateCompositeMethod,
  type RoutingInfo
} from './operation-router.js';

// Legacy modules - internal use only, will be removed
// These are kept for internal compatibility but not exported publicly
// Use method-pipeline for new code

// Query Builder - Chainable queries over methods (APP-009)
export { createQueryAPI, type BoundQuery, type QueryAPI } from './query.js';

// Entity Pipeline - composable translations for Entity classes
export {
  // Core types
  type Entity,
  type EntityTranslation,
  type EntityFilter,
  EntityPipeline,
  // Translations
  addPrefix as addEntityPrefix,
  setTableNamePattern,
  computeFieldHelpers,
  // Filters
  tagFilter as entityTagFilter,
  readOnlyFilter,
  // Grouping utilities
  groupByManagement as groupEntitiesByManagement,
  groupByReadOnly,
  // Utilities
  fromSourceEntities
} from './entity-pipeline.js';

export * as fileSystem from './file-system-operations.js';
export type * from './file-system-operations.js';

export * as xmlBlock from './xml-block-manager.js';
export type * from './xml-block-manager.js';

export * as workspacePackage from './workspace-package-manager.js';
export type * from './workspace-package-manager.js';

export * as packageJson from './package-json-manager.js';
export type * from './package-json-manager.js';

export * as cargoTools from './cargo-tools.js';
export type * from './cargo-tools.js';

export * as gradle from './gradle-manager.js';
export type * from './gradle-manager.js';

export * as cargoToml from './cargo-toml-manager.js';
export type * from './cargo-toml-manager.js';

export * as hookup from './hookup-manager.js';
export type * from './hookup-manager.js';

export * as tauri from './tauri-manager.js';
export type * from './tauri-manager.js';

export * as blockRegistry from './block-registry.js';
export type * from './block-registry.js';

export * as markers from './markers.js';
export type * from './markers.js';
