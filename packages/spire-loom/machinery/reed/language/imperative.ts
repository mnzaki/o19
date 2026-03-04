/**
 * Language System Kernel 🌾
 *
 * Single source of truth for language definitions in spire-loom.
 *
 * Pulled inward from self-declarer.ts - languages declare themselves
 * in the 'warp' scope (workspace session).
 *
 * Languages self-register by importing and calling declareLanguage().
 *
 * @module machinery/reed/language
 */

import { declare, getScopeRegistry } from '../../self-declarer.js';
import type { ExternalLayer } from '../../../warp/imprint.js';
import type { CoreRing, Spiraler, SpiralRing } from '../../../warp/spiral/pattern.js';
import {
  type TransformConfig,
  createTransform,
  type TransformEnhancer
} from '../transform-pipeline.js';

// Import LanguageType class (not just type) for runtime use
import { LanguageType, type BaseParam, type LanguageParam, type TypeFactory } from './types.js';
import { camelCase, pascalCase, toSnakeCase } from '../../stringing.js';
import type { MethodLink } from '../../bobbin/index.js';

// ============================================================================
// Language Identity
// ============================================================================

/* NOTE: the unused type parameters are so that LanguageDeclarationInput can
 * properly pass types through so that type inference works correctly for the
 * fields in codeGen.rendering
 */
export interface LanguageIdentity<
  _P extends LanguageParam = LanguageParam,
  _T extends LanguageType = LanguageType
> {
  /** Language name (e.g., 'typescript', 'rust', 'kotlin') */
  name: string;
  /** Parent language to inherit from (e.g., 'c_family') */
  extends?: string;
  /** File extensions associated with this language */
  extensions: string[];
}

// ============================================================================
// Naming Conventions
// ============================================================================

