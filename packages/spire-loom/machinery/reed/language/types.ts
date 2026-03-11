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
import type { LanguageDefinitionImperative } from './imperative.js';

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
  [K in CoreConvention]?: NamingCase;
} & Record<string, NamingCase>;

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
  protected _lang?: LanguageDefinitionImperative<T>;
  protected _name: Name;

  // Language accessor properties (populated by BoundQuery when multiple languages are added)
  /** Rust language variant */
  declare rs: typeof this;
  /** TypeScript language variant */
  declare ts: typeof this;
  /** Kotlin language variant */
  declare kt: typeof this;
  /** Swift language variant */
  declare swift: typeof this;
  /** Python language variant */
  declare py: typeof this;
  /** Go language variant */
  declare go: typeof this;
  /** C++ language variant */
  declare cpp: typeof this;
  /** Java language variant */
  declare java: typeof this;
  /** C# language variant */
  declare cs: typeof this;

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

  set lang(lang: LanguageDefinitionImperative<T>) {
    this._lang = lang;
  }

  get lang() {
    if (!this._lang) {
      throw new Error('No language set for this thing!');
    }
    return this._lang;
  }

  /**
   * Clone this thing with a different language.
   * Used by BoundQuery to create language variants (rs, ts, kt, etc.)
   */
  cloneWithLang(lang: LanguageDefinitionImperative<T>): typeof this {
    // Create new object with same prototype
    const clone = Object.create(Object.getPrototypeOf(this)) as typeof this;

    // Copy all own properties (subclasses may override copyOwnProperties to filter)
    this.copyOwnProperties(clone);

    // Set the new language (triggers enhancements)
    clone.lang = lang;

    return clone;
  }

  /**
   * Copy own properties to a clone. Subclasses can override to filter.
   * Must be public so LanguageMethod can call super.copyOwnProperties()
   */
  copyOwnProperties(clone: any): void {
    for (const key of Object.getOwnPropertyNames(this)) {
      const descriptor = Object.getOwnPropertyDescriptor(this, key);
      if (descriptor) {
        Object.defineProperty(clone, key, descriptor);
      }
    }
  }

  asContextWith(extra: Record<string, unknown>) {
    const context = { ...extra };
    const props = Object.getOwnPropertyDescriptors(this);
    let prototype = Object.getPrototypeOf(this);
    while (prototype) {
      Object.assign(props, Object.getOwnPropertyDescriptors(prototype), props);
      prototype = Object.getPrototypeOf(prototype);
    }
    for (const [key, descriptor] of Object.entries(props)) {
      if (descriptor?.get) {
        // Create a wrapper object that defers getter execution until accessed
        // The wrapper's toString() handles deepmerged LanguageType/Name objects
        const self = this;
        const getter = descriptor.get;
        context[key] = {
          toString() {
            const value = getter.call(self);
            // Handle LanguageType-like objects (including deepmerged plain objects)
            if (value && typeof value === 'object') {
              const nameObj = (value as Record<string, unknown>)._name ?? (value as Record<string, unknown>).name;
              if (nameObj && typeof nameObj === 'object') {
                const parts = (nameObj as Record<string, unknown>).parts;
                if (Array.isArray(parts)) {
                  // Reconstruct name from parts based on defaultCase
                  const defaultCase = ((nameObj as Record<string, unknown>).defaultCase as string) ?? 'SCREAMING_SNAKE';
                  switch (defaultCase) {
                    case 'camelCase':
                      return parts.map((p: string, i: number) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
                    case 'PascalCase':
                      return parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                    case 'kebab-case':
                      return parts.join('-');
                    case 'SCREAMING_SNAKE':
                      return parts.join('_').toUpperCase();
                    case 'snake_case':
                    default:
                      return parts.join('_');
                  }
                }
              }
            }
            return String(value);
          },
          valueOf() {
            return getter.call(self);
          }
        };
      } else if (descriptor?.value) {
        context[key] = descriptor.value;
      } else if (typeof this[key as keyof this] !== 'function') {
        context[key] = this[key as keyof this];
      } else {
        context[key] = (this[key as keyof this] as Function).bind(this);
      }
    }
    return context;
  }
}

/**
 * A LanguageType instance represents 1 type from 1 language.
 * It is constructed with a name and a stub value that can be used in templates
 * when a default or example is needed.
 *
 */
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
    readonly isEntity: boolean = false,
    /** Import path if this type requires an import */
    readonly importPath?: string
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

  get lang() {
    return super.lang;
  }

  set lang(lang: LanguageDefinitionImperative<T>) {
    super.lang = lang;
    this.type.lang = lang as unknown as LanguageDefinitionImperative<LanguageType>;
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
  //function(name: string, params: T[], returnType: T): T;

  /**
   * Create an entity type.
   * @param name - Entity name (e.g., 'Bookmark')
   * @param importPath - Optional import path for the entity
   */
  entity(name: string, importPath?: string): T;

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
export interface LanguageWarpConfig<T extends ExternalLayer<any>> {
  /** ExternalLayer subclass for this language */
  externalLayerClass: new (...args: any[]) => T;

  /**
   * Field decorator functions (e.g., { Mutex, Option, i64 }).
   * Supports both legacy and TC39 decorator signatures.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldDecorators: Record<string, any>;

  /** Class decorator function (e.g., Struct) - can be direct or factory */
  //classDecorator: ClassDecorator | ((options?: any) => ClassDecorator);

  /** Core ring configuration */
  core: {
    /** The CoreRing subclass (e.g., RustCore) */
    coreClass: new (...args: any[]) => CoreRing<any, any>;
    /** Factory to create core instance */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createCore: (layer?: any) => CoreRing<any, any>;
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
// Function Variant Declarations
// ============================================================================

export interface FunctionVariantDeclaration<T extends LanguageType = LanguageType> {
  /** Name of this variant (optional, used when looking up by name) */
  name?: string;
  /** Keyword used for this variant (e.g., 'async', 'unsafe') */
  prependKeyword?: string;
  wrapReturnType?: (returnType: T) => T;
  processParams?: (params: Array<[string, T]>) => Array<[string, T]>;
  //applyVariant?: (...args: any[]) => any;
  overrideName?: Name | string;
}
