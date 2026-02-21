/**
 * Heddles
 *
 * Pattern matching for the loom. The heddles raise and lower warp threads,
 * matching spiral patterns against the generator matrix to determine
 * what code to generate.
 */

export {
  Heddles,
  GeneratorMatrix,
  DEFAULT_MATRIX,
  createHeddles,
  ensurePlanComplete,
  type SpiralEdge,
  type SpiralNode,
  type GenerationTask,
  type WeavingPlan,
  type GeneratorFunction,
  type GeneratedFile,
  type GeneratorContext,
} from './pattern-matcher.js';
