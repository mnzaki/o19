/**
 * Tieups 🔧
 *
 * "The tie-up connects the treadle to the harness."
 *
 * Tieups generate code inside a layer's package using a source layer's
 * structure. The target is always `this` (where code is generated).
 * The source can be `this` (implicit) or another layer (explicit).
 *
 * @example
 * ```typescript
 * // Generate code in foundframe using foundframe itself as source
 * const foundframe = loom.spiral(Foundframe)
 *   .tieup({ treadles: [{ treadle: dbBindingTreadle, warpData: { entities: ['User'] } }] });
 *
 * // Generate code in front layer using foundframe as source
 * const front = tauri.typescript.ddd()
 *   .tieup(foundframe, { treadles: [{ treadle: typeGenTreadle, warpData: { entities: ['User'] } }] });
 * ```
 */

import type { Layer } from './layers.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Custom treadle function.
 * Generates files inside a layer's package.
 */
export type CustomTreadle = (context: TreadleContext) => Promise<TreadleResult>;

/**
 * A treadle entry with its own warpData.
 */
export interface TreadleEntry {
  /** The treadle to execute */
  treadle: CustomTreadle;
  /** Data passed to this specific treadle */
  warpData: { [key: string]: unknown };
}

/**
 * Context passed to custom treadles.
 */
export interface TreadleContext {
  /** The source layer providing structure/data */
  source: Layer;
  /** The target layer where files are generated */
  target: Layer;
  /** Configuration from .tieup() call */
  config: Record<string, unknown>;
  /** Package path (e.g., "o19/crates/foundframe") */
  packagePath: string;
  /** Additional utilities */
  utils: TreadleUtils;
}

/**
 * Utilities available to custom treadles.
 */
export interface TreadleUtils {
  /** Write a file to the target's package */
  writeFile: (relativePath: string, content: string) => Promise<void>;
  /** Read a file from the target's package */
  readFile: (relativePath: string) => Promise<string | null>;
  /** Update a file (read → modify → write) */
  updateFile: (relativePath: string, updater: (content: string) => string) => Promise<void>;
  /** Check if file exists */
  fileExists: (relativePath: string) => Promise<boolean>;
}

/**
 * Result from a custom treadle.
 */
export interface TreadleResult {
  /** Files that were generated */
  generatedFiles: string[];
  /** Files that were modified */
  modifiedFiles?: string[];
  /** Any errors that occurred */
  errors?: string[];
}

/**
 * Configuration for a tieup.
 */
export interface TieupConfig {
  /** The source layer (if different from target) */
  source?: Layer;
  /** Custom treadles to execute, each with its own warpData */
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
 * Get tieups attached to a layer.
 * @internal
 */
export function getTieups(layer: Layer): StoredTieup[] {
  return (layer as any)[TIEUPS_KEY] || [];
}

/**
 * Add a tieup to a layer.
 * @internal
 */
export function addTieup(target: Layer, source: Layer, config: Omit<TieupConfig, 'source'>): void {
  const existing = getTieups(target);
  (target as any)[TIEUPS_KEY] = [...existing, { target, source, config }];
}

// ============================================================================
// Chaining API
// ============================================================================

/**
 * Tieup chaining function.
 *
 * Attaches custom treadles to generate code in this layer's package.
 *
 * @example
 * ```typescript
 * // Use this layer as both source and target
 * const foundframe = loom.spiral(Foundframe)
 *   .tieup({ treadles: [{ treadle: dbBindingTreadle, warpData: {} }] });
 *
 * // Use another layer as source
 * const front = tauri.typescript.ddd()
 *   .tieup(foundframe, { treadles: [{ treadle: typeGenTreadle, warpData: {} }] });
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

  // Store the tieup on the target (this)
  const { source: _, ...configWithoutSource } = config;
  addTieup(this, source, configWithoutSource);

  return this; // Chainable
}

// ============================================================================
// Weaver Integration
// ============================================================================

/**
 * Execute all tieups for a layer.
 *
 * Called by the weaver during generation.
 *
 * @internal
 */
export async function executeTieups(
  layer: Layer,  // Only Layers can have executed tieups (they have package paths)
  packagePath: string,
  utils: TreadleUtils
): Promise<{ generated: string[]; modified: string[]; errors: string[] }> {
  const tieups = getTieups(layer);
  const generated: string[] = [];
  const modified: string[] = [];
  const errors: string[] = [];

  for (const { source, config } of tieups) {
    const treadles = config.treadles || [];

    for (const entry of treadles) {
      try {
        const context: TreadleContext = {
          source,
          target: layer,
          config: entry.warpData,
          packagePath,
          utils
        };

        const result = await entry.treadle(context);

        generated.push(...result.generatedFiles);
        if (result.modifiedFiles) {
          modified.push(...result.modifiedFiles);
        }
        if (result.errors) {
          errors.push(...result.errors);
        }
      } catch (err) {
        errors.push(`Treadle error: ${(err as Error).message}`);
      }
    }
  }

  return { generated, modified, errors };
}