export type NamingCase =
  | 'snake_case'
  | 'camelCase'
  | 'PascalCase'
  | 'SCREAMING_SNAKE'
  | 'kebab-case';

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

  /**
   * CRUD operation type (create, read, update, delete, list).
   * Convenience getter that calls getCrudOperation().
   */
  get crudOperation(): string | undefined {
    return this.getCrudOperation();
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
 * For templates, use LanguageView (from enhanced/methods.ts) which provides
 * idiomatic naming via conventions.
 */
export class LanguageMethod<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> extends RawMethod {
  withNewName(name: string): LanguageMethod<P, T> {
    // 1. Create new object with same prototype chain
    const clone = Object.create(Object.getPrototypeOf(this)) as LanguageMethod<P, T>;

    // 2. Copy all own property descriptors from original
    for (const key of Object.getOwnPropertyNames(this)) {
      const descriptor = Object.getOwnPropertyDescriptor(this, key);
      if (descriptor) {
        Object.defineProperty(clone, key, descriptor);
      }
    }

    // 3. Override name-based properties
    //    name is readonly but we can redefine it since it's configurable
    Object.defineProperty(clone, 'name', {
      value: name,
      writable: false,
      enumerable: true,
      configurable: true
    });

    // 4. Recalculate naming variants based on new name
    Object.defineProperty(clone, 'camelName', {
      value: camelCase(name),
      writable: true,
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(clone, 'pascalName', {
      value: pascalCase(name),
      writable: true,
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(clone, 'snakeName', {
      value: toSnakeCase(name),
      writable: true,
      enumerable: true,
      configurable: true
    });

    return clone;
  }

  cloneWith(
    overrides: Partial<Omit<LanguageMethod<P, T>, 'name' | 'camelName' | 'pascalName' | 'snakeName'>>
  ): LanguageMethod<P, T> {
    const clone = Object.create(Object.getPrototypeOf(this)) as LanguageMethod<P, T>;

    // Copy all own properties
    for (const key of Object.getOwnPropertyNames(this)) {
      const descriptor = Object.getOwnPropertyDescriptor(this, key);
      if (descriptor) {
        Object.defineProperty(clone, key, descriptor);
      }
    }

    // Apply overrides (excluding name-related properties which should use withNewName)
    for (const [key, value] of Object.entries(overrides)) {
      Object.defineProperty(clone, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }

    return clone;
  }

  /** camelCase name */
  camelName!: string;
  /** PascalCase name */
  pascalName!: string;
  /** snake_case name */
  snakeName!: string;

  /**
   * Parameters with language-specific enhancements.
   * Overrides RawMethod.params to include langType and formattedName.
   */
  declare params: P[];

  /** Return type definition with full metadata */
  returnTypeDef!: T;
  /** Stub return value for mock implementations */
  stubReturn!: string;
}
// ============================================================================
// Language Rendering Configuration
// ============================================================================

/**
 * Configuration for rendering language-specific code constructs.
 */
export interface LanguageRenderingConfig<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> {
  /** Format a parameter name (e.g., snake_case, camelCase) */
  formatParamName: (name: string) => string;

  /** Generate function signature */
  functionSignature: (method: LanguageMethod<P, T>) => string;

  /** Generate async function signature (optional) */
  asyncFunctionSignature?: (method: LanguageMethod<P, T>) => string;

  /** Render full function definition with variant options (optional) */
  renderDefinition?: (
    method: LanguageMethod<P, T>,
    options: {
      public?: boolean;
      private?: boolean;
      protected?: boolean;
      static?: boolean;
      async?: boolean;
    }
  ) => string;

  /**
   * Render parameters wrapped in an object (optional).
   * Used by withObjectParams() for DDD service/port patterns.
   */
  renderObjectWrappedParams?: (method: LanguageMethod<P, T>, objectParamName: string) => string;
}

// ============================================================================
// Language Code Generation Configuration (New Format)
// ============================================================================

/**
 * Code generation configuration using the new classes-as-config architecture.
 */
export interface LanguageCodeGenConfig<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> {
  /** Type factory for generating language-specific types */
  types: TypeFactory<P, T>;

  /** Rendering configuration for code generation */
  rendering: LanguageRenderingConfig<P, T>;

  /** Optional custom transform enhancers */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enhancers?: TransformEnhancer<any, any, any>[];

  /**
   * Optional custom transform function.
   * If provided, takes precedence over auto-generated transform from types + rendering.
   * Use this for advanced use cases that can't be expressed via the declarative config.
   */
  transform?: (methods: RawMethod[]) => LanguageMethod<P, T>[];
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
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> extends LanguageIdentity<P, T> {
  /** Code generation configuration */
  codeGen: LanguageCodeGenConfig<P, T>;

  conventions: {
    /** Naming conventions for the language */
    naming: NamingConventions;
  };

  /**
   * WARP integration configuration.
   * Optional for code-generation-only languages.
   */
  warp?: LanguageWarpConfig;
}

// ============================================================================
// Type Mapping Integration
// ============================================================================

/**
 * Type mapping from TypeScript to target language.
 */
export interface TypeMapping {
  tsType: string;
  targetType: string;
}

// ============================================================================
// Language Declarer - 'warp' scope
// ============================================================================

/**
 * Declare a language.
 *
 * Creates a declarer in 'warp' scope (workspace session lifetime).
 *
 * Call this at module load time in warp/{language}.ts.
 * The language becomes available in the 'warp' scope registry.
 *
 * The new architecture auto-generates the transform function from:
 * - types: TypeFactory for language-specific types
 * - rendering: LanguageRenderingConfig for code formatting
 * - enhancers: Optional custom TransformEnhancers
 *
 * @example
 * ```typescript
 * // warp/rust.ts
 * export const rustLanguage = declareLanguage<RustParam, RustType>({
 *   name: 'rust',
 *   extensions: ['.rs', '.jni.rs'],
 *   codeGen: {
 *     types: new RustTypeFactory(),
 *     rendering: {
 *       formatParamName: toSnakeCase,
 *       functionSignature: (m) => `fn ${m.snakeName}(${m.params.list}) -> ${m.returnTypeDef.name}`
 *     }
 *   },
 *   warp: { externalLayerClass: ..., spiralers: ..., ... }
 * });
 * ```
 */
export const declareLanguageImperatively = declare<LanguageDefinition, LanguageDefinition>({
  name: 'language',
  scope: 'warp',
  validate: (def) => {
    if (!def.name) {
      throw new Error('[language] Language definition must have a name');
    }
    if (!def.extensions?.length) {
      throw new Error(`[language] Language '${def.name}' must have extensions for detection`);
    }
    if (!def.codeGen?.types && !def.codeGen?.transform) {
      throw new Error(
        `[language] Language '${def.name}' must have either 'types' (new format) or 'transform' (legacy)`
      );
    }
    // WARP config is optional for code-generation-only languages
    if (def.warp) {
      if (!def.warp.core?.coreClass) {
        throw new Error(`[language] Language '${def.name}' has warp config but no coreClass`);
      }
      if (!def.warp.spiralers || Object.keys(def.warp.spiralers).length === 0) {
        throw new Error(`[language] Language '${def.name}' has warp config but no spiralers`);
      }
    }
  },
  declare: (def) => {
    // Auto-generate transform if not provided (new architecture)
    if (!def.codeGen.transform && def.codeGen.types && def.codeGen.rendering) {
      const transformConfig: TransformConfig<LanguageParam, LanguageType> = {
        language: def.name,
        types: def.codeGen.types as TypeFactory<LanguageParam, LanguageType>,
        formatParamName: def.codeGen.rendering.formatParamName,
        functionSignature: def.codeGen.rendering.functionSignature,
        asyncFunctionSignature: def.codeGen.rendering.asyncFunctionSignature,
        customEnhancers: def.codeGen.enhancers as TransformEnhancer<
          LanguageMethod,
          LanguageParam,
          LanguageMethod
        >[]
      };

      // Generate and attach transform
      (def.codeGen as any).transform = createTransform(transformConfig);
    }

    // Return the definition synchronously
    return def;
  }
});

// ============================================================================
// Language Registry
// ============================================================================

/**
 * Language registry interface.
 *
 * Pulled from 'warp' scope registry. Languages are registered here
 * by consumers (e.g., reed/language.ts exports).
 */
export class LanguageRegistry {
  get(name: string): LanguageDefinition | undefined {
    return getScopeRegistry('warp').get(`language:${name}`);
  }

  getAll(): LanguageDefinition[] {
    return Array.from(getScopeRegistry('warp').entries())
      .filter(([key]) => key.startsWith('language:'))
      .map(([, value]) => value as LanguageDefinition);
  }

  /**
   * Find language by file extension.
   * Matches against registered language extensions.
   * Handles template files with .mejs extension (e.g., .rs.mejs matches .rs)
   */
  detectByExtension(filename: string): LanguageDefinition | undefined {
    const basename = filename.toLowerCase();

    for (const [, lang] of getScopeRegistry('warp').entries()) {
      if (!lang.extensions) continue;
      for (const ext of lang.extensions) {
        const extLower = ext.toLowerCase();
        // Match the registered extension exactly
        if (basename.endsWith(extLower)) {
          return lang as LanguageDefinition;
        }
        // Match template extension: .rs.mejs or .rs.ejs against registered .rs
        if (basename.endsWith(`${extLower}.mejs`) || basename.endsWith(`${extLower}.ejs`)) {
          return lang as LanguageDefinition;
        }
      }
    }

    return undefined;
  }

  /**
   * Get transform function for a language.
   */
  getTransform(name: string): ((methods: RawMethod[]) => LanguageMethod[]) | undefined {
    return this.get(name)?.codeGen.transform;
  }

  /**
   * Get type factory for a language (new architecture).
   */
  getTypeFactory(name: string): TypeFactory | undefined {
    const lang = this.get(name);
    return (lang?.codeGen as any)?.types;
  }
}

/** Global language registry instance */
export const languages = new LanguageRegistry();

// ============================================================================
// Language Extension Key Utility
// ============================================================================

/**
 * Get the extension key for a language.
 *
 * Extracts from the first fileExtension (e.g., '.rs.mejs' → 'rs').
 * This is used as the property key for language views (method.rs, method.ts).
 *
 * @param language - Language identifier
 * @returns Extension key (rs, ts, kt) or language name if not found
 */
export function getLanguageExtensionKey(language: string): string {
  const lang = languages.get(language);
  if (!lang?.extensions?.length) {
    return language;
  }

  const ext = lang.extensions[0];
  const match = ext.match(/\.([^.]+)(\.mejs)?$/);
  return match?.[1] || language;
}
