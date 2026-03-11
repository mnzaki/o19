/**
 * Language System 🌾
 *
 * Two-layer language definition architecture:
 * - Layer 1: Declarative (what the language IS)
 * - Layer 2: Executive (how to generate code)
 *
 * COMPILATION FLOW:
 * 1. User provides mixed declarative + optional imperative config
 * 2. If 'syntax' field present: compileToExecutive() generates codeGen from syntax
 * 3. Deep merge: explicit config overrides compiled config
 * 4. Register final config via declareLanguageImperatively()
 *
 * This module provides the public API for language definitions.
 * Implementation details are in sibling modules - never import from them directly.
 *
 * @module machinery/reed/language
 */

import type { LanguageDeclaration } from './declarative.js';
import { compileToImperative } from './declarative.js';
import { declareLanguageImperatively, type LanguageDefinitionImperative } from './imperative.js';
import deepmerge from 'deepmerge';
import type { LanguageIdentity, LanguageType } from './types.js';

// ============================================================================
// Public API: Unified declareLanguage
// ============================================================================

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends object ? RecursivePartial<T[P]> : T[P];
};

/**
 * Input for declaring a language. Allows partial declarations
 * when extending an existing language.
 */
export type LanguageDeclarationInput<T extends LanguageType> = LanguageIdentity &
  RecursivePartial<LanguageDefinitionImperative<T>> &
  RecursivePartial<LanguageDeclaration>;
/**
 * Declare a language.
 *
 * This is the main entry point. It accepts a mixed object containing:
 * 1. Declarative config (Layer 1): conventions, syntax, functionVariants
 *    - syntax.types generates codeGen.types (TypeFactory)
 *    - syntax.composition generates codeGen.rendering (RenderingConfig)
 * 2. Optional imperative overrides (Layer 2): codeGen, enhancements, warp
 *
 * COMPILATION:
 * - If 'syntax' field is present: compileToExecutive() generates codeGen
 * - Explicit codeGen overrides compiled codeGen via deepmerge
 * - Final config is registered via declareLanguageImperatively()
 *
 * @example
 * ```typescript
 * // Pure declarative (recommended)
 * export const myLang = declareLanguage({
 *   name: 'myLang',
 *   extensions: ['.my'],
 *   conventions: { naming: { function: 'snake_case' } },
 *   syntax: {
 *     keywords: { function: 'fn' },
 *     types: { boolean: { template: 'bool', stub: 'false' } },
 *     composition: { functionSignature: { source: 'fn {{name}}()' } }
 *   }
 * });
 *
 * // Declarative with imperative overrides
 * export const myLang = declareLanguage({
 *   name: 'myLang',
 *   extensions: ['.my'],
 *   syntax: { ... },  // Generates types + rendering
 *   codeGen: {
 *     rendering: {
 *       functionSignature: (m) => `custom ${m.name}()`  // Override
 *     }
 *   }
 * });
 * ```
 */
export function declareLanguage<T extends LanguageType>(
  input: LanguageDeclarationInput<T>
): LanguageDefinitionImperative {
  let executiveConfig: LanguageDefinitionImperative;

  // Layer 1: Compile declarative syntax to executive codeGen
  if ('syntax' in input) {
    // compileToExecutive() generates:
    // - codeGen.types from syntax.types (TypeFactory)
    // - codeGen.rendering from syntax.composition (RenderingConfig)
    const compiledConfig = compileToImperative(input as LanguageDeclaration);

    // Deep merge: explicit config overrides compiled config
    // This allows imperative overrides of generated parts
    executiveConfig = deepmerge(compiledConfig, input);

    // Ensure name is set from identity
    executiveConfig.name = input.name;
  } else {
    // Layer 2: Pure imperative (no declarative compilation)
    executiveConfig = input as unknown as LanguageDefinitionImperative;
  }

  return declareLanguageImperatively(executiveConfig);
}

export type * from './declarative.js';
export type * from './imperative.js';

// ============================================================================
// Runtime Values (re-exported from implementation)
// ============================================================================

export {
  // Layer 1: Imperative
  languages,
  LanguageRegistry,
  getLanguageExtensionKey,
  declareLanguageImperatively
} from './imperative.js';

export {
  // Layer 2: Declarative
  CORE_KEYWORD_TYPES,
  CORE_TYPE_CONSTRUCTORS,
  commonLanguageDeclaration,
  compileToImperative as compileToExecutive
} from './declarative.js';

export * from './types.js';
