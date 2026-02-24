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
export function flushPendingCrudMethods(): Array<{
  methodName: string;
  metadata: CrudMetadata;
  tag: string;
}> {
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
  function decorator(_target: any, context: ClassMethodDecoratorContext): any;

  // Implementation
  function decorator(arg1?: any, arg2?: ClassMethodDecoratorContext): any {
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
export function operationMatchesFilter(operation: CrudOperation, filter: CrudOperation[]): boolean {
  return filter.includes(operation);
}

// ============================================================================
// Query Decorator (@loom.crud.query) — SQL Compaction Support
// ============================================================================

/**
 * Query lambda that takes an ORM client and returns a query.
 *
 * This is used with @loom.crud.query to define custom queries
 * that get captured and compacted to SQL during weaving.
 */
export type QueryLambda<TClient = unknown, TResult = unknown> = (
  client: TClient
) => Promise<TResult>;

/**
 * Metadata stored for a @loom.crud.query decorated method.
 */
export interface QueryMetadata {
  /** The type of CRUD operation */
  type: 'query';

  /** The query lambda (captured at parse time) */
  queryFn?: QueryLambda;

  /** Name of the method */
  methodName: string;

  /** Return type as declared (for type inference) */
  returnType?: string;

  /** Whether to capture SQL during weaving */
  captureAtWeave: boolean;

  /** The ORM provider that should execute this query */
  providerName?: string;
}

/**
 * Symbol key for storing query metadata on class.
 */
export const QUERIES_KEY = Symbol('loom:crud:queries');

/**
 * Symbol key for storing method-to-query mapping.
 */
export const QUERY_METHODS_KEY = Symbol('loom:crud:query-methods');

/**
 * @loom.crud.query decorator
 *
 * Marks a method as a custom query that will be executed against the ORM
 * at generation time, with the SQL captured and compacted to Kysely.
 *
 * The Prisma client (or other ORM) comes from the ring's refinement
 * (@loom.refine.withPrisma).
 *
 * @param queryFn - A lambda that takes the ORM client and returns a query
 *
 * @example
 * ```typescript
 * @spiral(MediaSpiral)
 * class MediaQueries {
 *   @loom.crud.query((prisma) =>
 *     prisma.media.findMany({
 *       where: { contentHash: { startsWith: 'Qm' } },
 *       take: 100
 *     })
 *   )
 *   findRecentIPFSMedia(): Promise<Media[]> {}
 * }
 * ```
 */
export function query<TClient, TResult>(queryFn: QueryLambda<TClient, TResult>): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const methodName = String(propertyKey);

    // Create query metadata
    const queryMeta: QueryMetadata = {
      type: 'query',
      queryFn: queryFn as QueryLambda,
      methodName,
      captureAtWeave: true
    };

    // Store on the class for collection
    const classQueries: QueryMetadata[] = Reflect.getMetadata(QUERIES_KEY, target) || [];
    Reflect.defineMetadata(QUERIES_KEY, [...classQueries, queryMeta], target);

    // Store method name to metadata mapping
    const methodMap: Map<string, QueryMetadata> =
      Reflect.getMetadata(QUERY_METHODS_KEY, target) || new Map();
    methodMap.set(methodName, queryMeta);
    Reflect.defineMetadata(QUERY_METHODS_KEY, methodMap, target);

    // Also attach to method for retrieval
    const existingMetadata = Reflect.getMetadata('loom:crud', descriptor.value!) || {};
    Reflect.defineMetadata(
      'loom:crud',
      { ...existingMetadata, query: queryMeta },
      descriptor.value!
    );

    // Store the queryFn directly on the method for runtime access
    // This is used by the midstage executor
    (descriptor.value as any).__queryFn = queryFn;
    (descriptor.value as any).__queryMeta = queryMeta;

    return descriptor;
  };
}

/**
 * Get all queries defined on a class.
 */
export function getClassQueries(target: unknown): QueryMetadata[] {
  if (!target || typeof target !== 'function') return [];
  return Reflect.getMetadata(QUERIES_KEY, target.prototype) || [];
}

/**
 * Get a specific query by method name.
 */
export function getQueryByMethodName(
  target: unknown,
  methodName: string
): QueryMetadata | undefined {
  if (!target || typeof target !== 'function') return undefined;
  const methodMap = Reflect.getMetadata(QUERY_METHODS_KEY, target.prototype);
  return methodMap?.get(methodName);
}

/**
 * Collect queries from a loom module.
 *
 * This is called during dressing to collect all @loom.crud.query
 * decorators from exported classes.
 */
export function collectQueriesFromModule(
  module: Record<string, unknown>
): Array<QueryMetadata & { className?: string }> {
  const queries: Array<QueryMetadata & { className?: string }> = [];

  for (const [exportName, exported] of Object.entries(module)) {
    // Skip non-class exports
    if (typeof exported !== 'function') continue;

    // Check if it's a class with queries
    const classQueries = getClassQueries(exported);
    if (classQueries.length > 0) {
      queries.push(
        ...classQueries.map((q) => ({
          ...q,
          className: exportName
        }))
      );
    }
  }

  return queries;
}
