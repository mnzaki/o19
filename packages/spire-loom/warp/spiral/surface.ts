/**
 * Surface Ring
 *
 * Surface rings represent end-user applications (not libraries/crates).
 * They map to the apps/ directory instead of crates/ or packages/.
 *
 * "The surface is where users touch the spiral."
 *
 * Usage:
 *   const myApp = loom.spiral.surface({
 *     name: 'MyTauriApp',
 *     template: 'tauri-sveltekit'
 *   });
 */

import * as p from './pattern.js';

export interface SurfaceMetadata {
  language: 'typescript' | 'rust';
  packageName: string;
  /** Surface apps live in apps/ not crates/ or packages/ */
  surfaceType: 'app';
}

/**
 * SurfaceRing represents an end-user application.
 * 
 * Unlike CoreRing (crates/) or TsCore (packages/), SurfaceRing
 * maps to the apps/ directory - a place for runnable applications
 * that users interact with directly.
 */
export class SurfaceRing extends p.SpiralRing {
  /** Internal storage for the name property */
  private _name?: string;

  constructor(
    public options: {
      name?: string;
      language?: 'typescript' | 'rust';
      template?: string;
    } = {},
    /** The inner ring this surface app wraps (typically SpiralOut) */
    public inner?: p.SpiralRing
  ) {
    super();
    
    // Set default language
    const language = options.language || 'typescript';
    
    // Set metadata immediately so it's available
    (this as any).metadata = {
      language,
      surfaceType: 'app'
    };
  }

  /**
   * Get the name of this surface app.
   */
  get name(): string | undefined {
    return this._name ?? this.options.name;
  }

  /**
   * Set the name of this surface app.
   */
  set name(value: string | undefined) {
    this._name = value;
  }

  /**
   * Get metadata about this surface app.
   */
  getMetadata(): SurfaceMetadata {
    const packageName = this._name || this.options.name || 'unknown';
    
    return {
      language: this.options.language || 'typescript',
      packageName,
      surfaceType: 'app'
    };
  }
}

/**
 * Factory function for creating a surface app ring.
 * Usage: loom.spiral.surface({ name: 'MyApp', template: 'tauri' })
 */
export function surfaceRing(options?: {
  name?: string;
  language?: 'typescript' | 'rust';
  template?: string;
}): SurfaceRing {
  return new SurfaceRing(options);
}
