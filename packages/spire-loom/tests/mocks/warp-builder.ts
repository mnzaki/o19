/**
 * WARP Builder
 *
 * Helper to construct test WARP configurations.
 */

import { createMockLoom, tieupRegistry } from './loom.js';
import { createMockCore, createMockSpiralOut, createMockSpiralMux } from './spirals.js';
import { mockTreadles } from './treadles.js';
import { createMockVirtualFs, createMockTreadleUtils } from './filesystem.js';

export interface TestWarpConfig {
  /** Include core ring */
  withCore?: boolean;
  /** Core configuration */
  coreConfig?: {
    name?: string;
    packageName?: string;
  };
  /** Include tieup */
  withTieup?: boolean;
  /** Tieup configuration */
  tieupConfig?: {
    treadle?: any;
    config?: any;
  };
  /** Include platform rings */
  platforms?: string[];
  /** Include Tauri mux */
  withTauri?: boolean;
  /** Include front/DDD layer */
  withFront?: boolean;
}

export interface TestWarpResult {
  /** The loom instance */
  loom: any;
  /** The WARP exports */
  warp: Record<string, any>;
  /** Virtual filesystem */
  vfs: any;
  /** Helper to create TreadleUtils */
  createUtils: (basePath?: string) => any;
  /** Get tieups attached to a ring */
  getTieups: (ring: any) => any[];
}

/**
 * Create a complete test WARP configuration.
 */
export function createTestWarp(config: TestWarpConfig = {}): TestWarpResult {
  const loom = createMockLoom();
  const vfs = createMockVirtualFs();
  const warp: Record<string, any> = {};

  // Create core
  if (config.withCore !== false) {
    const coreClass = class TestCore {};
    const core = loom.spiral.rust.core(coreClass, {
      packageName: config.coreConfig?.packageName || 'test',
      crateName: `o19-${config.coreConfig?.packageName || 'test'}`
    });
    
    const foundframe = loom.spiral(core);
    warp.foundframe = foundframe;
    
    // Add tieup
    if (config.withTieup) {
      const treadle = config.tieupConfig?.treadle || mockTreadles.echoConfig();
      const tieupConfig = config.tieupConfig?.config || { test: true };
      foundframe.tieup.intra(treadle, tieupConfig);
    }
    
    // Create platform rings
    if (config.platforms) {
      for (const platform of config.platforms) {
        const platformRing = loom.spiral(core);
        platformRing[platform] = {
          [platform === 'android' ? 'foregroundService' : 'direct']: () => platformRing
        };
        warp[platform] = platformRing;
      }
      
      // Create Tauri mux
      if (config.withTauri && config.platforms.length > 0) {
        const platformRings = config.platforms.map(p => warp[p]);
        const tauri = loom.spiral(...platformRings as any);
        warp.tauri = tauri;
        
        // Add front layer
        if (config.withFront) {
          const front = tauri.typescript?.ddd?.() || tauri;
          warp.front = front;
        }
      }
    }
  }

  return {
    loom,
    warp,
    vfs,
    createUtils: (basePath?: string) => createMockTreadleUtils(vfs, basePath),
    getTieups: (ring: any) => tieupRegistry.get(ring) || []
  };
}

/**
 * Pre-built WARP configurations for common scenarios.
 */
export const testWarps = {
  /**
   * Minimal: Just a core ring.
   */
  minimal: (): TestWarpResult => createTestWarp({
    withCore: true,
    withTieup: false
  }),

  /**
   * With tieup: Core + custom treadle.
   */
  withTieup: (treadle?: any, config?: any): TestWarpResult => createTestWarp({
    withCore: true,
    withTieup: true,
    tieupConfig: { treadle, config }
  }),

  /**
   * Full stack: Core + platforms + Tauri.
   */
  fullStack: (): TestWarpResult => createTestWarp({
    withCore: true,
    platforms: ['android', 'desktop'],
    withTauri: true,
    withFront: true
  }),

  /**
   * With db binding treadle.
   */
  withDbBinding: (entities: string[]): TestWarpResult => createTestWarp({
    withCore: true,
    withTieup: true,
    tieupConfig: {
      treadle: mockTreadles.dbBinding(entities, ['create', 'read', 'list']),
      config: { entities, operations: ['create', 'read', 'list'] }
    }
  })
};
