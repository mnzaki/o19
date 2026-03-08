/**
 * Language Types 🌾
 *
 * Foundation types for the new Language Definition architecture.
 *
 * Provides generic type infrastructure for language-specific:
 * - Type definitions (LanguageType)
 * - Parameters (LanguageParam)
 * - Methods (LanguageMethod)
 * - Type factories (TypeFactory)
 *
 * @module machinery/reed/language-types
 */

import { Name, type NamingCase } from '../../stringing.js';
import type { MethodParam } from '../../heddles/method-collector.js';
import type { CoreRing, ExternalLayer, Spiraler, SpiralRing } from '../../../warp/index.js';

// ============================================================================
// Naming Conventions
// ============================================================================

export type CoreConvention =
  | 'function'
  | 'type'
  | 'variable'
  | 'const'
  | 'module'
  | 'field'
  | 'method'
  | 'parameter'
  | 'generic';

export type NamingConventions = {
  [K in CoreConvention]: NamingCase | null;
} & Record<string, NamingCase | null>;

// ============================================================================
// Language Identity
// ============================================================================

/* NOTE: the unused type parameters are so that LanguageDeclarationInput can
 * properly pass types through so that type inference works correctly for the
 * fields in codeGen.rendering
 */
export interface LanguageIdentity {
  /** Language name (e.g., 'typescript', 'rust', 'kotlin') */
  name: string;
  /** Parent language to inherit from (e.g., 'c_family') */
  extends?: string;
  /** File extensions associated with this language */
  extensions: string[];

  conventions: {
    /** Naming conventions for the language */
    naming: NamingConventions;
  };
}

/**
 * Default naming conventions.
 * Merged with user-provided conventions to fill in missing values.
 */
export const DEFAULT_NAMING_CONVENTIONS: Required<NamingConventions> = {
  function: 'snake_case',
  type: 'PascalCase',
  variable: 'snake_case',
  const: 'SCREAMING_SNAKE',
  module: 'snake_case',
  field: 'snake_case',
  method: 'snake_case',
  parameter: 'snake_case',
  generic: 'PascalCase'
};

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
export class LanguageThing<T extends LanguageType = LanguageType> {
  /** Reference to language definition */
  protected _lang?: LanguageDefinition<T>;
  protected _name: Name;

  constructor(name: string) {
    this._name = new Name(name);
  }

  set name(nameOrString: Name | string) {
    if (typeof nameOrString === 'string') {
      this._name = new Name(nameOrString);
    } else {
      this._name = nameOrString;
    }
  }

  get name(): Name {
    return this._name;
  }

  set lang(lang: LanguageDefinition<T>) {
    this._lang = lang;
  }

  get lang() {
    if (!this._lang) {
      throw new Error('No language set for this thing!');
    }
    return this._lang;
  }

  asContextWith(extra: Record<string, unknown>) {
    const context = { ...extra };
    Object.entries(Object.getOwnPropertyDescriptors(this)).forEach(([key, descriptor]) => {
      if (descriptor.get) {
        context[key] = descriptor.get.bind(this);
      }
    });

    return context;
  }
}

export class LanguageType extends LanguageThing {
  constructor(
    /** The language type name (e.g., 'String', 'i64', 'Vec<T>') */
    name: string,
    /** Stub value */
    private _stub: string | ((...innerTypes: LanguageType[]) => string),
    /** Whether this is a primitive type */
    readonly isPrimitive: boolean = false,
    /** Inner types that this type wraps */
    readonly innerTypes: LanguageType[] = [],
    /** Whether this is an entity/complex type */
    readonly isEntity: boolean = false
  ) {
    super(name);
  }

  get stub() {
    if (typeof this._stub === 'function') {
      return this._stub(...this.innerTypes);
    }
    return this._stub;
  }

  /**
   * String representation for debugging.
   */
  toString(): string {
    return this.name.toString();
  }
}

export class LanguageValue<T extends LanguageType = LanguageType> extends LanguageThing<T> {
  constructor(
    name: string,
    protected _type: LanguageType | (() => LanguageType)
  ) {
    super(name);
  }

  get type() {
    if (typeof this._type === 'function') {
      return this._type();
    } else {
      return this._type;
    }
  }

  set lang(lang: LanguageDefinition<T>) {
    super.lang = lang;
    this.type.lang = lang as unknown as LanguageDefinition<LanguageType>;
  }
}

// ============================================================================
// Parameter Types
// ============================================================================

/**
 * Language-specific parameter extends base with:
 * - langType: The language-specific type name
 * - formattedName: Name formatted for language conventions
 */
export interface LanguageParam extends MethodParam {
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
export interface TypeFactory<T extends LanguageType = LanguageType> {
  // Primitive types
  readonly boolean: T;
  readonly string: T;
  readonly number: T;
  readonly signed: T | null;
  readonly unsigned: T | null;
  readonly void: T;

  // Class type factory
  property: ((name: string, type: T) => T) | null;
  class: ((name: string, propertyMap: Record<string, T>) => T) | null;

  // Generic type factories
  array(itemType: T): T;
  optional: ((innerType: T) => T) | null;
  promise: ((innerType: T) => T) | null;
  result: ((okType: T, errType: T) => T) | null;
  object(...innerProperties: T[]): T;
  //function(params: T[], returnType: T): T;

  /**
   * Map a TypeScript type to this language's type.
   *
   * @param tsType - The TypeScript type name
   * @param isCollection - Whether this is an array/collection
   * @returns Language-specific type definition
   */
  fromTsType(tsType: string, isCollection?: boolean): T;
}

// ============================================================================
// Language WARP Configuration
// ============================================================================

/**
 * WARP integration configuration for a language.
 */
export interface LanguageWarpConfig {
  /** ExternalLayer subclass for this language */
  externalLayerClass: new () => ExternalLayer;

  /**
   * Field decorator functions (e.g., { Mutex, Option, i64 }).
   * Supports both legacy and TC39 decorator signatures.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldDecorators: Record<string, any>;

  /** Class decorator function (e.g., Struct) - can be direct or factory */
  classDecorator: ClassDecorator | ((options?: any) => ClassDecorator);

  /** Core ring configuration */
  core: {
    /** The CoreRing subclass (e.g., RustCore) */
    coreClass: new (...args: any[]) => CoreRing<any, any, any>;
    /** Factory to create core instance */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createCore: (layer?: any) => CoreRing<any, any, any>;
  };

  /**
   * Spiraler classes for type-safe navigation.
   * Key is target ring name (e.g., 'android', 'desktop', 'typescript').
   */
  spiralers: Record<string, new (innerRing: SpiralRing) => Spiraler>;

  /** Expose base factory at loom.spiral.{language} for "start from nothing" */
  exposeBaseFactory?: boolean;
}

// ============================================================================
// Language Definition (Generic)
// ============================================================================

/**
 * Complete language definition with full type safety.
 *
 * Languages self-register by calling declareLanguage() at module load time.
 * This enables dynamic language discovery without central configuration.
 *
 * @template P Parameter type extending LanguageParam
 * @template T Type definition extending LanguageType
 */
export interface LanguageDefinition<
  T extends LanguageType = LanguageType
> extends LanguageIdentity {
  /** Type factory for generating language-specific types */
  types: TypeFactory<T>;

  /**
   * WARP integration configuration.
   * Optional for code-generation-only languages.
   */
  warp?: LanguageWarpConfig;
}
