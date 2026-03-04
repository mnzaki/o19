/**
 * Reed Enhanced 🌀
 *
 * "Read enhanced" - Enhanced entities and methods for code generation.
 *
 * This module provides the public API for language-specific enhancement.
 * Implementation details are in sibling modules - never import from them directly.
 *
 * @module machinery/reed/enhanced
 */

// ============================================================================
// Public API: Types (re-exported from implementation)
// ============================================================================

export type {
  // Enhancement system types
  EnhancementConfig,
  EnhancedContainer,
  EnhancementSystem
} from './enhancement.js';

export type {
  // Method types
  ParamView,
  ParamViews,
  LanguageView,
  EnhancedMethod
} from './methods.js';

export type {
  // Entity types
  EntityFieldView,
  EntityLanguageView,
  EnhancedEntity,
  RawEntity,
  RawEntityField,
  LanguageEntity,
  LanguageEntityField
} from './entities.js';

// ============================================================================
// Public API: Enhancement Declarer
// ============================================================================

export { declareEnhancement } from './enhancement.js';

// ============================================================================
// Public API: Method Enhancement
// ============================================================================

export {
  enhanceMethod,
  enhanceMethods,
  createLanguageView,
  createEnhancedMethod,
  isEnhanced
} from './methods.js';

// ============================================================================
// Public API: Entity Enhancement
// ============================================================================

export {
  enhanceEntity,
  enhanceEntities,
  createEntityLanguageView,
  createEnhancedEntity,
  entityEnhancement
} from './entities.js';
