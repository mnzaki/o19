/**
 * Query Builder 🔍
 *
 * Chainable, composable queries over management methods.
 *
 * "Filter the warp to find the threads you need."
 *
 * Provides a fluent API for filtering and grouping methods:
 * ```typescript
 * context.query?.methods
 *   .crud('create')
 *   .tag('auth:required')
 *   .management('BookmarkMgmt')
 *   .all
 * ```
 *
 * Backward compatible with context.methods - both are available.
 */

import type { RawMethod } from '../bobbin/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * CRUD operations supported by the query builder.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * Query API interface - chainable filters and terminal operations.
 */
export interface QueryAPI<T extends { tags?: string[]; crudOperation?: string; managementName?: string }> {
  /** Filter by tag */
  tag(tag: string): BoundQuery<T>;
  
  /** Filter by multiple tags (AND logic) */
  tags(...tags: string[]): BoundQuery<T>;
  
  /** Filter by CRUD operation(s) */
  crud(...ops: CrudOperation[]): BoundQuery<T>;
  
  /** Filter by management name */
  management(name: string): BoundQuery<T>;
  
  /** Custom predicate filter */
  filter(predicate: (method: T) => boolean): BoundQuery<T>;
  
  /** Terminal: Group by management name */
  byManagement(): Map<string, T[]>;
  
  /** Terminal: Group by CRUD operation */
  byCrud(): Map<string, T[]>;
  
  /** Terminal: Get all matching methods */
  get all(): T[];
  
  /** Terminal: Get first matching method */
  get first(): T | undefined;
  
  /** Terminal: Get count of matching methods */
  get count(): number;
  
  /** Terminal: Check if any methods match */
  get hasAny(): boolean;
  
  /** Terminal: Pre-filtered getters */
  get creates(): BoundQuery<T>;
  get reads(): BoundQuery<T>;
  get updates(): BoundQuery<T>;
  get deletes(): BoundQuery<T>;
  get lists(): BoundQuery<T>;
  
  /** Iteration terminals */
  forEach(cb: (method: T) => void): void;
  map<U>(fn: (method: T) => U): U[];
  find(predicate: (method: T) => boolean): T | undefined;
  some(predicate: (method: T) => boolean): boolean;
  every(predicate: (method: T) => boolean): boolean;
}

/**
 * Bound query - immutable query state with lazy evaluation.
 */
export interface BoundQuery<T extends { tags?: string[]; crudOperation?: string; managementName?: string }> extends QueryAPI<T> {}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Internal implementation of BoundQuery with lazy evaluation.
 * 
 * Filters are composed into a pipeline that's only evaluated when
 * a terminal operation is called. Results are cached for repeated access.
 */
class BoundQueryImpl<T extends { tags?: string[]; crudOperation?: string; managementName?: string }> implements BoundQuery<T> {
  private source: T[];
  private filters: Array<(m: T) => boolean>;
  private cachedResult: T[] | undefined;

  constructor(source: T[], filters: Array<(m: T) => boolean> = []) {
    this.source = source;
    this.filters = filters;
  }

  /**
   * Evaluate the query pipeline and return filtered results.
   * Cached for repeated access.
   */
  private evaluate(): T[] {
    if (this.cachedResult === undefined) {
      this.cachedResult = this.filters.reduce(
        (methods, filter) => methods.filter(filter),
        this.source
      );
    }
    return this.cachedResult;
  }

  /**
   * Create a new BoundQuery with an additional filter.
   * Immutable - doesn't modify the current query.
   */
  private withFilter(filter: (m: T) => boolean): BoundQuery<T> {
    return new BoundQueryImpl(this.source, [...this.filters, filter]);
  }

  // ========================================================================
  // Chainable Filters
  // ========================================================================

  tag(tag: string): BoundQuery<T> {
    return this.withFilter(m => m.tags?.includes(tag) ?? false);
  }

  tags(...tags: string[]): BoundQuery<T> {
    return this.withFilter(m => tags.every(tag => m.tags?.includes(tag) ?? false));
  }

  crud(...ops: CrudOperation[]): BoundQuery<T> {
    return this.withFilter(m => m.crudOperation !== undefined && ops.includes(m.crudOperation as CrudOperation));
  }

