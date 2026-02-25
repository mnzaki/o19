/**
 * Rust Spiral
 *
 * Rust-specific spiral implementation for the weave graph.
 */

import * as spiralers from './spiralers/index.js';
import * as p from './pattern.js';
import type { RustExternalLayer } from '../rust.js';

export interface RustCoreMetadata {
  language: 'rust';
  packageName: string;
  crateName: string;
}

/**
 * Rust Core implementation.
 * The standard core for o19-foundframe.
 *
 * Usage:
 *   new RustCore(Foundframe)  // layer first, then options
 *   new RustCore(Foundframe, { packageName: 'foundframe' })
 */
export class RustCore<
  Layer extends RustExternalLayer = RustExternalLayer,
  StructClass = Layer
> extends p.CoreRing<
  {
    android: spiralers.RustAndroidSpiraler;
    desktop: spiralers.DesktopSpiraler;
  },
  Layer,
  Layer & StructClass
> {
  declare core: Layer & StructClass;

  constructor(
    layer: Layer,
    public options: {
      packageName?: string;
      crateName?: string;
      packagePath?: string; // Path to the crate directory
    } = {}
  ) {
    // Metadata is enriched by heddles from export name after loadWarp sets .name
    // We set language here so it's available immediately; heddles will add packageName/path
    super(layer, layer as any, { language: 'rust' } as any);
    
    // Ensure layer has a name - use constructor name as fallback
    // This handles cases like loom.spiral.tauri where layer is created inline
    const layerAny = layer as any;
    if (layerAny.name === undefined && layerAny.constructor?.name) {
      layerAny.name = layerAny.constructor.name;
    }
  }

  getSpiralers() {
    return {
      android: new spiralers.RustAndroidSpiraler(this),
      desktop: new spiralers.DesktopSpiraler(this)
      // Note: tauri is NOT here - it's added via multiplexed spiral
    };
  }

  getMetadata(): RustCoreMetadata {
    // Use layer.name (set by loadWarp from export name) or fall back to constructor name
    const layerName = this.layer.name || (this.layer?.constructor as any)?.name || 'unknown';

    const packageName = this.options.packageName || layerName;
    const crateName = this.options.crateName || layerName;

    return {
      language: 'rust',
      packageName,
      crateName
    };
  }
}

/**
 * Factory function for creating a Rust core.
 * Usage: loom.spiral(loom.rustCore(Foundframe))
 */
export function rustCore(
  layer: RustExternalLayer,
  options?: { packageName?: string; crateName?: string }
): RustCore {
  return new RustCore(layer, options);
}
