/**
 * Divination Module 🌀
 * 
 * Async, multi-round computation for architectural validation.
 * 
 * Re-exports from @o19/aaaarchi with scrim-loom specific additions.
 * 
 * The core Divination Engine lives in AAAArchi (the foundation).
 * Scrim-loom adds the integration with Heddles for Management validation.
 */

// ============================================================================
// RE-EXPORTS FROM AAAARCHI (Foundation Layer)
// ============================================================================

export {
  // Core divination
  Divination,
  createDivination,
  createSimpleDivination,
  createDependentDivination,
  
  // Types
  type DivinationRound,
  type DivinationConfig,
  type DivinationShape,
  type ValidationContext,
  type ValidationResult,
  type ValidationRound,
} from '@o19/aaaarchi';

export {
  // Provider for batch resolution
  DivinationProvider,
  createDivinationProvider,
  resolveDivinations,
  raceDivinations,
  
  // Types
  type ResolutionBatch,
  type ResolutionResult,
  type ProviderConfig,
} from '@o19/aaaarchi';

// ============================================================================
// SCRIM-LOOM SPECIFIC INTEGRATION
// ============================================================================

/**
 * Creates a Divination from a Management object.
 * 
 * This is scrim-loom specific - it knows about:
 * - Management structure (name, layer, domain, methods)
 * - Heddles validation logic
 * - AAAArchi DAG validation
 * 
 * @example
 * ```typescript
 * const divination = createManagementDivination(management, {
 *   lang: typescript,
 *   tags: ['service', 'validation']
 * });
 * 
 * const result = await divination.resolve();
 * if (result._violations?.length > 0) {
 *   // Handle violations
 * }
 * ```
 */
export { createManagementDivination } from './heddles-integration.js';
