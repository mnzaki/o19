/**
 * CRUD Taxonomy for Management Operations
 *
 * Stage 3 decorators for marking methods with their CRUD operations.
 *
 * Usage:
 *   @loom.crud.create
 *   addBookmark(url: string): void { ... }
 *
 *   @loom.crud.read({ collection: true })
 *   listBookmarks(): string[] { ... }
 */

// ============================================================================
// Types
// ============================================================================

/**
 * CRUD operation type.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * Metadata for CRUD operations.
 */
export interface CrudMetadata {
  operation: CrudOperation;
  entity?: string;
  soft?: boolean;
  collection?: boolean;
}

// ============================================================================
// Temporary Storage (for Stage 3 decorator timing)
// ============================================================================

/**
 * Temporary storage for method metadata before class is known.
 * Method decorators run before class decorators in Stage 3.
 */
let pendingCrudMethods: Array<{ methodName: string; metadata: CrudMetadata; tag: string }> = [];

/**
 * Get and clear pending CRUD methods.
 * Called by the @reach decorator to collect method metadata.
 */
export function flushPendingCrudMethods(): Array<{ methodName: string; metadata: CrudMetadata; tag: string }> {
  const methods = [...pendingCrudMethods];
  pendingCrudMethods = [];
  return methods;
}

// ============================================================================
// Base CRUD Decorator Factory (with "hack" for parentheses-less usage)
// ============================================================================

/**
 * Create a CRUD decorator for a specific operation.
 * 
 * The "hack": Works both as @decorator and @decorator()
 * - When used as @decorator: first arg is the method (function)
 * - When used as @decorator(): first arg is options (object or undefined)
 */
function createCrudDecorator(operation: CrudOperation) {
  // The outer function is what users call
  function decorator(
    options?: Omit<CrudMetadata, 'operation'>
  ): (_target: any, context: ClassMethodDecoratorContext) => any;
  
  // Overload for direct decorator usage: @decorator
  function decorator(
    _target: any,
    context: ClassMethodDecoratorContext
  ): any;
  
  // Implementation
  function decorator(
    arg1?: any,
    arg2?: ClassMethodDecoratorContext
  ): any {
    // Direct usage: @decorator (arg2 is the decorator context)
    if (arg2 && typeof arg2 === 'object' && 'kind' in arg2 && arg2.kind === 'method') {
      const context = arg2;
      pendingCrudMethods.push({
        methodName: String(context.name),
        metadata: { operation },
        tag: `crud:${operation}`
      });
      return arg1; // Return original method
    }
    
    // Factory usage: @decorator() or @decorator({...})
    const options = arg1;
    return function (_target: any, context: ClassMethodDecoratorContext) {
      pendingCrudMethods.push({
        methodName: String(context.name),
        metadata: { operation, ...options },
        tag: `crud:${operation}`
      });
      return _target;
    };
  }
  
  return decorator;
}

// ============================================================================
// Individual CRUD Decorators
// ============================================================================

/**
 * Mark a method as a CREATE operation.
 *
 * @example
 *   @loom.crud.create
 *   addBookmark(url: string): void { ... }
 */
export const create = createCrudDecorator('create');

/**
 * Mark a method as a READ operation.
 *
 * @example
 *   @loom.crud.read
 *   getBookmark(id: string): Bookmark { ... }
 *
 *   @loom.crud.read({ collection: true })
 *   listBookmarks(): Bookmark[] { ... }
 */
export const read = createCrudDecorator('read');

/**
 * Mark a method as an UPDATE operation.
 *
 * @example
 *   @loom.crud.update
 *   editBookmark(id: string, changes: Partial<Bookmark>): void { ... }
 */
export const update = createCrudDecorator('update');

/**
 * Mark a method as a DELETE operation.
 *
 * @example
 *   @loom.crud.delete
 *   removeBookmark(id: string): void { ... }
 *
 *   @loom.crud.delete({ soft: true })
 *   archiveBookmark(id: string): void { ... }
 */
export const delete_ = createCrudDecorator('delete');

/**
 * Mark a method as a LIST operation (collection read).
 *
 * @example
 *   @loom.crud.list
 *   listBookmarks(): Bookmark[] { ... }
 */
export const list = createCrudDecorator('list');

// ============================================================================
// Legacy crud() function (for backward compatibility)
// ============================================================================

/**
 * Mark a method with a CRUD operation.
 *
 * @deprecated Use individual decorators like @loom.crud.create, @loom.crud.read
 *
 * @example
 *   @loom.crud('create')
 *   addBookmark(url: string): void { ... }
 */
export function crud(
  operation: CrudOperation,
  options?: Omit<CrudMetadata, 'operation'>
): (_target: any, context: ClassMethodDecoratorContext) => any {
  return createCrudDecorator(operation)(options);
}

// ============================================================================
// CRUD Filtering Utilities
// ============================================================================

/**
 * Filter type for CRUD operations.
 */
export type CrudFilter = CrudOperation[] | 'all' | 'read' | 'write';

/**
 * All CRUD operations.
 */
export const ALL_CRUD_OPERATIONS: CrudOperation[] = ['create', 'read', 'update', 'delete', 'list'];

/**
 * Read operations (includes list).
 */
export const READ_OPERATIONS: CrudOperation[] = ['read', 'list'];

/**
 * Write operations (mutations).
 */
export const WRITE_OPERATIONS: CrudOperation[] = ['create', 'update', 'delete'];

/**
 * Normalize a CRUD filter to an array of operations.
 */
export function normalizeCrudFilter(filter: CrudFilter): CrudOperation[] {
  if (filter === 'all') return ALL_CRUD_OPERATIONS;
  if (filter === 'read') return READ_OPERATIONS;
  if (filter === 'write') return WRITE_OPERATIONS;
  return filter;
}

/**
 * Check if an operation matches a filter.
 */
export function operationMatchesFilter(
  operation: CrudOperation,
  filter: CrudOperation[]
): boolean {
  return filter.includes(operation);
}
