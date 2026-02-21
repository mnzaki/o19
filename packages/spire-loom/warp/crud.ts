/**
 * CRUD Taxonomy for Management Operations
 *
 * Re-exported from imprint.ts for convenience.
 */

import { type CrudOperation } from './imprint.js';
export { 
  crud, 
  type CrudMetadata,
  type CrudOperation 
} from './imprint.js';

// CRUD filtering utilities

export type CrudFilter = CrudOperation[] | 'all' | 'read' | 'write';

export const ALL_CRUD_OPERATIONS: CrudOperation[] = ['create', 'read', 'update', 'delete', 'list'];
export const READ_OPERATIONS: CrudOperation[] = ['read', 'list'];
export const WRITE_OPERATIONS: CrudOperation[] = ['create', 'update', 'delete'];

export function normalizeCrudFilter(filter: CrudFilter): CrudOperation[] {
  if (filter === 'all') return ALL_CRUD_OPERATIONS;
  if (filter === 'read') return READ_OPERATIONS;
  if (filter === 'write') return WRITE_OPERATIONS;
  return filter;
}

export function operationMatchesFilter(
  operation: CrudOperation,
  filter: CrudFilter
): boolean {
  const allowed = normalizeCrudFilter(filter);
  return allowed.includes(operation);
}
