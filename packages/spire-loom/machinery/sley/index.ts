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

// Method Pipeline - composable translations for Management methods
export {
  // Core types
  type MgmtMethod,
  type MgmtParam,
  type MethodTranslation,
  type MethodFilter,
  MethodPipeline,
  // Translations
  addPrefix,
  addManagementPrefix,
  crudInterfaceMapping,
  mapTypes,
  // Filters
  tagFilter,
  crudOperationFilter,
  // Grouping utilities
  groupByManagement,
  groupByCrud,
  // Utilities
  fromSourceMethods
} from './method-pipeline.js';

// Legacy modules - internal use only, will be removed
// These are kept for internal compatibility but not exported publicly
// Use method-pipeline for new code

// Query Builder - Chainable queries over methods (APP-009)
export {
  createQueryAPI,
  type BoundQuery,
  type QueryAPI,
  type MethodQueryAPI,
  type CrudOperation
} from './query.js';

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
