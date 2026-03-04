/**
 * Language Types 🌾
 *
 * Foundation types for the new Language Definition architecture.
 *
 * Provides generic type infrastructure for language-specific:
 * - Type definitions (LanguageType)
 * - Parameters (BaseParam, LanguageParam)
 * - Methods (RawMethod, LanguageMethod)
 * - Type factories (TypeFactory)
 *
 * @module machinery/reed/language-types
 */

import type { MethodLink } from '../../warp/crud.js';

// ============================================================================
// Language Type Definition
// ============================================================================

/**
 * Rich type definition for language code generation.
 *
 * Instances carry all metadata needed for templates:
 * - name: The language type name (e.g., 'String', 'i64', 'Vec<T>')
 * - stubReturn: Default value for mock implementations
 * - isPrimitive: Whether this is a primitive type
 * - isEntity: Whether this is a user-defined entity type
 */
export class LanguageType {
  constructor(
    /** The language type name (e.g., 'String', 'i64', 'Vec<T>') */
    readonly name: string,
    /** Default value for stub/mock implementations */
    readonly stubReturn: string,
    /** Whether this is a primitive type */
    readonly isPrimitive: boolean = false,
    /** Whether this is an entity/complex type */
    readonly isEntity: boolean = false
  ) {}

  /**
   * String representation for debugging.
   */
  toString(): string {
    return this.name;
  }
}

// ============================================================================
// Parameter Types
// ============================================================================

/**
 * Base parameter interface — minimal contract for all params.
 *
 * This is what comes from Management method metadata.
 */
export interface BaseParam {
  /** Parameter name (as declared in Management) */
  name: string;
  /** TypeScript type */
  type: string;
  /** Whether parameter is optional */
  optional?: boolean;
}

/**
 * Language-specific parameter extends base with:
 * - langType: The language-specific type name
 * - formattedName: Name formatted for language conventions
 */
export interface LanguageParam extends BaseParam {
  /** Language-specific type (rsType, tsType, ktType, etc.) */
  langType: string;
  /** Name formatted for language conventions (snake_case, camelCase, etc.) */
  formattedName: string;
}

// ============================================================================
// Method Types
// ============================================================================

/**
 * Raw method — core data class, no language enhancement.
 *
 * This is what comes from Management metadata collection.
 * Language enhancement happens separately via the enhancement system.
 *
 * CRUD classification is stored in tags (e.g., 'crud:create'), not as
 * a direct property. Use getCrudNameFromTags() to derive crudName.
 *
 * @example
 * ```typescript
 * const raw = new RawMethod(
 *   'bookmark_addBookmark',
 *   'addBookmark',
 *   'addBookmark',
 *   'void',
 *   false,
 *   [{ name: 'url', type: 'string' }],
 *   'Add a bookmark',
 *   undefined,
 *   ['crud:create'],
 *   'BookmarkMgmt'
 * );
 * ```
 */
export class RawMethod {
  constructor(
    /** Bind-point name with management prefix (e.g., 'bookmark_add_bookmark') */
    public readonly name: string,
    /** Original implementation name (e.g., 'add_bookmark') */
    public readonly implName: string,
    /** JavaScript/TypeScript camelCase name (from WARP) */
    public readonly jsName: string | undefined,
    /** TypeScript return type */
    public readonly returnType: string,
    /** Whether return is a collection */
    public readonly isCollection: boolean,
    /** Method parameters */
    public readonly params: BaseParam[],
    /** JSDoc description */
    public readonly description: string | undefined,
    /** Link metadata for routing to struct fields */
    public readonly link: MethodLink | undefined,
    /** Tags from decorators (e.g., 'crud:create', 'auth:required') */
    public readonly tags: string[] | undefined,
    /** Management class this method belongs to */
    public readonly managementName: string | undefined,
    /** CRUD method name (added by CRUD pipeline, derived from tags) */
    public crudName?: string
  ) {}

  /**
   * Check if this method has a specific tag.
   */
  hasTag(tag: string): boolean {
    return this.tags?.includes(tag) ?? false;
  }

  /**
   * Get CRUD operation from tags (e.g., 'create', 'read').
   */
  getCrudOperation(): string | undefined {
    return this.tags?.find((t) => t.startsWith('crud:'))?.replace('crud:', '');
  }
}

/**
 * Language-specific method extends raw with:
 * - Naming variants (camelName, pascalName, snakeName)
 * - Type definition (returnTypeDef)
 * - Stub return value
 * - Template helpers (params, signature)
 *
 * This is the internal representation after language enhancement.
 * For templates, use LanguageView (from enhancement.ts) which provides
 * idiomatic naming via conventions.
 */
export interface LanguageMethod<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> extends RawMethod {
  /** camelCase name */
  camelName: string;
  /** PascalCase name */
  pascalName: string;
  /** snake_case name */
  snakeName: string;

  /** Return type definition with full metadata */
  returnTypeDef: T;
  /** Stub return value for mock implementations */
  stubReturn: string;
}

// ============================================================================
// Type Factory Interface
// ============================================================================

/**
 * Type factory for generating language-specific types.
 *
 * Each language provides an implementation that knows:
 * - Primitive types (boolean, string, number, void)
 * - Generic factories (array, optional, promise, result)
 * - Entity types
 * - Mapping from TypeScript types
 */
export interface TypeFactory<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> {
  // Primitive types
  readonly boolean: T;
  readonly string: T;
  readonly number: T;
  readonly void: T;

  // Generic type factories
  array(itemType: T): T;
  optional(innerType: T): T;
  promise(innerType: T): T;
  result(okType: T, errType?: T | string): T;

  // Entity type factory
  entity(name: string): T;

  /**
   * Map a TypeScript type to this language's type.
   *
   * @param tsType - The TypeScript type name
   * @param isCollection - Whether this is an array/collection
   * @returns Language-specific type definition
   */
  fromTsType(tsType: string, isCollection: boolean): T;
}

// ============================================================================
// Re-exports
// ============================================================================

export type { MethodLink } from '../../warp/crud.js';
