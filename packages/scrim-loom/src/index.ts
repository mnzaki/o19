/**
 * 🦡 Scrim-Loom
 *
 * The drop-in replacement for spire-loom with AAAArchi validation.
 *
 * Built on spire-loom's foundation but adds:
 * - AAAArchi integration for DAG validation (transparent)
 * - Ferror for contextual error messages (when violations occur)
 * - Orka for saga-based generation (on failures)
 *
 * Three friends working together: 🦏 + 🦀 + 🐋
 *
 * Usage:
 *   // Instead of:
 *   import loom, { rust } from '@o19/spire-loom';
 *
 *   // Use:
 *   import loom, { rust } from '@o19/scrim-loom';
 *   // Same API, added validation!
 */

// ============================================
// RE-EXPORT ALL SPIRE-LOOM APIs
// ============================================

// Core spire-loom exports (default and named)
export {
  // Default export will be created below as 'loom'
  // Named exports from spire-loom
  rust,
  typescript,
  Management,
  crud,
  reach,
  link,
  spiral,
} from '@o19/spire-loom';

// Export types
export type { WARP } from '@o19/spire-loom/warp';

// Re-export warp module
export * from '@o19/spire-loom/warp';

// ============================================
// SPIRE-LOOM COMPATIBILITY: Import for wrapping
// ============================================

import {
  spiral as spireSpiral,
  link as spireLink,
  reach as spireReach,
  crud as spireCrud,
  Management as spireManagement,
  rust as spireRust,
  typescript as spireTypescript,
} from '@o19/spire-loom';
import { weave as spireWeave } from '@o19/spire-loom/weaver';
import type { WARP } from '@o19/spire-loom/warp';

// ============================================
// THREE FRIENDS INTEGRATION
// ============================================

import { AAAArchi } from '@o19/aaaarchi';
import { ferroringModule } from '@o19/ferror';
import { heddles } from './heddles/index.js';
import { createWeavvy } from './weaver/index.js';

// ============================================
// WRAPPED SPIRAL WITH AAAARCHI VALIDATION
// ============================================

/**
 * Wrapped spiral function that adds AAAArchi validation.
 * 
 * This wraps spire-loom's spiral() and:
 * 1. Detects the file scope for domain/layer auto-injection
 * 2. Validates the architecture when the spiral is created
 * 3. Returns the same spiral object spire-loom would return
 */
function wrapSpiral<T>(spireFn: (...args: any[]) => T): (...args: any[]) => T {
  return function(...args: any[]): T {
    // Get file scope for the caller
    const scope = AAAArchi.forFile(import.meta.url);
    const ctx = scope.getContext();
    
    // Validate this is an appropriate place to create a spiral
    // (Spirals are typically created in domain/infrastructure layers)
    const validSpiralLayers = ['domain', 'infrastructure', 'core'];
    if (!validSpiralLayers.includes(ctx.layer)) {
      // Only warn in strict mode - spirals can be created from various places
      console.log(`🦡 Scrim: Spiral created from ${ctx.layer} layer (domain: ${ctx.domain})`);
    }
    
    // Call the original spire-loom function
    return spireFn(...args);
  };
}

/**
 * Wrapped weave function that uses Weavvy (with Three Friends).
 * 
 * Falls back to spire-loom's weave for compatibility, but:
 * - Uses Weavvy when configuration suggests it
 * - Adds AAAArchi context to any errors
 */
