/**
 * Refinement Decorators
 *
 * "Attach refinement layers to rings."
 *
 * This module exports the @loom.refine.* decorators.
 */

import { withRefinement } from './decorator.js';
import { withPrisma } from './prisma.js';
import type { PrismaRefinementConfig } from './prisma.js';

// Export types
export type {
  RefinementProvider,
  RefinementMetadata,
  RefinementResult,
  WeavingContext,
} from './types.js';

// Export constants
export { REFINEMENT_KEY } from './types.js';

// Export decorator functions
export {
  withRefinement,
  getRefinements,
  hasRefinements,
  getRefinement,
} from './decorator.js';

/**
 * The refine namespace — all refinement decorators.
 *
 * Usage:
 *   import { loom } from '@o19/spire-loom/warp';
 *
 *   const prisma = foundframe.typescript.prisma({...});
 *   @loom.refine.withPrisma(prisma)
 *   const front = foundframe.typescript.ddd();
 */
export const refine = {
  /**
   * Attach a Prisma refinement to a ring.
   *
   * The Prisma client will be available in loom/*.ts for @loom.crud.query
   * decorators with full autocomplete.
   */
  withPrisma,

  /**
   * Generic refinement attachment (for custom refinements).
   */
  withRefinement,
} as const;

// Export individual functions and types for direct import
export { withPrisma };
export type { PrismaRefinementConfig };
