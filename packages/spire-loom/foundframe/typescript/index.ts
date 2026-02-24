/**
 * Foundframe TypeScript Generators
 *
 * "The TypeScript surface of the foundframe architecture."
 */

import { withPrisma, type PrismaRefinementConfig } from '../../warp/refine/prisma.js';

/**
 * Create a Prisma refinement configuration.
 *
 * Usage in loom/WARP.ts:
 *   import { foundframe } from '@o19/spire-loom/warp';
 *
 *   const prisma = foundframe.typescript.prisma({
 *     schema: './prisma/schema.prisma',
 *     databaseUrl: 'file:./data.db'
 *   });
 *
 *   @loom.refine.withPrisma(prisma)
 *   const front = foundframe.typescript.ddd();
 */
export function prisma(config: PrismaRefinementConfig) {
  return withPrisma(config);
}

/**
 * Placeholder for DDD ring generator.
 * (To be implemented)
 */
export function ddd(): any {
  throw new Error('foundframe.typescript.ddd() not yet implemented');
}

/**
 * Placeholder for API ring generator.
 * (To be implemented)
 */
export function api(): any {
  throw new Error('foundframe.typescript.api() not yet implemented');
}
