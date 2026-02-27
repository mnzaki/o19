/**
 * Tieups 🔧
 *
 * "The tie-up connects the treadle to the harness."
 *
 * Tieups attach custom treadles to layers. The treadles are discovered
 * during plan building and added to the generator matrix.
 *
 * @example
 * ```typescript
 * // Attach a declarative treadle to a layer
 * const myTreadle = declareTreadle({...});
 * const foundframe = loom.spiral(Foundframe)
 *   .tieup({ treadles: [{ treadle: myTreadle, warpData: {} }] });
 * ```
 */

import type { Layer } from './layers.js';
import type { GeneratorFunction } from '../machinery/heddles/index.js';
import type { TreadleDefinition } from '../machinery/treadle-kit/declarative.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported treadle types for tieups.
 * - GeneratorFunction: Result of generateFromTreadle()
 * - TreadleDefinition: Result of declareTreadle()
 */
export type TieupTreadle = GeneratorFunction | TreadleDefinition;

/**
 * @deprecated Use TieupTreadle instead. Old CustomTreadle API is no longer supported.
 */
export type CustomTreadle = never;

/**
 * A treadle entry with its own warpData.
 */
export interface TreadleEntry {
  /** 
   * The treadle to execute.
   * Can be a TreadleDefinition (from declareTreadle).
   */
  treadle: TieupTreadle;
  /** Data passed to this specific treadle */
  warpData?: { [key: string]: unknown };
}

/**
 * Configuration for a tieup.
 */
export interface TieupConfig {
  /** The source layer (if different from target) */
  source?: Layer;
  /** Custom treadles to register in the matrix */
  treadles: TreadleEntry[];
}

/**
 * A stored tieup on a layer.
 * @internal
 */
export interface StoredTieup {
  /** Source layer providing structure */
  source: Layer;
  /** Target layer where files are generated (always the layer this is stored on) */
  target: Layer;
  /** Configuration */
  config: Omit<TieupConfig, 'source'>;
}

// ============================================================================
// Storage
// ============================================================================

/**
 * Symbol for storing tieups on layers.
 * Private - use the public API instead.
 */
const TIEUPS_KEY = Symbol('loom:tieups');

/**
 * Symbol for storing lazy tieups on layers.
 * These are applied after WARP override resolution.
 * @internal
 */
const LAZY_TIEUPS_KEY = Symbol('loom:lazyTieups');

/**
 * Lazy tieup specification (stored before context is available).
 * @internal
 */
export interface LazyTieup {
  source: Layer;
  treadles: TreadleEntry[];
}

/**
 * Get tieups attached to a layer.
 * Returns both applied tieups and lazy tieups (for backwards compatibility).
 * @internal
 */
export function getTieups(layer: Layer): StoredTieup[] {
  const applied = (layer as any)[TIEUPS_KEY] || [];
  
  // Also include lazy tieups as StoredTieup format
  const lazy = getLazyTieups(layer);
  const lazyAsStored: StoredTieup[] = lazy.map(lt => ({
    target: layer,
    source: lt.source,
    config: { treadles: lt.treadles }
  }));
  
  return [...applied, ...lazyAsStored];
}

/**
 * Add a tieup to a layer.
 * @internal
 */
export function addTieup(target: Layer, source: Layer, config: Omit<TieupConfig, 'source'>): void {
  const existing = getTieups(target);
  (target as any)[TIEUPS_KEY] = [...existing, { target, source, config }];
}

/**
 * Collect all tieups from a set of layers.
 * Used by heddles during plan building.
 * @internal
 */
export function collectAllTieups(layers: Iterable<Layer>): StoredTieup[] {
  const all: StoredTieup[] = [];
  for (const layer of layers) {
    all.push(...getTieups(layer));
  }
  return all;
}

// ============================================================================
// Lazy Tieup Storage (for WARP override support)
// ============================================================================

/**
 * Get lazy tieups stored on a layer.
 * @internal
 */
export function getLazyTieups(layer: Layer): LazyTieup[] {
  return (layer as any)[LAZY_TIEUPS_KEY] || [];
}

/**
 * Add a lazy tieup to a layer.
 * These are applied after WARP override resolution.
 * @internal
 */
export function addLazyTieup(target: Layer, source: Layer, treadles: TreadleEntry[]): void {
  const existing = getLazyTieups(target);
  (target as any)[LAZY_TIEUPS_KEY] = [...existing, { source, treadles }];
}

/**
 * Clear lazy tieups from a layer.
 * Called after they've been applied.
 * @internal
 */
export function clearLazyTieups(layer: Layer): void {
  (layer as any)[LAZY_TIEUPS_KEY] = [];
}

// ============================================================================
// Chaining API
// ============================================================================

/**
 * Tieup chaining function.
 *
 * Attaches custom treadles to be registered in the generator matrix.
 *
 * @example
 * ```typescript
 * // Use this layer as both source and target
 * const myTreadle = declareTreadle({...});
 * const foundframe = loom.spiral(Foundframe)
 *   .tieup({ treadles: [{ treadle: myTreadle, warpData: {} }] });
 *
 * // Use another layer as source
 * const front = tauri.typescript.ddd()
 *   .tieup(foundframe, { treadles: [{ treadle: myTreadle, warpData: {} }] });
 * ```
 */
export function tieup<L extends Layer>(
  this: L,
  sourceOrConfig: Layer | TieupConfig,
  maybeConfig?: TieupConfig
): L {
  // Determine source and config based on argument pattern
  let source: Layer;
  let config: TieupConfig;

  if (maybeConfig) {
    // .tieup(source, config) pattern
    source = sourceOrConfig as Layer;
    config = maybeConfig;
  } else {
    // .tieup(config) pattern - source is self
    source = this;
    config = sourceOrConfig as TieupConfig;
  }

  // Store the tieup lazily - will be applied after WARP override resolution
  // during plan building when full context is available
  addLazyTieup(this, source, config.treadles);

  return this; // Chainable
}
