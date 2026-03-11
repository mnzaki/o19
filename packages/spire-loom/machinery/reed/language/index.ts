/**
 * Language System 🌾
 *
 * TWO-LAYER ARCHITECTURE:
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  LAYER 1: DECLARATIVE (declarative.ts)                      │
 * │  - Define languages using templates                         │
 * │  - "What does the output look like?"                        │
 * │  - Example: syntax.composition.importStatement.source       │
 * └──────────────────────────┬──────────────────────────────────┘
 *                            │ compileToImperative()
 *                            ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  LAYER 2: IMPERATIVE (imperative.ts)                        │
 * │  - Runtime uses compiled methods                            │
 * │  - "How do I generate it?"                                  │
 * │  - Example: codeGen.rendering.renderImportStatement()       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * THREE ENTRY POINTS:
 *
 * 1. declareLanguage({ syntax: {...} })  ← Pure declarative (recommended)
 *    Path: declarative config → compileToImperative() → register
 *
 * 2. declareLanguage({ syntax: {...}, codeGen: {...} })  ← Mixed
 *    Compiled config is deep-merged with explicit codeGen overrides
 *
 * 3. declareLanguageImperatively({ codeGen: {...} })  ← Pure imperative
 *    Direct registration, no compilation. For specialized cases.
 *
 * ARCHITECTURAL GUARDRAIL:
 * Accessing lang.syntax from imperative layer throws an error.
 * Use lang.codeGen.rendering.* methods instead.
 *
 * @module machinery/reed/language
 * @see DEV.md "The Two-Layer Language Architecture" for full guide
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
