/**
 * Reed
 *
 * Workspace discovery and Management collection.
 * The reed scans the monorepo to understand its structure
 * before weaving begins.
 */

export {
  collectManagements,
  filterByReach,
  filterByCrud,
  groupByReach,
  toAidlMethods,
  type ManagementMetadata,
  type MethodMetadata,
  type CrudOperation,
  type ReachLevel,
} from './management-collector.js';

export {
  parseDrizzleSchema,
  validateSchema,
  type ParsedSchema,
  type TableDef,
  type ColumnDef,
  type QueryDef,
} from './drizzle-parser.js';

export {
  collectQueriesFromDirectory,
  collectQueriesFromFile,
  type CollectedQuery,
  type QueryCollectionResult,
} from './query-collector.js';

export {
  detectWorkspace,
  loadWarp,
  getSuggestedPackageFilter,
  type WorkspaceInfo,
} from './workspace-discovery.js';

// Re-export EntityFieldMetadata from warp for machinery use
export type { EntityFieldMetadata } from '@o19/spire-loom/warp/imprint';

// Shared class metadata collector pattern (for entity field collection and future use)
export {
  createCollector,
  createDeepCollector,
  isInstanceOf,
  withName,
  type ClassMetadataCollector,
  type CollectorConfig,
  type PredicateFn,
  type ExtractorFn,
} from './class-metadata-collector.js';

// Entity field collection (uses shared collector pattern)
export {
  collectEntityFields,
  getEntityFields,
} from './entity-field-collector.js';
