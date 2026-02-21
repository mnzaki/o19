/**
 * CRUD Taxonomy for Management Operations
 *
 * Not all Management methods are CRUD operations, but when they are,
 * we can reason about them generically. This enables:
 * - Filtering adaptor implementations by operation type
 * - Generating consistent APIs across layers
 * - Optimizing implementations (e.g., batch reads, soft deletes)
 */

// ============================================================================
// CRUD Operation Types
// ============================================================================

/**
 * The fundamental CRUD operations.
 * These are the verbs of persistence.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * All CRUD operations as a set.
 * Useful for defaults and validation.
 */
export const ALL_CRUD_OPERATIONS: CrudOperation[] = ['create', 'read', 'update', 'delete', 'list'];

/**
 * Read operations - those that query without mutation.
 * Used for filtering "read-only" adaptors.
 */
export const READ_OPERATIONS: CrudOperation[] = ['read', 'list'];

/**
 * Write operations - those that mutate state.
 * Used for filtering "write" adaptors.
 */
export const WRITE_OPERATIONS: CrudOperation[] = ['create', 'update', 'delete'];

// ============================================================================
// CRUD Metadata
// ============================================================================

/**
 * Metadata attached to CRUD-decorated methods.
 */
export interface CrudMetadata {
  /** The CRUD operation type */
  operation: CrudOperation;

  /** The entity being operated on (inferred from method name if not specified) */
  entity?: string;

  /** Whether this is a soft delete (for delete operations) */
  soft?: boolean;

  /** Whether this returns a collection (for list operations) */
  collection?: boolean;
}

// ============================================================================
// Decorator
// ============================================================================

/**
 * Decorator to mark a Management method as a CRUD operation.
 *
 * Usage:
 *   @crud('create')
 *   addBookmark(url: string): string
 *
 *   @crud('read')
 *   getBookmark(pkbUrl: string): Bookmark
 *
 *   @crud('list', { collection: true })
 *   listBookmarks(): Bookmark[]
 *
 *   @crud('delete', { soft: true })
 *   deleteBookmark(pkbUrl: string): boolean
 */
export function crud(
  operation: CrudOperation,
  options?: Omit<CrudMetadata, 'operation'>
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Store metadata on the method
    if (!target._crudMethods) {
      target._crudMethods = new Map();
    }
    target._crudMethods.set(propertyKey, {
      operation,
      ...options
    });
    return descriptor;
  };
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Filter specification for CRUD operations.
 * Used when generating adaptors to limit which methods are implemented.
 */
export type CrudFilter = CrudOperation[] | 'all' | 'read' | 'write';

/**
 * Normalize a CrudFilter to an array of operations.
 */
export function normalizeCrudFilter(filter: CrudFilter): CrudOperation[] {
  if (filter === 'all') return ALL_CRUD_OPERATIONS;
  if (filter === 'read') return READ_OPERATIONS;
  if (filter === 'write') return WRITE_OPERATIONS;
  return filter;
}

/**
 * Check if an operation passes the filter.
 */
export function operationMatchesFilter(
  operation: CrudOperation,
  filter: CrudFilter
): boolean {
  const allowed = normalizeCrudFilter(filter);
  return allowed.includes(operation);
}
