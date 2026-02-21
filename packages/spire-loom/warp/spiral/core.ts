/**
 * Core Ring Implementations
 *
 * Concrete implementations of SpiralRing for different core types.
 */

import { SpiralRing, spiralOut, type SpiralOutType, type Spiralers } from './pattern.js';
import { AndroidSpiraler, DesktopSpiraler } from './spiralers/index.js';

/**
 * Metadata about a core ring.
 */
export interface CoreMetadata {
  /** The language/runtime of this core */
  language: 'rust' | 'go' | 'cpp' | string;
  /** The type of core */
  type: 'core';
  /** Default package name for this core */
  packageName: string;
  /** Crate name for Rust cores */
  crateName?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Abstract base for all core rings.
 * Cores are the innermost rings that provide the domain logic.
 */
export abstract class CoreRing extends SpiralRing {
  /**
   * Get the spiralers available for this core.
   * Each core type (Rust, Go, etc.) provides its own set of spiralers
   * that know how to wrap/adapt this core.
   */
  abstract getSpiralers(): Spiralers;

  /**
   * Get metadata about this core.
   */
  abstract getMetadata(): CoreMetadata;
}

/**
 * Rust Core implementation.
 * The standard core for o19-foundframe.
 */
export class RustCore extends CoreRing {
  constructor(
    public options: {
      packageName?: string;
      crateName?: string;
    } = {}
  ) {
    super();
  }

  getSpiralers(): Spiralers {
    const spiralers: Spiralers = {
      android: new AndroidSpiraler(this),
      desktop: new DesktopSpiraler(this),
      // Note: tauri is NOT here - it's added via multiplexed spiral
    };
    return spiralers;
  }

  getMetadata(): CoreMetadata {
    return {
      language: 'rust',
      type: 'core',
      packageName: this.options.packageName ?? 'foundframe',
      crateName: this.options.crateName ?? 'o19-foundframe',
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

/**
 * Create a core spiral (the first ring in any spiral architecture).
 * The core provides spiralers that know how to wrap it.
 * 
 * Usage:
 *   const foundframe = loom.spiral(loom.rustCore());
 *   // foundframe.android.foregroundService()
 *   // foundframe.desktop.direct()
 */
export function spiralCore(core: CoreRing): SpiralOutType {
  return spiralOut(core, core.getSpiralers()) as SpiralOutType;
}
