/**
 * @o19/aaaarchi
 * 
 * 🦏 Architecture Annotating Aardvark Archi
 * 
 * The foundation layer: maps structure, builds DAG, provides architectural metadata.
 * 
 * Usage:
 *   import { AAAArchi } from '@o19/aaaarchi';
 *   
 *   const scope = AAAArchi.forFile(import.meta.url);
 *   const ctx = scope.getContext();  // { domain, layer, canDependOn, ... }
 *   
 *   if (!scope.canCall('repository')) {
 *     // Architectural violation!
 *   }
 */

// Core API
export { AAAArchi } from './aaaarchi.js';

// Compiler - Declarative to Imperative transformation
export {
  compileToImperative,
  compileContextValidator,
  compileChainValidator,
  compileSuggestionsGenerator,
  clearCompilationCache,
  type ImperativeArchitecture,
  type PathValidationResult,
  type PathViolation,
} from './compiler.js';

// Utility functions for DAG analysis, path finding, suggestions
export {
  // Path finding
  findLayerPath,
  findAllLayerPaths,
  
  // Suggestions
  generateSuggestions,
  type ViolationSuggestion,
  
  // Context enrichment
  enrichContext,
  type EnrichedContext,
  
  // DAG analysis
  analyzeDAG,
  type DAGAnalysis,
  
  // Visualization
  toMermaid,
  toTreeView,
} from './utils.js';

// All types
export type * from './types.js';

// Divination Engine - Async multi-round computation
export {
  Divination,
  createDivination,
  createSimpleDivination,
  createDependentDivination,
  type DivinationRound,
  type DivinationConfig,
  type DivinationShape,
  type ValidationContext,
  type ValidationResult,
  type ValidationRound,
} from './divination.js';

// Divination Provider - Batch resolution
export {
  DivinationProvider,
  createDivinationProvider,
  resolveDivinations,
  raceDivinations,
  type ResolutionBatch,
  type ResolutionResult,
  type ProviderConfig,
} from './divination-provider.js';

// Re-export for convenience
export { AAAArchi as default } from './aaaarchi.js';
