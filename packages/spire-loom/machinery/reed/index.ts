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
