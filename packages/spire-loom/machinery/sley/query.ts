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

// ============================================================================
// Types
// ============================================================================

/**
 * Query API interface - chainable filters and terminal operations.
 */
export interface QueryAPI<T extends Queryable> {
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

interface Queryable {
  lang: LanguageDefinitionImperative;
  tags?: string[];
  crudOperation?: string;
  managementName?: string;
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
export class BoundQuery<T extends Queryable> {
  private source: T[];
  private filters: Array<(m: T) => boolean>;
  private cachedResult: T[] | undefined;

  /** Multiple languages - first is primary, others accessible as properties */
  private _langs: LanguageDefinitionImperative[] = [];

  constructor(source: T[], filters: Array<(m: T) => boolean> = []) {
    this.source = source;
    this.filters = filters;
  }

  transform(transform: (m: T) => T): BoundQuery<T> {
    return new BoundQuery(this.source.map(transform), this.filters);
  }

  /**
   * Add a language for enhancement.
   * First language becomes primary (item.lang), others accessible as item.rs, item.ts, etc.
   */
  addLang(lang: LanguageDefinitionImperative): void {
    this._langs.push(lang);
    this.cachedResult = undefined;
  }

  /**
   * Set a single language (convenience method).
   * Clears any previously added languages.
   */
  setLang(lang: LanguageDefinitionImperative): void {
    this._langs = [lang];
    this.cachedResult = undefined;
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
      this.cachedResult = this.filters.reduce(
        (methods, filter) => methods.filter(filter),
        this.source
      );

      const primaryLang = this._langs[0];
      const additionalLangs = this._langs.slice(1);

      // Get language property name from extension (rust -> rs, typescript -> ts, etc.)
      const getLangPropName = (lang: LanguageDefinitionImperative): string => {
        const ext = lang.extensions?.[0]?.replace('.', '').replace('.mejs', '');
        if (ext) {
          // Handle special cases
          if (ext === 'rs') return 'rs';
          if (ext === 'ts') return 'ts';
          if (ext === 'kt') return 'kt';
          if (ext === 'swift') return 'swift';
          if (ext === 'py') return 'py';
          if (ext === 'go') return 'go';
          if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') return 'cpp';
          if (ext === 'java') return 'java';
          if (ext === 'cs') return 'cs';
        }
        // Fallback to language name
        return lang.name;
      };

      this.cachedResult.forEach((item) => {
        // Set primary language
        item.lang = primaryLang;

        // Add property accessors for additional languages
        for (const lang of additionalLangs) {
          const propName = getLangPropName(lang);
          Object.defineProperty(item, propName, {
            get: () => {
              // Clone the item with the different language
              const cloned = (
                item as unknown as {
                  cloneWithLang(lang: LanguageDefinitionImperative): typeof item;
                }
              ).cloneWithLang(lang);
              return cloned;
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
    return new BoundQuery(this.source, [...this.filters, filter]);
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
export function createQueryAPI<
  T extends {
    lang: LanguageDefinitionImperative;
    tags?: string[];
    crudOperation?: string;
    managementName?: string;
  }
>(stuff: T[]) {
  return new BoundQuery(stuff);
}
