/**
 * The Bobbin 🧵
 *
 * Thread storage, transformation rules, and code generation.
 *
 * The bobbin holds what becomes code:
 * - Templates (MEJS/EJS)
 * - Code printing and generation
 *
 * Note: Type mappings and Android/Gradle helpers have moved:
 * - Type mappings → enhancement system (use entity.rs.fields[i].type)
 * - Android helpers → shuttle/hookup-manager.ts
 * - Gradle blocks → shuttle/gradle-blocks.ts
 *
 * @module machinery/bobbin
 */

// ============================================================================
// Private Imports (implementation details)
// ============================================================================

import {
  generateCode as _generateCode,
  generateBatch as _generateBatch,
  renderTemplate as _renderTemplate,
  detectLanguage as _detectLanguage,
} from './code-printer.js';

// ============================================================================
// Public API: Types (re-exported)
// ============================================================================

export type {
  MethodLink,
  RawMethod,
  TransformedMethod,
  Language,
  GenerateOptions,
  GenerationTask,
  RenderTemplateOptions,
} from './code-printer.js';

// ============================================================================
// Public API: Functions
// ============================================================================

/**
 * Generate code from a template with full options.
 */
export const generateCode = _generateCode;

/**
 * Generate multiple files in a batch.
 */
export const generateBatch = _generateBatch;

/**
 * Render a template with data.
 */
export const renderTemplate = _renderTemplate;

/**
 * Detect language from template filename.
 */
export const detectLanguage = _detectLanguage;
