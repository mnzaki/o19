/**
 * Template Helpers 🧵
 *
 * Classes for EJS template rendering using the `.toString()` abuse pattern.
 *
 * These classes are designed to be used in EJS templates like:
 * ```ejs
 * <%- method.params.list %>      -> "id: i64, name: String"
 * <%- method.params.names %>     -> "id, name"
 * <%- method.params.invocation %> -> "id, name" or "{ id, name }"
 * <%- method.signature %>        -> "fn foo(id: i64) -> ReturnType"
 * ```
 *
 * EJS calls `toString()` when rendering `<%= obj %>` or `<%- obj %>`,
 * so we abuse this by returning objects whose `toString()` renders the template.
 *
 * @module machinery/bobbin/template-helpers
 */

import type {
  LanguageParam,
  LanguageMethod,
  LanguageType,
} from '../reed/language/types.js';

// ============================================================================
// ParamCollection — Container for parameter renderers
// ============================================================================

/**
 * Collection of parameter template helpers.
 *
 * Proxies array access to provide full array compatibility while adding
 * template rendering helpers via getter properties.
 *
 * Accessed in templates as `method.params`:
 * ```ejs
 * <%- method.params.list %>           -> "id: i64, name: String"
 * <%- method.params.names %>          -> "id, name"
 * <%- method.params.invocation %>     -> "id, name" or "{ id, name }"
 * <%= method.params[0].name %>        -> bracket access works
 * <% method.params.forEach(...) %>    -> array methods work
 * ```
 */
export class ParamCollection<P extends LanguageParam = LanguageParam> {
  private params: P[];
  private config: ParamRenderConfig;

  constructor(params: P[], config: ParamRenderConfig) {
    // Use a Proxy to handle bracket access
    const self = Object.create(ParamCollection.prototype);
    self.params = params;
    self.config = config;
    
    return new Proxy(self, {
      get(target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.params[parseInt(prop, 10)];
        }
        return (target as any)[prop];
      },
      has(target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return parseInt(prop, 10) < target.params.length;
        }
        return prop in target;
      },
      ownKeys(target) {
        return [...target.params.keys().map(String), ...Object.keys(target)];
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          const idx = parseInt(prop, 10);
          if (idx < target.params.length) {
            return { value: target.params[idx], writable: false, enumerable: true, configurable: true };
          }
        }
        return Object.getOwnPropertyDescriptor(target, prop);
      }
    }) as ParamCollection<P>;
  }

  // Array-like interface
  get length(): number { return this.params.length; }
  [Symbol.iterator](): Iterator<P> { return this.params[Symbol.iterator](); }

  // Array methods
  map<T>(fn: (param: P, index: number, array: P[]) => T): T[] { return this.params.map(fn); }
  filter(fn: (param: P, index: number, array: P[]) => boolean): P[] { return this.params.filter(fn); }
  forEach(fn: (param: P, index: number, array: P[]) => void): void { return this.params.forEach(fn); }
  some(fn: (param: P, index: number, array: P[]) => boolean): boolean { return this.params.some(fn); }
  every(fn: (param: P, index: number, array: P[]) => boolean): boolean { return this.params.every(fn); }
  find(fn: (param: P, index: number, array: P[]) => boolean): P | undefined { return this.params.find(fn); }
  reduce<T>(fn: (acc: T, param: P, index: number, array: P[]) => T, initial: T): T { return this.params.reduce(fn, initial); }
  join(separator: string): string { return this.params.join(separator); }
  at(index: number): P | undefined { return this.params.at(index); }

  /**
   * Render parameters with types: `id: i64, name: String`
   *
   * Usage: `<%- method.params.list %>`
   */
  get list(): ParamListRenderer<P> {
    return new ParamListRenderer(this.params, this.config);
  }

  /**
   * Render parameter names only: `id, name`
   *
   * Usage: `<%- method.params.names %>`
   */
  get names(): ParamNamesRenderer<P> {
    return new ParamNamesRenderer(this.params);
  }

  /**
   * Render parameter invocation style:
   * - Single param: `id`
   * - Multi param: `{ id, name }`
   *
   * Usage: `<%- method.params.invocation %>`
   */
  get invocation(): ParamInvocationRenderer<P> {
    return new ParamInvocationRenderer(this.params);
  }

  /**
   * Render parameters with types and optionality: `id?: i64, name?: String`
   *
   * Usage: `<%- method.params.listWithOptionality %>`
   */
  get listWithOptionality(): ParamListWithOptionalRenderer<P> {
    return new ParamListWithOptionalRenderer(this.params, this.config);
  }
}

// ============================================================================
// Param Render Config
// ============================================================================

/**
 * Configuration for parameter rendering.
 */
export interface ParamRenderConfig {
  /** Function to format parameter names */
  formatParamName: (name: string) => string;
  /** The key on params that holds the language-specific type */
  typeKey: string;
}

// ============================================================================
// Individual Param Renderers
// ============================================================================

/**
 * Renders parameter list with types: `id: i64, name: String`
 *
 * EJS calls `toString()` when rendering.
 */
export class ParamListRenderer<P extends LanguageParam> {
  constructor(
    private params: P[],
    private config: ParamRenderConfig
  ) {}

