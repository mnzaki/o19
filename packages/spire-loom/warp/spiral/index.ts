/**
 * Spiral Creation
 *
 * The spiral() function is the entry point for creating the architecture.
 * It requires a core ring as its first argument.
 *
 * Usage:
 *   const foundframe = loom.spiral(loom.rustCore());           // Core with Rust
 *   const android = foundframe.android.foregroundService();      // Android ring
 *   const desktop = foundframe.desktop.direct();                 // Desktop ring
 *   const tauri = loom.spiral(android, desktop).tauri.plugin();  // Tauri aggregates
 */

import * as spiralers from './spiralers/index.js';
import * as p from './pattern.js';
import type * as i from './pattern.js';
import { ExternalLayer } from '../imprint.js';
import { RustExternalLayer, RUST_STRUCT_MARK } from '../rust.js';

export * from './pattern.js';
export * from './spiralers/index.js';

// import type { MgmtTranslator } from '../imprint.js';

/**
 * Core Ring Implementations
 *
 * Concrete implementations of SpiralRing for different core types.
 */

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
    android: spiralers.AndroidSpiraler;
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
    } = {}
  ) {
    super(layer, layer as any); // layer is both the layer and the core data
  }

  getSpiralers() {
    return {
      android: new spiralers.AndroidSpiraler(this),
      desktop: new spiralers.DesktopSpiraler(this)
      // Note: tauri is NOT here - it's added via multiplexed spiral
    };
  }

  getMetadata(): RustCoreMetadata {
    // Derive from layer class name if not provided in options
    const layerName =
      (this.layer as any)?.name || (this.layer?.constructor as any)?.name || 'unknown';

    // Convert class name to package name (e.g., Foundframe -> foundframe)
    const derivedName = layerName.charAt(0).toLowerCase() + layerName.slice(1);

    const packageName = this.options.packageName || derivedName;
    const crateName = this.options.crateName || `o19-${derivedName}`;

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

// ============================================================================
// Spiral Functions
// ============================================================================

/**
 * Create a core spiral (the first ring in any spiral architecture).
 * The core provides spiralers that know how to wrap it.
 *
 * Usage:
 *   const foundframe = loom.spiral(loom.rustCore());
 *   // foundframe.android.foregroundService()
 *   // foundframe.desktop.direct()
 */
export function spiralCore<S extends Partial<i.Spiralers>>(
  core: i.CoreRing<S>
): i.SpiralOutType<S> {
  return p.spiralOut(core, core.getSpiralers()) as i.SpiralOutType<S>;
}

/**
 * Create a spiral from a @rust.Struct decorated class.
 * This is the most common way to create a core spiral.
 *
 * Usage:
 *   @rust.Struct
 *   class Foundframe { ... }
 *   const foundframe = spiral(Foundframe);
 *   // foundframe.inner.core.thestream
 *   // foundframe.android.foregroundService()
 */
export function spiral<T extends new (...args: any[]) => any>(
  structClass: T & { [RUST_STRUCT_MARK]?: true }
): i.SpiralOutType<
  { android: spiralers.AndroidSpiraler; desktop: spiralers.DesktopSpiraler },
  RustCore<InstanceType<T>, T>
>;

/**
 * Create a spiral from a RustExternalLayer (e.g., a @rust.Struct class).
 * This overload provides proper typing for the core's struct fields.
 */
export function spiral<T extends new (...args: any[]) => any>(
  core: T
): p.SpiralOutType<
  { android: spiralers.AndroidSpiraler; desktop: spiralers.DesktopSpiraler },
  RustCore<InstanceType<T>, T>
>;

/**
 * Create a spiral from an ExternalLayer instance.
 *
 * Usage:
 *   const foundframe = spiral(myCustomCore());
 */
export function spiral(core: ExternalLayer): i.SpiralOutType;

/**
 * Create a multiplexed spiral wrapping multiple rings.
 * Used for Tauri to aggregate Android + Desktop.
 *
 * Usage:
 *   const tauri = spiral(android, desktop);
 */
export function spiral(
  ...innerRings: i.SpiralRing[]
): i.SpiralMuxType<{ tauri: spiralers.TauriSpiraler }>;

// Implementation
export function spiral(...innerRings: unknown[]) {
  if (innerRings.length === 1) {
    const ring = innerRings[0];
    if (ring instanceof p.CoreRing) {
      return spiralCore(ring);
    } else if (ring instanceof p.SpiralRing) {
      return ring;
    } else if (RustExternalLayer.isRustStruct(ring)) {
      // ring is a class constructor decorated with @rust.Struct
      const core = rustCore(ring as unknown as RustExternalLayer);
      return spiralCore(core);
    } else if (ring instanceof RustExternalLayer) {
      const core = rustCore(ring);
      return spiralCore(core);
    } else {
      throw new Error(
        `Cannot spiral from ${typeof ring}: ${ring?.constructor?.name || ring}. Expected CoreRing, SpiralRing, or @rust.Struct class.`
      );
    }
  }

  // Otherwise creates a spiral multiplexer
  const innerRingsArr = innerRings as i.SpiralRing[];
  const mux = p.spiralMux(innerRingsArr, {
    tauri: new spiralers.TauriSpiraler(innerRingsArr)
  });
  return mux;
}

spiral.rust = {
  core: rustCore
};

export default spiral;
