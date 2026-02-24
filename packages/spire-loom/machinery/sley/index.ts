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
  type RoutingInfo,
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
  // Utilities
  toSnakeCase,
  fromSourceMethods,
} from './method-pipeline.js';

// CRUD Mapping - legacy CRUD resolution (use method-pipeline for new code)
export {
  type Tag,
  type TagFilter,
  type CrudAdaptorConfig,
  type CrudMapping,
  type ParamMapping,
  type ManagementCrudMethods,
  type PassthroughMethod,
  type SourceMethod,
  shouldFilterMethod,
  filterMethodsByTags,
  isCrudAdaptorEnabled,
  mapManagementCrud,
} from './crud-mapping.js';

// Method Translator - legacy translation (use method-pipeline for new code)
export {
  type TranslatedMethod,
  type TranslatedParam,
  type SourceMethod as TranslatorSourceMethod,
  type TranslationConfig,
  type GroupedMethods,
  translateMethods,
  translateAndGroupMethods,
} from './method-translator.js';
