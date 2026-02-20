import * as spiralers from './spiralers/index.js';
import { SpiralRing, SpiralOut, spiralOut, spiralMux } from './pattern.js';
import type { SpiralOutType, SpiralMuxType } from './pattern.js';

/**
 * Create a spiral.
 *
 * With no arguments: creates the core spiral with Android spiraler.
 * With arguments: creates a multiplexed spiral wrapping the provided rings.
 *
 * Usage:
 *   const foundframe = spiral();                          // Core
 *   const android = foundframe.android.foregroundService(); // Android ring
 *   const desktop = foundframe.desktop.direct();            // Desktop ring
 *   const tauri = spiral(android, desktop).tauri.plugin();  // Tauri aggregates
 */

// Overload: no args = Core spiral with Android + Desktop spiralers
export function spiral(): SpiralOutType<{ android: spiralers.AndroidSpiraler; desktop: spiralers.DesktopSpiraler }>;

// Overload: with args = Mux spiral with Tauri spiraler
export function spiral(...innerRings: SpiralRing[]): SpiralMuxType<{ tauri: spiralers.TauriSpiraler }>;

// Implementation
export function spiral(...innerRings: SpiralRing[]) {
  if (innerRings.length === 0) {
    // Core spiral - linear wrapping
    const core = new SpiralRing();
    const outters = {
      android: new spiralers.AndroidSpiraler(core as SpiralOut<never>),
      desktop: new spiralers.DesktopSpiraler(core as SpiralOut<never>)
      // Note: tauri requires spiralMux, not available here
    };
    return spiralOut(core, outters);
  } else {
    // Multiplexed spiral - wraps multiple platform rings
    const mux = spiralMux(innerRings, {
      tauri: new spiralers.TauriSpiraler(innerRings)
    });
    return mux;
  }
}

export * from './pattern.js';
export * from './spiralers/index.js';
export { spiralOut, spiralMux };
export default spiral;
