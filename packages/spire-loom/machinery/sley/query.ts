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

import type { CrudOperation } from '../../warp/crud.js';
import type { LanguageDefinitionImperative } from '../reed/language/imperative.js';
import type {
  DivinerSet,
  InstantiatedDiviner,
  PostrequisiteAccumulator
} from '../reed/postrequisites.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Query API interface - chainable filters and terminal operations.
 */
export interface QueryAPI<T extends Queryable<T>> {
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

  /**
   * Add a language for enhancement.
   * First language becomes primary (item.lang), others accessible as item.rs, item.ts, etc.
   */
  addLang(lang: LanguageDefinitionImperative): void;

  /**
   * Set a single language (convenience method).
   * Clears any previously added languages.
   */
  setLang(lang: LanguageDefinitionImperative): void;

  /** Get the primary language */
  get primaryLang(): LanguageDefinitionImperative | undefined;

  /** Get all configured languages */
  get languages(): LanguageDefinitionImperative[];

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

// ============================================================================
// Implementation
// ============================================================================

interface Queryable<T extends any> {
  lang: LanguageDefinitionImperative;
  tags?: string[];
  crudOperation?: string;
  managementName?: string;
  cloneWithLang(lang: LanguageDefinitionImperative): T;
}

/**
 * BoundQuery with lazy evaluation.
 *
 * Filters are composed into a pipeline that's only evaluated when
 * a terminal operation is called. Results are cached for repeated access.
 *
 * Supports multiple languages - the first language is the primary language,
 * additional languages are accessible via properties (rs, ts, kt, etc.)
 */
export class BoundQuery<T extends Queryable<T>> {
  readonly source: T[];
  private filters: Array<(m: T) => boolean>;
  private cachedResult: T[] | undefined;

  /** Multiple languages - first is primary, others accessible as properties */
  private _langs: LanguageDefinitionImperative[] = [];

  /** Diviner set for this query (type-specific) */
  readonly diviners: DivinerSet;

  /** Accumulators by diviner name */
  readonly accumulators: Map<string, PostrequisiteAccumulator> = new Map();

  /** Context name for template access */
  readonly contextName: string;

  constructor(
    source: T[],
    filters: Array<(m: T) => boolean> = [],
    contextName: string = 'ctx',
    diviners: DivinerSet = {}
  ) {
    this.source = source;
    this.filters = filters;
    this.contextName = contextName;
    this.diviners = diviners;
  }

  transform(transform: (m: T) => T): BoundQuery<T> {
    return new BoundQuery(this.source.map(transform), this.filters);
  }

  /**
   * Add a language for enhancement.
   * First language becomes primary (item.lang), others accessible as item.rs, item.ts, etc.
   * 
   * Also initializes diviner accumulators with the new language.
   */
  addLang(lang: LanguageDefinitionImperative): void {
    if (this._langs.includes(lang)) return;
    this._langs.push(lang);
    
    // Phase 1: Initialize diviner accumulators with the new language
    // This makes accumulators available immediately without waiting for evaluation
    for (const [name, diviner] of Object.entries(this.diviners)) {
      if (!this.accumulators.has(name)) {
        diviner.initAccumulator(this, lang);
        this.accumulators.set(name, diviner.accumulator);
      }
    }
  }

  /**
   * Set a single language (convenience method).
   * Clears any previously added languages.
   */
  setLang(lang: LanguageDefinitionImperative): void {
    const langIdx = this._langs.findIndex((l) => l === lang);
    if (langIdx !== -1) {
      this._langs.splice(langIdx, 1);
    }
    this._langs.unshift(lang);
    this.cachedResult = undefined;
    this.accumulators.clear();
  }

  /** Get the primary language */
  get primaryLang(): LanguageDefinitionImperative | undefined {
    return this._langs[0];
  }

  /** Get all configured languages */
  get languages(): LanguageDefinitionImperative[] {
    return [...this._langs];
  }

  /**
   * Evaluate the query pipeline and return filtered results.
   * Cached for repeated access.
   *
   * Sets the primary language on each item, and adds property accessors
   * for additional languages (rs, ts, kt, etc.)
   */
  private evaluate(): T[] {
    if (this._langs.length === 0) throw new Error('no language specified');

    if (this.cachedResult === undefined) {
      this.cachedResult = this.filters.reduce((item, filter) => item.filter(filter), this.source);

      const primaryLang = this._langs[0];

      // Get language property name from extension (rust -> rs, typescript -> ts, etc.)
      const getLangPropName = (lang: LanguageDefinitionImperative): string => {
        const ext = lang.extensions?.[0]?.replace('.mejs', '').replace('.', '');
        if (ext) {
          return ext;
        }
        // Fallback to language name
        return lang.name;
      };

      // Phase 2: Apply property wrappers (if not already done)
      // Phase 1 (initAccumulator) already happened in addLang()
      for (const [name, diviner] of Object.entries(this.diviners)) {
        diviner.applyWrappers(this.cachedResult!);
      }

      this.cachedResult.forEach((item) => {
        // Set primary language
        item.lang = primaryLang;

        // Attach diviner accumulators to each item
        for (const [name, acc] of this.accumulators) {
          (item as any)[name] = acc;
        }

        // Add property accessors for additional languages
        for (const lang of this._langs) {
          const propName = getLangPropName(lang);
          Object.defineProperty(item, propName, {
            get: () => {
              return item.cloneWithLang(lang);
            },
            enumerable: true,
            configurable: true
          });
        }
      });
    }
    return this.cachedResult;
  }

