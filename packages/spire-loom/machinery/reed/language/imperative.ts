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
import { type TransformEnhancer } from '../transform-pipeline.js';

// Import LanguageType class (not just type) for runtime use
import {
  LanguageType,
  LanguageValue,
  type LanguageDefinition,
  type LanguageParam,
  type TypeFactory
} from './types.js';
import { Name } from '../../stringing.js';
import type { MethodMetadata } from '../../../warp/metadata.js';
import type { FunctionVariantDeclaration } from './declarative.js';
import type { LanguageMethod } from './method.js';

// ============================================================================
// Language Rendering Configuration
// ============================================================================

/**
 * Configuration for rendering language-specific code constructs.
 */
export interface LanguageRenderingConfig {
  // TODO remove
  /** Format a parameter name (e.g., snake_case, camelCase) */
  formatParam: (name: string, type: LanguageType) => string;

  /** render a list of formatted params */
  renderParams: (params: string[]) => string;

  /** Generate function signature */
  functionSignature: (method: LanguageMethod) => string;

  /** Render full function definition with variant options (optional) */
  renderDefinition: (method: LanguageMethod) => string;

  /**
   * Render parameters wrapped in an object (optional).
   * Used by withObjectParams() for DDD service/port patterns.
   */
  renderObjectWrappedParams?: (method: LanguageMethod, objectParamName: string) => string;
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
  /** Rendering configuration for code generation */
  rendering: LanguageRenderingConfig;

  /** Optional custom transform enhancers */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enhancers?: TransformEnhancer<any, any>[];

  /**
   * Optional custom transform function.
   * If provided, takes precedence over auto-generated transform from types + rendering.
   * Use this for advanced use cases that can't be expressed via the declarative config.
   */
  transform?: (methods: MethodMetadata[]) => LanguageMethod<P, T>[];
}

export interface LanguageDefinitionImperative<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> extends LanguageDefinition<T> {
  /** Code generation configuration */
  codeGen: LanguageCodeGenConfig<P, T>;
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
export const declareLanguageImperatively = declare<
  LanguageDefinitionImperative,
  LanguageDefinitionImperative
>({
  name: 'language',
  scope: 'warp',
  validate: (def) => {
    if (!def.name) {
      throw new Error('[language] Language definition must have a name');
    }
    if (!def.extensions?.length) {
      throw new Error(`[language] Language '${def.name}' must have extensions for detection`);
    }
    if (!def.types && !def.codeGen?.transform) {
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
  declare: (def) => def // TODO what should we rather return after processing the language?
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
  get(name: string): LanguageDefinitionImperative | undefined {
    return getScopeRegistry('warp').get(`language:${name}`);
  }

  getAll(): LanguageDefinitionImperative[] {
    return Array.from(getScopeRegistry('warp').entries())
      .filter(([key]) => key.startsWith('language:'))
      .map(([, value]) => value as LanguageDefinitionImperative);
  }

  /**
   * Find language by file extension.
   * Matches against registered language extensions.
   * Handles template files with .mejs extension (e.g., .rs.mejs matches .rs)
   */
  detectByExtension(filename: string): LanguageDefinitionImperative | undefined {
    const basename = filename.toLowerCase();

    for (const [, lang] of getScopeRegistry('warp').entries()) {
      if (!lang.extensions) continue;
      for (const ext of lang.extensions) {
        const extLower = ext.toLowerCase();
        // Match the registered extension exactly
        if (basename.endsWith(extLower)) {
          return lang as LanguageDefinitionImperative;
        }
        // Match template extension: .rs.mejs or .rs.ejs against registered .rs
        if (basename.endsWith(`${extLower}.mejs`) || basename.endsWith(`${extLower}.ejs`)) {
          return lang as LanguageDefinitionImperative;
        }
      }
    }

    return undefined;
  }

  /**
   * Get transform function for a language.
   *
  getTransform(name: string): ((methods: Method[]) => LanguageMethod[]) | undefined {
    return this.get(name)?.codeGen.transform;
  }
  */

  /**
   * Get type factory for a language (new architecture).
   */
  getTypeFactory(name: string): TypeFactory | undefined {
    const lang = this.get(name);
    return lang?.types;
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
