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
import { RustExternalLayer } from '../rust.js';

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
 */
export class RustCore extends p.CoreRing<{
  android: spiralers.AndroidSpiraler;
  desktop: spiralers.DesktopSpiraler;
}> {
  constructor(
    public options: {
      structs?: Record<string, any>;
      packageName?: string;
      crateName?: string;
    } = {}
  ) {
    super();
  }

  getSpiralers() {
    return {
      android: new spiralers.AndroidSpiraler(this),
      desktop: new spiralers.DesktopSpiraler(this)
      // Note: tauri is NOT here - it's added via multiplexed spiral
    };
  }

  getMetadata(): RustCoreMetadata {
    // TODO get packageName and crateName from heddles if we don't have them in
    // options
    let packageName = this.options.packageName || '';
    let crateName = this.options.crateName || '';

    return {
      language: 'rust',
      packageName,
      crateName
    };
  }
}

/**
 * Factory function for creating a Rust core.
 * Usage: loom.spiral(loom.rustCore())
 */
export function rustCore(options?: ConstructorParameters<typeof RustCore>[0]): RustCore {
  return new RustCore(options);
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
  core: p.CoreRing<S>
): i.SpiralOutType<S> {
  return p.spiralOut(core, core.getSpiralers()) as i.SpiralOutType<S>;
}

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

/**
 * Create a spiral from an ExternalLayer
 *
 * Usage:
 *   const foundframe = spiral(myCustomCore());
 */
export function spiral(core: ExternalLayer): i.SpiralOutType;

// Implementation
export function spiral<S extends Partial<i.Spiralers>>(
  ...innerRings: (ExternalLayer | i.CoreRing<S> | i.SpiralRing)[]
): any {
  if (innerRings.length === 1) {
    if (innerRings[0] instanceof p.CoreRing) {
      return spiralCore(innerRings[0]);
    } else if (innerRings[0] instanceof RustExternalLayer) {
      return rustCore(innerRings[0]);
    } else if (innerRings[0] instanceof p.SpiralRing) {
      return innerRings[0];
    } else {
      throw new Error('wat are u doin');
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