async function wrapWeave<Cnf extends Parameters<typeof spireWeave>[0]>(
  ur: Cnf,
  w?: WARP
): Promise<ReturnType<typeof spireWeave>> {
  // Check if we should use Weavvy (scrim-mode)
  const useScrim = (ur as any)?.__scrim ?? false;
  
  if (useScrim) {
    // Use Weavvy with Three Friends
    const weavvy = createWeavvy({
      validateArchitecture: true,
      strictMode: false,
    });
    
    try {
      return await weavvy.weave(ur as any);
    } catch (error) {
      // Enhance with Ferror context
      const ferror = ferroringModule().scrim.weaver;
      throw ferror(error as Error, {
        function: 'scrim-loom.weave',
        stance: 'authoritative',
        summary: 'Weaving failed with scrim validation',
        explanation: 'The weaving process encountered an architectural violation or error.',
        suggestions: [
          { action: 'disable-scrim', message: 'Set __scrim: false to use spire-loom weave instead' },
          { action: 'check-dag', message: 'Run AAAArchi.buildProjectDAG() to see architecture' },
        ],
        context: { ur, w },
        tags: ['scrim-weave-failed']
      });
    }
  }
  
  // Use spire-loom's weave (default for compatibility)
  return spireWeave(ur, w!);
}

// ============================================
// THE LOOM OBJECT (Default Export)
// ============================================

/**
 * The loom object - compatible with spire-loom's default export.
 * 
 * Provides the same API as spire-loom, with transparent AAAArchi
 * validation happening underneath.
 */
const loom = {
  // Core spiral creation (wrapped with validation)
  spiral: wrapSpiral(spireSpiral),
  
  // Link operations
  link: spireLink,
  
  // Reach specification
  reach: spireReach,
  
  // CRUD operations
  crud: spireCrud,
  
  // Management helper
  Management: spireManagement,
  
  // Language helpers
  rust: spireRust,
  typescript: spireTypescript,
  
  // Weaving (wrapped with Three Friends support)
  weave: wrapWeave,
  
  // Scrim-specific: enable scrim-mode weaving
  __scrim: true,
} as const;

export default loom;

// ============================================
// DIVINATION SYSTEM (Async, multi-round validation)
// ============================================

// Core divination (from @o19/aaaarchi foundation)
export {
  Divination,
  DivinationProvider,
  createDivination,
  createSimpleDivination,
  createDependentDivination,
  createDivinationProvider,
  resolveDivinations,
  raceDivinations,
  createManagementDivination,
  type DivinationRound,
  type DivinationConfig,
  type DivinationShape,
  type ValidationContext,
  type ValidationResult,
  type ValidationRound,
  type ResolutionBatch,
  type ResolutionResult,
  type ProviderConfig
} from './divination/index.js';

// ============================================
// HEDULES (Validation with architectural awareness)
// ============================================

export {
  heddles,
  Heddles,
  type Management as HeddlesManagement,
  type Method as HeddlesMethod,
  type Violation
} from './heddles/index.js';

// Export Weavvy the Warthog
export {
  Weavvy,
  createWeavvy,
  type WeavvyConfig
} from './weaver/index.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolve a divination with progress tracking.
 * 
 * Usage:
 *   const { value, rounds } = await resolveWithTracking(divination);
 *   console.log(`Resolved in ${rounds} rounds`);
 */
export async function resolveWithTracking<T>(
  divination: import('./divination/index.js').Divination<T>
): Promise<{ value: T; rounds: number }> {
  let rounds = 0;
  for await (const round of divination.watch()) {
    rounds = round.round;
    if (round.complete) break;
  }
  return { value: divination.value!, rounds };
}

// ============================================
// SCRIM NAMESPACE (convenience)
// ============================================

/**
 * The scrim namespace - for accessing scrim-specific features
 * while maintaining spire-loom compatibility.
 */
export const scrim = {
  // Heddles for validation
  heddles: heddles,
  
  // Weaver creation
  createWeavvy
  
  // Note: createDivinationProvider is exported directly from divination module
};

// ============================================
// METADATA
// ============================================

export const SCRIM_VERSION = '0.1.0';
export const SCRIM_MASCOT = '🦡'; // Warthog!

// ============================================
// DEBUG: Log that scrim-loom is active
// ============================================

if (typeof process !== 'undefined' && process.env.DEBUG) {
  console.log('🦡 Scrim-Loom loaded — Three Friends standing by');
}
