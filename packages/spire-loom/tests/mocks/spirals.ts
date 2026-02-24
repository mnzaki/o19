/**
 * Spiral Pattern Mocks
 *
 * Mock implementations of SpiralRing, SpiralOut, SpiralMux, CoreRing
 */

import { SpiralRing, spiralOut, spiralMux } from '../../warp/spiral/pattern.js';

export interface MockCoreConfig {
  name?: string;
  packagePath?: string;
  packageName?: string;
  crateName?: string;
  language?: 'rust' | 'typescript';
  struct?: any;
}

export interface MockSpiralConfig {
  name?: string;
  spiralers?: Record<string, any>;
}

/**
 * Create a mock CoreRing with metadata.
 */
export function createMockCore(config: MockCoreConfig = {}): SpiralRing & { 
  metadata: any; 
  layer: any; 
  core: any;
} {
  const ring = new SpiralRing() as any;
  
  ring.metadata = {
    packagePath: config.packagePath || `crates/${config.packageName || 'test'}`,
    packageName: config.packageName || 'test',
    crateName: config.crateName || `o19-${config.packageName || 'test'}`,
    language: config.language || 'rust'
  };
  
  ring.layer = config.struct || {};
  ring.core = config.struct || {};
  ring.name = config.name || 'TestCore';
  
  return ring;
}

/**
 * Create a mock SpiralOut with proper structure.
 */
export function createMockSpiralOut(
  inner: SpiralRing,
  config: MockSpiralConfig = {}
): any {
  const spiralers = config.spiralers || {};
  const out = spiralOut(inner, spiralers) as any;
  
  out.name = config.name || 'TestSpiralOut';
  
  // Add mock tieup support
  const tieups: any[] = [];
  out.tieup = {
    intra: (treadle: any, config: any) => {
      tieups.push({ treadle, config });
      (out as any)._tieups = tieups;
      return out;
    }
  };
  
  // Add platform spiralers
  out.android = {
    foregroundService: (opts?: any) => out
  };
  out.desktop = {
    direct: () => out
  };
  out.typescript = {
    ddd: () => out,
    drizzle_adaptors: (opts?: any) => out
  };
  out.tauri = {
    plugin: (opts?: any) => out,
    app: (opts?: any) => out
  };
  
  return out;
}

/**
 * Create a mock SpiralMux.
 */
export function createMockSpiralMux(
  innerRings: SpiralRing[],
  spiralers: Record<string, any> = {}
): any {
  const mux = spiralMux(innerRings, spiralers) as any;
  
  mux.name = 'TestSpiralMux';
  mux.typescript = {
    ddd: () => mux
  };
  
  return mux;
}

/**
 * Create a complete mock spiral chain.
 */
export function createMockSpiralChain(config: {
  coreName?: string;
  platforms?: string[];
  withTauri?: boolean;
} = {}): Record<string, any> {
  const core = createMockCore({ 
    name: config.coreName || 'TestCore',
    packageName: (config.coreName || 'test').toLowerCase()
  });
  
  const foundframe = createMockSpiralOut(core, { 
    name: config.coreName || 'TestCore' 
  });
  
  const result: Record<string, any> = { 
    core, 
    foundframe 
  };
  
  // Create platform rings
  const platformRings: SpiralRing[] = [];
  for (const platform of (config.platforms || [])) {
    const platformRing = createMockSpiralOut(foundframe.inner, {
      name: platform,
      spiralers: { [platform]: { name: platform } }
    });
    result[platform.toLowerCase()] = platformRing;
    platformRings.push(platformRing);
  }
  
  // Create Tauri mux
  if (config.withTauri && platformRings.length > 0) {
    const tauri = createMockSpiralMux(platformRings, {
      tauri: { name: 'Tauri' }
    });
    result.tauri = tauri;
  }
  
  return result;
}
