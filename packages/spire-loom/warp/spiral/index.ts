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
import { SpiralRing, SpiralOut, spiralOut, spiralMux } from './pattern.js';
import type { SpiralOutType, SpiralMuxType } from './pattern.js';
import { CoreRing, RustCore, spiralCore } from './core.js';

// Re-export core types
export { CoreRing, RustCore, rustCore, spiralCore } from './core.js';

/**
 * Create a spiral from a Rust core.
 * Returns a SpiralOut with android and desktop spiralers.
 * 
 * Usage:
 *   const foundframe = spiral(rustCore());
 *   const android = foundframe.android.foregroundService();
 *   const desktop = foundframe.desktop.direct();
 */
export function spiral(core: RustCore): SpiralOutType<{ android: spiralers.AndroidSpiraler; desktop: spiralers.DesktopSpiraler }>;

/**
 * Create a spiral from a generic core ring.
 * 
 * Usage:
 *   const foundframe = spiral(myCustomCore());
 */
export function spiral(core: CoreRing): SpiralOutType;

/**
 * Create a multiplexed spiral wrapping multiple platform rings.
 * Used for Tauri to aggregate Android + Desktop.
 * 
 * Usage:
 *   const tauri = spiral(android, desktop);
 */
export function spiral(...innerRings: SpiralRing[]): SpiralMuxType<{ tauri: spiralers.TauriSpiraler }>;

// Implementation
export function spiral(...innerRings: (CoreRing | SpiralRing)[]): any {
  // Check if first argument is a CoreRing (creates linear spiral)
  if (innerRings.length === 1 && innerRings[0] instanceof CoreRing) {
    return spiralCore(innerRings[0] as CoreRing);
  }
  
  // Otherwise create multiplexed spiral (Tauri aggregation)
  const innerRingsArr = innerRings as SpiralRing[];
  const mux = spiralMux(innerRingsArr, {
    tauri: new spiralers.TauriSpiraler(innerRingsArr)
  });
  return mux;
}

export * from './pattern.js';
export * from './spiralers/index.js';
export { spiralOut, spiralMux };
export default spiral;
