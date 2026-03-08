/**
 * Language System 🌾
 *
 * Two-layer language definition architecture:
 * - Layer 1: Declarative (what the language IS)
 * - Layer 2: Executive (how to generate code)
 *
 * This module provides the public API for language definitions.
 * Implementation details are in sibling modules - never import from them directly.
 *
 * @module machinery/reed/language
 */

// ============================================================================
// Types (re-exported from implementation)
// ============================================================================

export type {
  // Layer 1: Declarative types
  CoreKeywordType,
  KeywordType,
  KeywordDeclaration,
  Keywords,
  CoreTypeConstructor,
  TypeConstructorDeclaration,
  TypeConstructors,
  FunctionVariantDeclaration,
  BlockSyntaxDeclaration,
  CompositionTemplate,
  CompositionTemplates,
  LanguageDeclaration
} from './declarative.js';

export type {
  // Layer 2: Executive types
  LanguageIdentity,
  LanguageDefinition,
  LanguageRenderingConfig
} from './imperative.js';

/**
 * Apply naming convention to a name.
 */
export function applyNamingConvention(
  name: string,
  convention: NamingConventions[keyof NamingConventions] | null | undefined
): string {
  if (!convention) return name;

  switch (convention) {
    case 'snake_case':
      return toSnakeCase(name);
    case 'camelCase':
      return camelCase(name);
    case 'PascalCase':
      return pascalCase(name);
    case 'SCREAMING_SNAKE':
      return toSnakeCase(name).toUpperCase();
    case 'kebab-case':
      return toSnakeCase(name).replace(/_/g, '-');
    default:
      return name;
  }
}

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
  cFamilyLanguageDeclaration,
  compileToExecutive
} from './declarative.js';

export * from './types.js';

// ============================================================================
// Public API: Unified declareLanguage
// ============================================================================

import type { LanguageDeclaration } from './declarative.js';
import { compileToExecutive } from './declarative.js';
import type { LanguageDefinition, LanguageIdentity } from './imperative.js';
import { declareLanguageImperatively } from './imperative.js';
import deepmerge from 'deepmerge';
import type { LanguageParam, LanguageType, NamingConventions } from './types.js';
import { camelCase, pascalCase, toSnakeCase } from '../../stringing.js';

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends object ? RecursivePartial<T[P]> : T[P];
};
/**
 * Input for declaring a language. Allows partial declarations
 * when extending an existing language.
 */
export type LanguageDeclarationInput<
  P extends LanguageParam,
  T extends LanguageType
> = LanguageIdentity<P, T> &
  Partial<Omit<LanguageDefinition<P, T>, 'conventions'>> &
  RecursivePartial<LanguageDeclaration>;
/**
 * Declare a language.
 *
 * This is the main entry point. It accepts a mixed object of:
 * 1. A declarative LanguageDeclaration (Layer 1) - compiles to executive
 * 2. An executive LanguageDefinition (Layer 2) - overrides anything that comes
 * out of the compiled declarative config
 *
 * The declarative config is deeply merged with the compiled executive config,
 * allowing you to override specific fields while keeping the generated ones.
 *
 * @example
 * ```typescript
 * // Layer 1: Declarative style
 * export const myLang = declareLanguage({
 *   identity: { name: 'myLang', extensions: ['.my'] },
 *   conventions: { naming: { function: 'snake', type: 'pascal' } },
 *   syntax: { ... }
 * });
 *
 * // Layer 1 with enhancers override
 * export const myLang = declareLanguage({
 *   identity: { name: 'myLang', extensions: ['.my'] },
 *   conventions: { ... },
 *   syntax: { ... },
 *   enhancers: [myCustomEnhancer]  // Passed through to executive layer
 * });
 * ```
 */
export function declareLanguage<P extends LanguageParam, T extends LanguageType>(
  input: LanguageDeclarationInput<P, T>
): LanguageDefinition {
  let executiveConfig: LanguageDefinition;

  // Check if this is a declarative (Layer 1) or executive (Layer 2) input
  if ('identity' in input && 'syntax' in input) {
    // Layer 1: Compile declarative to executive
    const compiledConfig = compileToExecutive(input as LanguageDeclaration);

    // Deep merge: input overrides compiled config
    executiveConfig = deepmerge(compiledConfig, input);

    // Ensure name is set from identity
    executiveConfig.name = input.name;
  } else {
    // Layer 2: Use executive config directly
    executiveConfig = input as unknown as LanguageDefinition;
  }

  return declareLanguageImperatively(executiveConfig);
}
