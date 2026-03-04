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
  type LanguageParam,
  type LanguageMethod,
  type TypeFactory,
  type TransformConfig,
  createTransform,
  type TransformEnhancer
} from '../transform-pipeline.js';

// Import LanguageType class (not just type) for runtime use
import { LanguageType, type BaseParam } from './types.js';
import type { MethodLink } from '../../bobbin/index.js';

// ============================================================================
// Re-exports
// ============================================================================

export { LanguageType } from './types.js';

export {
  // Types
  type BaseParam,
  type LanguageParam,
  type LanguageMethod,
  type TypeFactory,
  type TransformContext,
  type TransformEnhancer,
  type TransformConfig,

  // Functions
  deriveCrudMethodName,
  createTransform,

  // Built-in enhancers
  baseTypeMappingEnhancer,
  namingEnhancer,
  crudEnhancer,
  templateHelperEnhancer,
  DEFAULT_ENHANCERS
} from '../transform-pipeline.js';

export {
  // Template helpers
  ParamCollection,
  SignatureHelper,
  CrudNameRenderer,
  StubReturnRenderer,
  TypeDefRenderer,
  type ParamRenderConfig,
  type SignatureRenderConfig
} from './template-helpers.js';

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

  /** 
   * Parameters with language-specific enhancements.
   * Overrides RawMethod.params to include langType and formattedName.
   */
  params: P[];

  /** Return type definition with full metadata */
  returnTypeDef: T;
  /** Stub return value for mock implementations */
  stubReturn: string;
}
// ============================================================================
// Language Rendering Configuration
// ============================================================================

/**
 * Configuration for rendering language-specific code constructs.
 */
export interface LanguageRenderingConfig {
  /** Format a parameter name (e.g., snake_case, camelCase) */
  formatParamName: (name: string) => string;

  /** Generate function signature */
  functionSignature: (method: LanguageMethod) => string;

  /** Generate async function signature (optional) */
  asyncFunctionSignature?: (method: LanguageMethod) => string;

  /** Render full function definition with variant options (optional) */
  renderDefinition?: (
    method: LanguageMethod, 
    options: { 
      public?: boolean;
      private?: boolean;
      protected?: boolean;
      static?: boolean;
      async?: boolean;
    }
  ) => string;

  /** Naming conventions for the language */
  naming: NamingConventions;
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
  /** File extension patterns for auto-detection (e.g., '.rs.ejs', '.kt.ejs') */
  fileExtensions: string[];

  /** Type factory for generating language-specific types */
  types: TypeFactory<P, T>;

  /** Rendering configuration for code generation */
  rendering: LanguageRenderingConfig;

  /** Optional custom transform enhancers */
  enhancers?: TransformEnhancer<LanguageMethod<P, T>, P, LanguageMethod<P, T>>[];

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

  /** Field decorator functions (e.g., { Mutex, Option, i64 }) */
  fieldDecorators: Record<string, PropertyDecorator>;

  /** Class decorator function (e.g., Struct) - can be direct or factory */
  classDecorator: ClassDecorator | ((options?: any) => ClassDecorator);

  /** Core ring configuration */
  core: {
    /** The CoreRing subclass (e.g., RustCore) */
    coreClass: new (...args: any[]) => CoreRing<any, any, any>;
    /** Factory to create core instance */
    createCore: (layer?: ExternalLayer) => CoreRing<any, any, any>;
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
> {
  /** Language identifier (e.g., 'rust', 'typescript') */
  name: string;

  /** Code generation configuration */
  codeGen: LanguageCodeGenConfig<P, T>;

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
 *   codeGen: {
 *     fileExtensions: ['.rs.ejs', '.jni.rs.ejs'],
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
    if (!def.codeGen?.fileExtensions?.length) {
      throw new Error(`[language] Language '${def.name}' must have fileExtensions for detection`);
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
   * Matches against registered language fileExtensions.
   */
  detectByExtension(filename: string): LanguageDefinition | undefined {
    const basename = filename.toLowerCase();

    for (const [, lang] of getScopeRegistry('warp').entries()) {
      if (!lang.codeGen?.fileExtensions) continue;
      for (const ext of lang.codeGen.fileExtensions) {
        if (basename.endsWith(ext.toLowerCase())) {
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
 * Extracts from the first fileExtension (e.g., '.rs.ejs' → 'rs').
 * This is used as the property key for language views (method.rs, method.ts).
 *
 * @param language - Language identifier
 * @returns Extension key (rs, ts, kt) or language name if not found
 */
export function getLanguageExtensionKey(language: string): string {
  const lang = languages.get(language);
  if (!lang?.codeGen?.fileExtensions?.length) {
    return language;
  }

  const ext = lang.codeGen.fileExtensions[0];
  const match = ext.match(/\.([^.]+)(\.ejs)?$/);
  return match?.[1] || language;
}
