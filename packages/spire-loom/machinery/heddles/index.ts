/**
 * Heddles
 *
 * Pattern matching for the loom. The heddles raise and lower warp threads,
 * matching spiral patterns against the generator matrix to determine
 * what code to generate.
 */

import type { EntityMetadata, ManagementMetadata, MethodMetadata } from '../../warp/metadata.js';
import type { QueryCollectionResult } from './query-collector.js';

// ============================================================================
// Core Types
// ============================================================================

export {
  type EnrichedMethodMetadata,
  type SpiralEdge,
  type SpiralNode,
  type ManagementMethods
} from './types.js';

export {
  getEffectiveTypeName,
  findNodeForRing,
  collectAllLayers,
  collectLayersFromRing,
  detectRelationship,
  findRoots,
  getPathToRoot
} from './traversal.js';

export * from './management-collector.js';
export * from './query-collector.js';

export interface Heddles extends QueryCollectionResult {
  mgmts: ManagementMetadata[];
  methods: MethodMetadata[];
  entities: EntityMetadata[];
  errors: string[];
}
