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

import type { MethodLink } from './imperative.js';

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
