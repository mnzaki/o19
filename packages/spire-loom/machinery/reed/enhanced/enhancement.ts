/**
 * Enhancement Declarer 🌀
 *
 * The loom declares how it enhances.
 *
 * This module provides `declareEnhancement()` which registers enhancement
 * systems (method enhancement, entity enhancement, etc.) in the 'declare'
 * scope - they are part of spire-loom's core capabilities.
 *
 * Each enhancement system declares:
 * - What it enhances (methods, entities, etc.)
 * - How to enhance a single item for a language
 * - How to create language-specific views
 * - How to create the enhanced container with delegating getters
 */

import { declare } from '../../self-declarer.js';
import {
  languages as languageRegistry,
  getLanguageExtensionKey,
  type LanguageDefinition
} from '../language/index.js';

// ============================================================================
// Enhancement Configuration
// ============================================================================

/**
 * Configuration for an enhancement system.
 *
 * Each enhancement kind (method, entity, etc.) declares its capabilities
 * so they can be discovered and used uniformly.
 */
export interface EnhancementConfig<
  Raw,
  LanguageEnhanced,
  View,
  Enhanced extends EnhancedContainer
> {
  /** Unique name for this enhancement kind ('method', 'entity', etc.) */
  name: string;

  /** Enhance a raw item for a specific language */
  enhance(raw: Raw, language: string): LanguageEnhanced;

  /** Create a language-specific view from the enhanced item */
  createView(enhanced: LanguageEnhanced, lang: any, langKey: string): View;

  /**
   * Create the container with language views and delegating getters.
   * The container should spread raw properties and attach language views.
   */
  createContainer(
    raw: Raw,
    enhancements: Map<string, { item: LanguageEnhanced; lang: LanguageDefinition }>,
    defaultLangKey: string
  ): Enhanced;
}

/**
 * An enhanced container - the result of enhancement.
 * Has language views attached (rs, ts, kt) and delegates to default.
 */
export interface EnhancedContainer {
  /** Default language extension key */
  readonly _default: string;
  /** All enhanced language keys */
  readonly _languages: string[];
}

/**
 * A declared enhancement system - callable with batch operations.
 */
export interface EnhancementSystem<
  Raw,
  LanguageEnhanced,
  View,
  Enhanced extends EnhancedContainer
> {
  /** Enhance a single raw item for a specific language */
  enhance(raw: Raw, language: string): LanguageEnhanced;

  /** Create a language-specific view */
  createView(enhanced: LanguageEnhanced, lang: any, langKey: string): View;

  /** Create the full enhanced container */
  createContainer(
    raw: Raw,
    enhancements: Map<string, { item: LanguageEnhanced; lang: any }>,
    defaultLangKey: string
  ): Enhanced;

  /** Batch enhance multiple items with multiple languages */
  enhanceAll(raws: Raw[], languages: string[], defaultLanguage?: string): Enhanced[];

  /** Original config */
  config: EnhancementConfig<Raw, LanguageEnhanced, View, Enhanced>;
}

// ============================================================================
// The Enhancement Declarer
// ============================================================================

/**
 * Declare an enhancement system.
 *
 * Creates a declarer that registers enhancement capabilities in the 'declare' scope.
 * The returned function provides both single-item enhancement and batch operations.
 *
 * @example
 * ```typescript
 * // Declare the method enhancement system
 * export const methodEnhancement = declareEnhancement<RawMethod, LanguageMethod, LanguageView, EnhancedMethod>({
 *   name: 'method',
 *   enhance: enhanceMethod,
 *   createView: createLanguageView,
 *   createContainer: createEnhancedMethod,
 * });
 *
 * // Use it to enhance methods
 * const enhanced = methodEnhancement.enhanceAll(methods, ['rust', 'typescript']);
 * ```
 */
const declareEnhancementImpl = declare<
  // The declaration result type (a function with methods attached)
  <Raw, LanguageEnhanced, View, Enhanced extends EnhancedContainer>(
    config: EnhancementConfig<Raw, LanguageEnhanced, View, Enhanced>
  ) => LanguageEnhanced,
  // The config type
  EnhancementConfig<any, any, any, any>
>({
  name: 'enhancement',
  scope: 'declare',

  validate: (config) => {
    if (!config.name) {
      throw new Error('[enhancement] Enhancement must have a name');
    }
    if (typeof config.enhance !== 'function') {
      throw new Error(`[enhancement] '${config.name}' must have an enhance function`);
    }
    if (typeof config.createView !== 'function') {
      throw new Error(`[enhancement] '${config.name}' must have a createView function`);
    }
    if (typeof config.createContainer !== 'function') {
      throw new Error(`[enhancement] '${config.name}' must have a createContainer function`);
    }
  },

  declare: (config) => {
    // Create the enhancement system with batch operations attached
    const system = Object.assign(
      // Direct call enhances single item
      <Raw, LanguageEnhanced, View, Enhanced extends EnhancedContainer>(
        raw: any,
        language: string
      ) => config.enhance(raw, language),
      {
        // Reference to original config
        config,

        // Create language view
        createView: config.createView,

        // Create enhanced container
        createContainer: config.createContainer,

        // Batch enhance with multiple languages
        enhanceAll(raws: any[], languages: string[], defaultLanguage?: string): any[] {
          const defaultLang = defaultLanguage || languages[0];
          const defaultLangKey = getLanguageExtensionKey(defaultLang);

          return raws.map((raw) => {
            // Enhance for each language
            const enhancements = new Map<string, { item: any; lang: any }>();

            for (const langName of languages) {
              const langKey = getLanguageExtensionKey(langName);
              const langDef = languageRegistry.get(langName);
              if (!langDef) continue;

              const enhanced = config.enhance(raw, langName);
              enhancements.set(langKey, { item: enhanced, lang: langDef });
            }

            return config.createContainer(raw, enhancements, defaultLangKey);
          });
        }
      }
    );

    return system;
  }
});

export function declareEnhancement<Raw, LanguageEnhanced, View, Enhanced extends EnhancedContainer>(
  config: EnhancementConfig<Raw, LanguageEnhanced, View, Enhanced>
) {
  return declareEnhancementImpl(config);
}
