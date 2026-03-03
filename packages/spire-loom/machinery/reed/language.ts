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

import {
  declare,
  getScopeRegistry,
  type Scope
} from '../self-declarer.js';
import type { RawMethod } from '../bobbin/code-generator.js';
import type { ExternalLayer } from '../../warp/imprint.js';
import type { CoreRing, Spiraler, SpiralRing } from '../../warp/spiral/pattern.js';
import {
  type LanguageType,
  type LanguageParam,
  type LanguageMethod,
  type TypeFactory,
  type TransformConfig,
  createTransform,
} from './transform-pipeline.js';

// ============================================================================
// Re-exports
// ============================================================================

// Re-export LanguageType class (not type)
export { LanguageType } from './language-types.js';

export {
  // Types
  type BaseParam,
  type LanguageParam,
  type BaseMethod,
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
  DEFAULT_ENHANCERS,
} from './transform-pipeline.js';

export {
  // Template helpers
  ParamCollection,
  SignatureHelper,
  CrudNameRenderer,
  StubReturnRenderer,
  TypeDefRenderer,
  type ParamRenderConfig,
  type SignatureRenderConfig,
} from '../bobbin/template-helpers.js';

// ============================================================================
// Type Re-exports from language-types (for convenience)
// ============================================================================

export type {
  CrudOperation,
  MethodLink,
} from './language-types.js';

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
// Transform Enhancer Type (re-export with proper naming)
// ============================================================================

export type {
  TransformEnhancer,
  TransformContext,
} from './transform-pipeline.js';

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

/**
 * Register type mappings from a language definition with the central type mapper.
 *
 * This is called automatically by declareLanguage.
 *
 * @param langName - Language identifier
 * @param mappings - Type mappings to register
 */
async function registerLanguageTypeMappings(
  langName: string,
  mappings: TypeMapping[]
): Promise<void> {
  try {
    const { registerTypeMapping } = await import('../bobbin/type-mappings.js');

    for (const mapping of mappings) {
      registerTypeMapping({
        tsType: mapping.tsType,
        [langName]: mapping.targetType,
        // Fallbacks for other languages
        kotlin: mapping.targetType,
        jni: mapping.targetType,
        rust: mapping.targetType,
        tauri: mapping.targetType,
        sql: 'TEXT' // Default SQL fallback
      });
    }
  } catch (error) {
    console.warn('[language] Could not register type mappings:', error);
  }
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
export const declareLanguage = declare<LanguageDefinition, LanguageDefinition>({
  name: 'language',
  scope: 'warp',
  validate: (def) => {
    if (!def.name) {
      throw new Error('[language] Language definition must have a name');
    }
    if (!def.codeGen?.fileExtensions?.length) {
      throw new Error(
        `[language] Language '${def.name}' must have fileExtensions for detection`
      );
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
        throw new Error(
          `[language] Language '${def.name}' has warp config but no spiralers`
        );
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
        customEnhancers: def.codeGen.enhancers as TransformEnhancer<LanguageMethod, LanguageParam, LanguageMethod>[],
      };
      
      // Generate and attach transform
      (def.codeGen as any).transform = createTransform(transformConfig);
      
      // Also expose type mappings for backward compat with type-mappings.ts
      // Extract primitive mappings from TypeFactory
      const types = def.codeGen.types as any;
      const typeMappings: TypeMapping[] = [];
      
      if (types.boolean) {
        typeMappings.push({ tsType: 'boolean', targetType: types.boolean.name });
        typeMappings.push({ tsType: 'bool', targetType: types.boolean.name });
      }
      if (types.string) {
        typeMappings.push({ tsType: 'string', targetType: types.string.name });
      }
      if (types.number) {
        typeMappings.push({ tsType: 'number', targetType: types.number.name });
      }
      
      (def.codeGen as any).typeMappings = typeMappings;
    }
    
    // Register type mappings asynchronously (fire-and-forget, non-blocking)
    if (def.codeGen.typeMappings?.length) {
      queueMicrotask(() => {
        registerLanguageTypeMappings(def.name, def.codeGen.typeMappings!).catch(
          (err) => console.warn('[language] Failed to register type mappings:', err)
        );
      });
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
