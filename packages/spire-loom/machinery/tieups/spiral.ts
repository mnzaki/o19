/**
 * Spiral Tie-Up 🔗
 *
 * The linkage layer between treadles and spiralers.
 *
 * In traditional weaving, the **tie-up** is the cord configuration that connects
 * each treadle to specific heddles. When a weaver presses a treadle, the tie-up
 * determines which warp threads lift to create the pattern.
 *
 * In spire-loom, the tie-up is where:
 * - Treadles declare their spiraler contributions (methods they add)
 * - Spiralers receive those contributions (methods they gain)
 * - The connection between intent (treadle) and potential (spiraler) is made
 *
 * ## Architecture
 *
 * ```
 * warp/spiral/           ← Pure spiraling (rings, patterns, spiralers)
 *     └── spiralers/
 *         └── android.ts ← RustAndroidSpiraler (innocent of treadles)
 *
 * machinery/
 *     ├── treadles/      ← The treadles (gen-android-service, etc.)
 *     │   └── gen-android-foreground-service.ts
 *     └── tieups/        ← THE TIE-UP!
 *         └── spiral.ts  ← How treadles tie up to spiralers
 * ```
 *
 * ## The Flow
 *
 * 1. **Discovery**: `discoverTreadles()` finds treadles in `loom/treadles/`
 * 2. **Contribution**: Each treadle may export `contributes` - methods it adds to spiralers
 * 3. **Registration**: `collectSpiralerContributions()` builds a map of spiraler → methods
 * 4. **Extension**: When a spiraler is instantiated, `applySpiralerExtensions()` adds methods
 * 5. **Usage**: User calls `foundframe.android.foregroundService()` - TypeScript knows it!
 *
 * > *"The treadle presses, the tie-up lifts, the pattern emerges."*
 */

import type { SpiralRing } from '../../warp/spiral/pattern.js';

// ============================================================================
// Contribution Definition
// ============================================================================

/**
 * A method contributed by a treadle to a spiraler.
 */
export interface SpiralerContribution<TOptions = unknown, TReturn = SpiralRing> {
  /** The spiraler class name being extended (e.g., 'RustAndroidSpiraler') */
  spiraler: string;

  /** The method name being contributed (e.g., 'foregroundService') */
  method: string;

  /** Type of the options parameter (for documentation/intellisense) */
  optionsType?: string;

  /** Return type (usually the spiraler itself for chaining) */
  returnType?: string;

  /** Description of what this method does */
  description?: string;
}

/**
 * Define a contribution to a spiraler's API.
 *
 * Treadles export this to declare what methods they add to spiralers.
 *
 * @example
 * ```typescript
 * // In loom/treadles/gen-android-foreground-service.ts
 * import { defineSpiralerContribution } from '@o19/spire-loom/machinery/tieups/spiral';
 *
 * export const treadle = defineTreadle({...});
 *
 * export const contributes = defineSpiralerContribution({
 *   spiraler: 'RustAndroidSpiraler',
 *   method: 'foregroundService',
 *   optionsType: 'ForegroundServiceOptions',
 *   returnType: 'RustAndroidSpiraler',
 *   description: 'Wrap the core with an Android foreground service'
 * });
 * ```
 */
export function defineSpiralerContribution<TOptions = unknown, TReturn = SpiralRing>(
  contribution: SpiralerContribution<TOptions, TReturn>
): SpiralerContribution<TOptions, TReturn> {
  return contribution;
}

// ============================================================================
// Type-Level Extension Registry
// ============================================================================

/**
 * Type-level registry of spiraler extensions.
 *
 * This interface is augmented by each treadle module via declaration merging
 * to declare the methods they contribute to spiralers.
 *
 * @example
 * ```typescript
 * // In loom/treadles/gen-android-foreground-service.ts
 * declare module '@o19/spire-loom/machinery/tieups/spiral' {
 *   interface SpiralerExtensionRegistry {
 *     RustAndroidSpiraler: {
 *       foregroundService(options?: ForegroundServiceOptions): RustAndroidSpiraler;
 *     };
 *   }
 * }
 * ```
 */