  management(name: string): BoundQuery<T> {
    return this.withFilter(m => m.managementName === name);
  }

  filter(predicate: (method: T) => boolean): BoundQuery<T> {
    return this.withFilter(predicate);
  }

  // ========================================================================
  // Terminal: Grouping
  // ========================================================================

  byManagement(): Map<string, T[]> {
    const result = new Map<string, T[]>();
    for (const method of this.evaluate()) {
      const mgmtName = method.managementName || 'unknown';
      const list = result.get(mgmtName) || [];
      list.push(method);
      result.set(mgmtName, list);
    }
    return result;
  }

  byCrud(): Map<string, T[]> {
    const result = new Map<string, T[]>();
    for (const method of this.evaluate()) {
      const op = method.crudOperation || 'unknown';
      const list = result.get(op) || [];
      list.push(method);
      result.set(op, list);
    }
    return result;
  }

  // ========================================================================
  // Terminal: Getters
  // ========================================================================

  get all(): T[] {
    return this.evaluate();
  }

  get first(): T | undefined {
    return this.evaluate()[0];
  }

  get count(): number {
    return this.evaluate().length;
  }

  get hasAny(): boolean {
    return this.evaluate().length > 0;
  }

  // Pre-filtered CRUD queries
  get creates(): BoundQuery<T> {
    return this.crud('create');
  }

  get reads(): BoundQuery<T> {
    return this.crud('read');
  }

  get updates(): BoundQuery<T> {
    return this.crud('update');
  }

  get deletes(): BoundQuery<T> {
    return this.crud('delete');
  }

  get lists(): BoundQuery<T> {
    return this.crud('list');
  }

  // ========================================================================
  // Terminal: Iteration
  // ========================================================================

  forEach(cb: (method: T) => void): void {
    this.evaluate().forEach(cb);
  }

  map<U>(fn: (method: T) => U): U[] {
    return this.evaluate().map(fn);
  }

  find(predicate: (method: T) => boolean): T | undefined {
    return this.evaluate().find(predicate);
  }

  some(predicate: (method: T) => boolean): boolean {
    return this.evaluate().some(predicate);
  }

  every(predicate: (method: T) => boolean): boolean {
    return this.evaluate().every(predicate);
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Query API for a collection of methods.
 * Contains the primary query and pre-filtered CRUD entry points.
 */
export interface MethodQueryAPI<T extends { tags?: string[]; crudOperation?: string; managementName?: string }> {
  /** Primary query over all methods */
  methods: BoundQuery<T>;
  
  /** Pre-filtered: create methods */
  creates: BoundQuery<T>;
  
  /** Pre-filtered: read methods */
  reads: BoundQuery<T>;
  
  /** Pre-filtered: update methods */
  updates: BoundQuery<T>;
  
  /** Pre-filtered: delete methods */
  deletes: BoundQuery<T>;
  
  /** Pre-filtered: list methods */
  lists: BoundQuery<T>;
}

/**
 * Create a query API bound to a method collection.
 * 
 * Returns a POJO with:
 * - `methods`: Primary query over all methods
 * - `creates`, `reads`, etc.: Pre-filtered entry points
 * 
 * @example
 * ```typescript
 * context.query = createQueryAPI(rawMethods);
 * 
 * // Use primary query with chaining
 * const authCreates = context.query?.methods
 *   .crud('create')
 *   .tag('auth:required')
 *   .all;
 * 
 * // Use pre-filtered entry point
 * const bookmarkCreates = context.query?.creates
 *   .management('BookmarkMgmt')
 *   .all;
 * ```
 */
export function createQueryAPI<T extends { tags?: string[]; crudOperation?: string; managementName?: string }>(
  methods: T[]
): MethodQueryAPI<T> {
  const allQuery = new BoundQueryImpl(methods);
  
  return {
    methods: allQuery,
    creates: allQuery.crud('create'),
    reads: allQuery.crud('read'),
    updates: allQuery.crud('update'),
    deletes: allQuery.crud('delete'),
    lists: allQuery.crud('list'),
  };
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { BoundQueryImpl };
