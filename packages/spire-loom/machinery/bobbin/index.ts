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
// Public API: re-exported
// ============================================================================

export { generateCode, generateBatch, renderTemplate, detectLanguage } from './code-printer.js';

export * as mejs from './mejs.js';

// ============================================================================
// Public API: Types (re-exported)
// ============================================================================

export type {
  MethodLink,
  TransformedMethod,
  Language,
  GenerateOptions,
  GenerationTask,
  RenderTemplateOptions
} from './code-printer.js';
