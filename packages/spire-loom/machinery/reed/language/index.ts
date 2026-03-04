/**
 * Language System 🌾
 *
 * Two-layer language definition architecture:
 * - Layer 1: Declarative (what the language IS)
 * - Layer 2: Executive (how to generate code)
 *
 * Languages self-register by calling declareLanguage() in the 'warp' scope.
 *
 * @module machinery/reed/language
 */

// ============================================================================
// Layer 1: Declarative Schema (what the language IS)
// ============================================================================

export type {
  // Core types
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
  NamingCase,
  CoreConvention,
  NamingConventions,
  LanguageIdentity,
  LanguageDeclaration,
  LanguageDeclarationInput,
} from './declarative.js';

export {
  CORE_KEYWORD_TYPES,
  CORE_TYPE_CONSTRUCTORS,
  commonLanguageDeclaration,
  compileToExecutive,
} from './declarative.js';

// ============================================================================
// Layer 2: Executive System (how to generate code)
// ============================================================================

// Export LanguageType class (runtime value, not just type)
export { LanguageType } from './executive.js';

// Export language registry and utilities
export { languages, LanguageRegistry, getLanguageExtensionKey } from './executive.js';

export type {
  // Core types
  BaseParam,
  LanguageParam,
  RawMethod,
  LanguageMethod,
  TypeFactory,
  TransformContext,
  TransformEnhancer,
  TransformConfig,
  
  // Language definition
  LanguageDefinition,
  LanguageDefinitionConfig,
  NamingConventionConfig,
  LanguageRenderingConfig,
  CrudOperation,
  
  // Functions
  deriveCrudMethodName,
  createTransform,
  
  // Built-in enhancers
  baseTypeMappingEnhancer,
  namingEnhancer,
  crudEnhancer,
  templateHelperEnhancer,
  DEFAULT_ENHANCERS,
  
  // Template helpers
  ParamCollection,
  SignatureHelper,
  CrudNameRenderer,
  StubReturnRenderer,
  TypeDefRenderer,
  ParamRenderConfig,
  SignatureRenderConfig,
} from './executive.js';

// ============================================================================
// Layer 1 → Layer 2 Bridge
// ============================================================================

import type { LanguageDeclaration, LanguageDeclarationInput } from './declarative.js';
import type { LanguageDefinition, LanguageDefinitionConfig } from './executive.js';
import { compileToExecutive } from './declarative.js';
import { declareLanguage as executiveDeclareLanguage } from './executive.js';

/**
 * Declare a language.
 *
 * This is the main entry point. It accepts either:
 * 1. A declarative LanguageDeclaration (Layer 1) - compiles to executive
 * 2. An executive LanguageDefinitionConfig (Layer 2) - uses directly
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
 * // Layer 2: Executive style (legacy)
 * export const myLang = declareLanguage({
 *   name: 'myLang',
 *   naming: { function: 'snake', type: 'pascal', ... },
 *   render: { ... }
 * });
 * ```
 */
export function declareLanguage(
  input: LanguageDeclaration | LanguageDefinitionConfig
): LanguageDefinition {
  // Check if this is a declarative (Layer 1) or executive (Layer 2) input
  if ('identity' in input && 'syntax' in input) {
    // Layer 1: Compile declarative to executive
    const compiledConfig = compileToExecutive(input as LanguageDeclaration);
    
    // Merge with any additional properties (overrides) from the input
    // This allows users to provide both declarative schema AND executive overrides
    const executiveConfig: LanguageDefinitionConfig = {
      ...compiledConfig,
      ...input,
      // Ensure name comes from identity
      name: (input as LanguageDeclaration).identity.name,
    };
    
    return executiveDeclareLanguage(executiveConfig);
  }
  
  // Layer 2: Use executive config directly
  return executiveDeclareLanguage(input as LanguageDefinitionConfig);
}

// ============================================================================
// Well-Known Language Declarations (C-Family Base)
// ============================================================================

import { commonLanguageDeclaration } from './declarative.js';

/**
 * C-Family language declaration.
 * Base for Rust, TypeScript, C++, Java, etc.
 */
export const cFamilyLanguageDeclaration: LanguageDeclaration = {
  ...commonLanguageDeclaration,
  identity: {
    name: 'c_family',
    extends: 'common',
    extensions: ['.c', '.cpp', '.h', '.hpp', '.cs', '.java', '.rs', '.ts', '.kt', '.swift'],
  },
  conventions: {
    naming: {
      ...commonLanguageDeclaration.conventions.naming,
    },
  },
  syntax: {
    ...commonLanguageDeclaration.syntax,
    blocks: {
      ...commonLanguageDeclaration.syntax.blocks,
      open: '{',
      close: '}',
    },
  },
};

// Re-export MethodLink for convenience
export type { MethodLink } from './types.js';
