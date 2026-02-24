/**
 * Refinement Decorators
 *
 * "Attach refinement layers to rings."
 *
 * Usage in loom/WARP.ts:
 *   const prisma = foundframe.typescript.prisma({...});
 *   @loom.refine.withPrisma(prisma)
 *   const front = foundframe.typescript.ddd();
 */

import type { RefinementProvider } from './types.js';
import { REFINEMENT_KEY } from './types.js';

/**
 * Attach a refinement provider to a ring.
 *
 * This is the core decorator that powers @loom.refine.withPrisma, etc.
 */
export function withRefinement<TConfig>(
  provider: RefinementProvider<TConfig>
): (target: object, propertyKey?: string | symbol) => void {
  return (target: object, propertyKey?: string | symbol) => {
    // Handle both class and property decorators
    const targetObj = propertyKey ? (target as any)[propertyKey] : target;

    if (!targetObj) {
      throw new Error(
        `@loom.refine decorator must be applied to a defined ring. ` +
        `Ensure you're using: @loom.refine.withPrisma(prisma)`
      );
    }

    // Attach refinement metadata
    const existing = Reflect.getMetadata(REFINEMENT_KEY, targetObj) || [];
    const metadata = {
      provider,
      attachedAt: new Date()
    };

    Reflect.defineMetadata(REFINEMENT_KEY, [...existing, metadata], targetObj);

    // Also store directly for non-reflect-metadata environments
    if (!targetObj[REFINEMENT_KEY]) {
      targetObj[REFINEMENT_KEY] = [];
    }
    targetObj[REFINEMENT_KEY].push(metadata);
  };
}

/**
 * Get all refinements attached to a ring.
 */
export function getRefinements(target: unknown): Array<{ provider: RefinementProvider }> {
  if (!target || typeof target !== 'object') return [];

  // Try reflect-metadata first
  const fromMetadata = Reflect.getMetadata(REFINEMENT_KEY, target);
  if (fromMetadata) return fromMetadata;

  // Fallback to direct property
  return (target as any)[REFINEMENT_KEY] || [];
}

/**
 * Check if a ring has any refinements.
 */
export function hasRefinements(target: unknown): boolean {
  return getRefinements(target).length > 0;
}

/**
 * Get a specific refinement by name.
 */
export function getRefinement(
  target: unknown,
  name: string
): RefinementProvider | undefined {
  return getRefinements(target).find(r => r.provider.name === name)?.provider;
}
