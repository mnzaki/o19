/**
 * The Bobbin 🧵
 * 
 * Thread storage, transformation rules, and code generation.
 * 
 * The bobbin holds what becomes code:
 * - Templates (EJS)
 * - Type mappings (TS → Kotlin/Rust/AIDL)
 * - Transform rules (Management → Language-specific)
 * - High-level generation API
 */

// Type mappings: TS → Platform types
export {
  getTypeMapping,
  mapToKotlinType,
  mapToJniType,
  mapToRustType,
  mapToTauriType,
  generateJniToRustConversion,
  generateRustToJniConversion,
  getJniErrorValue,
  isPrimitiveType,
  getSerializationStrategy,
  registerTypeMapping,
  type TypeMapping,
} from './type-mappings.js';

// Code generation: high-level API for treadles
export {
  generateCode,
  generateBatch,
  renderTemplate,
  detectLanguage,
  type RawMethod,
  type TransformedMethod,
  type Language,
  type GenerateOptions,
  type GenerationTask,
  type RenderTemplateOptions,
} from './code-generator.js';

// Gradle blocks: pre-wound configuration
export { getRustBuildBlock } from './gradle-blocks.js';