export interface SpiralerExtensionRegistry {
  // Extended by treadle modules via declaration merging
}

/**
 * Helper type to get extensions for a specific spiraler.
 *
 * Usage in spiraler classes:
 * ```typescript
 * // warp/spiral/spiralers/android.ts
 * interface RustAndroidSpiraler extends SpiralerExtensions<'RustAndroidSpiraler'> {}
 * ```
 */
export type SpiralerExtensions<TSpiraler extends keyof SpiralerExtensionRegistry> =
  SpiralerExtensionRegistry[TSpiraler];

// ============================================================================
// Runtime Contribution Collection
// ============================================================================

/**
 * Collected contribution at runtime during discovery.
 */
export interface RuntimeSpiralerContribution {
  /** Treadle that contributed this */
  treadleName: string;
  /** Source file path */
  sourcePath: string;
  /** The contribution metadata */
  contribution: SpiralerContribution;
}

/**
 * Runtime registry mapping spiraler names to their contributions.
 */
export type SpiralerContributionMap = Map<string, RuntimeSpiralerContribution[]>;

/**
 * Collect contributions from discovered treadles.
 *
 * Called during `createMatrixWithDiscovery()` to build the runtime registry
 * of which treadles contribute which methods to which spiralers.
 *
 * @param discovered - Array of discovered treadles with contributions
 * @returns Map of spiraler name → contributions
 */
export function collectSpiralerContributions(
  discovered: Array<{ name: string; sourcePath: string; contributes?: SpiralerContribution }>
): SpiralerContributionMap {
  const map: SpiralerContributionMap = new Map();

  for (const treadle of discovered) {
    if (treadle.contributes) {
      const { spiraler } = treadle.contributes;
      if (!map.has(spiraler)) {
        map.set(spiraler, []);
      }
      map.get(spiraler)!.push({
        treadleName: treadle.name,
        sourcePath: treadle.sourcePath,
        contribution: treadle.contributes,
      });
    }
  }

  return map;
}

// ============================================================================
// Extension Application
// ============================================================================

/**
 * Apply collected contributions to a spiraler instance.
 *
 * This is called at runtime to actually add the contributed methods
 * to a spiraler instance.
 *
 * @param spiraler - The spiraler instance to extend
 * @param spiralerName - The class name of the spiraler
 * @param contributions - Map of all collected contributions
 * @param methodImplementations - Map of method name → implementation
 */
export function applySpiralerExtensions(
  spiraler: Record<string, unknown>,
  spiralerName: string,
  contributions: SpiralerContributionMap,
  methodImplementations: Map<string, (...args: unknown[]) => unknown>
): void {
  const spiralerContributions = contributions.get(spiralerName);
  if (!spiralerContributions) return;

  for (const { contribution } of spiralerContributions) {
    const implementation = methodImplementations.get(contribution.method);
    if (implementation) {
      // Bind the method to the spiraler instance
      spiraler[contribution.method] = implementation.bind(spiraler);
    }
  }
}

// ============================================================================
// Common Option Types
// ============================================================================

/**
 * Base options for service wrapper methods.
 */
export interface ServiceWrapperOptions {
  /** Name affix for the generated service (e.g., 'radicle') */
  nameAffix?: string;
}

/**
 * Options for Android foreground service.
 */
export interface ForegroundServiceOptions extends ServiceWrapperOptions {
  /** Android gradle namespace (e.g., 'ty.circulari.o19') */
  gradleNamespace?: string;
  /** Notification channel configuration */
  notification?: {
    title?: string;
    text?: string;
  };
}

/**
 * Options for Tauri plugin generation.
 */
export interface TauriPluginOptions extends ServiceWrapperOptions {
  /** Plugin-specific configuration */
  permissions?: string[];
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

export type { SpiralRing } from '../../warp/spiral/pattern.js';