  toString(): string {
    return this.params
      .map((p) => `${p.formattedName}: ${p.langType}`)
      .join(', ');
  }
}

/**
 * Renders parameter list with optionality: `id?: i64, name?: String`
 *
 * EJS calls `toString()` when rendering.
 */
export class ParamListWithOptionalRenderer<P extends LanguageParam> {
  constructor(
    private params: P[],
    private config: ParamRenderConfig
  ) {}

  toString(): string {
    return this.params
      .map((p) => `${p.formattedName}${p.optional ? '?' : ''}: ${p.langType}`)
      .join(', ');
  }
}

/**
 * Renders parameter names only: `id, name`
 *
 * EJS calls `toString()` when rendering.
 */
export class ParamNamesRenderer<P extends LanguageParam> {
  constructor(private params: P[]) {}

  toString(): string {
    return this.params.map((p) => p.formattedName).join(', ');
  }
}

/**
 * Renders parameter invocation style.
 *
 * - Single param: `id`
 * - Multi param: `{ id, name }` (object destructuring)
 *
 * EJS calls `toString()` when rendering.
 */
export class ParamInvocationRenderer<P extends LanguageParam> {
  constructor(private params: P[]) {}

  toString(): string {
    const names = this.params.map((p) => p.formattedName).join(', ');
    // Multi-param uses object destructuring style
    return this.params.length > 1 ? `{ ${names} }` : names;
  }
}

// ============================================================================
// Signature Helper
// ============================================================================

/**
 * Renders function signatures.
 *
 * Usage: `<%- method.signature %>`
 */
export class SignatureHelper<
  M extends LanguageMethod = LanguageMethod
> {
  constructor(
    private method: M,
    private config: SignatureRenderConfig<M>
  ) {}

  /**
   * Render the function signature.
   *
   * EJS calls `toString()` when rendering.
   */
  toString(): string {
    return this.config.functionSignature(this.method);
  }

  /**
   * Render the async function signature (if supported).
   *
   * Falls back to regular signature if async not configured.
   */
  get async(): AsyncSignatureRenderer<M> {
    return new AsyncSignatureRenderer(this.method, this.config);
  }
}

/**
 * Renders async function signatures.
 *
 * Usage: `<%- method.signature.async %>`
 */
export class AsyncSignatureRenderer<M extends LanguageMethod> {
  constructor(
    private method: M,
    private config: SignatureRenderConfig<M>
  ) {}

  toString(): string {
    if (this.config.asyncFunctionSignature) {
      return this.config.asyncFunctionSignature(this.method);
    }
    // Fall back to regular signature
    return this.config.functionSignature(this.method);
  }
}

/**
 * Configuration for signature rendering.
 */
export interface SignatureRenderConfig<
  M extends LanguageMethod = LanguageMethod
> {
  /** Generate function signature */
  functionSignature: (method: M) => string;
  /** Generate async function signature (optional) */
  asyncFunctionSignature?: (method: M) => string;
}

// ============================================================================
// CRUD Name Renderer
// ============================================================================

/**
 * Renders CRUD method names with consistent formatting.
 *
 * This is a thin wrapper around the crudName string to provide
 * consistent template access.
 */
export class CrudNameRenderer {
  constructor(private crudName: string) {}

  toString(): string {
    return this.crudName;
  }

  /**
   * Check if this is a create operation.
   */
  get isCreate(): boolean {
    return this.crudName === 'create';
  }

  /**
   * Check if this is a read operation.
   */
  get isRead(): boolean {
    return this.crudName === 'getById' || this.crudName.startsWith('get');
  }

  /**
   * Check if this is a list operation.
   */
  get isList(): boolean {
    return this.crudName === 'list';
  }

  /**
   * Check if this is an update operation.
   */
  get isUpdate(): boolean {
    return this.crudName === 'update';
  }

  /**
   * Check if this is a delete operation.
   */
  get isDelete(): boolean {
    return this.crudName === 'delete';
  }
}

// ============================================================================
// Stub Return Renderer
// ============================================================================

/**
 * Renders stub return values.
 *
 * This is a thin wrapper around the stubReturn string.
 */
export class StubReturnRenderer {
  constructor(private stubReturn: string) {}

  toString(): string {
    return this.stubReturn;
  }

  /**
   * Get the raw stub return value.
   */
  get value(): string {
    return this.stubReturn;
  }
}

// ============================================================================
// Type Definition Renderer
// ============================================================================

/**
 * Renders type definitions.
 *
 * Provides access to type properties in templates.
 */
export class TypeDefRenderer<T extends LanguageType = LanguageType> {
  constructor(private typeDef: T) {}

  toString(): string {
    return this.typeDef.name;
  }

  /**
   * Get the type name.
   */
  get name(): string {
    return this.typeDef.name;
  }

  /**
   * Get the stub return value.
   */
  get stubReturn(): StubReturnRenderer {
    return new StubReturnRenderer(this.typeDef.stubReturn);
  }

  /**
   * Check if this is a primitive type.
   */
  get isPrimitive(): boolean {
    return this.typeDef.isPrimitive;
  }

  /**
   * Check if this is an entity type.
   */
  get isEntity(): boolean {
    return this.typeDef.isEntity;
  }
}