  /**
   * Create a new BoundQuery with an additional filter.
   * Immutable - doesn't modify the current query.
   */
  private withFilter(filter: (m: T) => boolean): BoundQuery<T> {
    const newQuery = new BoundQuery(
      this.source,
      [...this.filters, filter],
      this.contextName,
      this.diviners
    );
    // Propagate languages to the new query
    for (const lang of this._langs) {
      newQuery.addLang(lang);
    }
    // Share accumulators map
    (newQuery as any).accumulators = this.accumulators;
    return newQuery;
  }

  /**
   * Get imports accumulator for template access.
   * Available as {{ methods.imports }} in templates.
   */
  get imports(): PostrequisiteAccumulator | undefined {
    this.evaluate();
    return this.accumulators.get('imports');
  }

  // ========================================================================
  // Chainable Filters
  // ========================================================================

  tag(tag: string): BoundQuery<T> {
    return this.withFilter((m) => m.tags?.includes(tag) ?? false);
  }

  tags(...tags: string[]): BoundQuery<T> {
    return this.withFilter((m) => tags.every((tag) => m.tags?.includes(tag) ?? false));
  }

  crud(...ops: CrudOperation[]): BoundQuery<T> {
    return this.withFilter(
      (m) => m.crudOperation !== undefined && ops.includes(m.crudOperation as CrudOperation)
    );
  }

  management(name: string): BoundQuery<T> {
    return this.withFilter((m) => m.managementName === name);
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

  // =======================================================================
  // Lazy Iterator Methods (APP-004)
  // =======================================================================

  /**
   * Lazy map - returns Iterable instead of array.
   * Does not materialize results until iterated.
   *
   * @example
   * ```typescript
   * const names = methods.mapIter(m => m.name.pascalCase);
   * for (const name of names) { ... } // Lazy iteration
   * ```
   */
  mapIter<U>(fn: (item: T) => U): Iterable<U> {
    return function* (self) {
      for (const item of self) {
        yield fn(item);
      }
    }(this);
  }

  /**
   * Lazy filter - returns Iterable instead of new BoundQuery.
   * Does not materialize results until iterated.
   *
   * @example
   * ```typescript
   * const creates = methods.filterIter(m => m.crudOperation === 'create');
   * for (const method of creates) { ... } // Lazy iteration
   * ```
   */
  filterIter(predicate: (item: T) => boolean): Iterable<T> {
    return function* (self) {
      for (const item of self) {
        if (predicate(item)) {
          yield item;
        }
      }
    }(this);
  }

  /**
   * Entries with index - lazy generator of [index, item] pairs.
   *
   * @example
   * ```typescript
   * for (const [i, method] of methods.entries()) {
   *   console.log(`${i}: ${method.name}`);
   * }
   * ```
   */
  *entries(): Generator<[number, T]> {
    let i = 0;
    for (const item of this) {
      yield [i++, item];
    }
  }

  /**
   * Take first n items lazily.
   *
   * @example
   * ```typescript
   * const first5 = methods.takeIter(5);
   * ```
   */
  takeIter(n: number): Iterable<T> {
    return function* (self) {
      let i = 0;
      for (const item of self) {
        if (i >= n) break;
        yield item;
        i++;
      }
    }(this);
  }

  /**
   * Skip first n items lazily.
   *
   * @example
   * ```typescript
   * const rest = methods.skipIter(10);
   * ```
   */
  skipIter(n: number): Iterable<T> {
    return function* (self) {
      let i = 0;
      for (const item of self) {
        if (i < n) {
          i++;
          continue;
        }
        yield item;
      }
    }(this);
  }

  /**
   * Convert to array - materializes the query results.
   * Same as `.all` but explicit about materialization.
   */
  toArray(): T[] {
    return this.evaluate();
  }

  // =======================================================================
  // Iterable Protocol
  // =======================================================================

  /**
   * Make BoundQuery iterable - can use in for...of loops!
   *
   * @example
   * ```typescript
   * for (const method of context.query?.methods) {
   *   console.log(method.name);
   * }
   * ```
   */
  *[Symbol.iterator](): Iterator<T> {
    yield* this.evaluate();
  }
}

// ============================================================================
// Factory
// ============================================================================

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
export function createQueryAPI<T extends Queryable<T>>(
  stuff: T[],
  contextName: string = 'ctx',
  diviners: DivinerSet = {}
) {
  return new BoundQuery(stuff, [], contextName, diviners);
}
