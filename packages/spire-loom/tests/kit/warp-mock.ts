/**
 * WARP.ts Mocking Utilities
 *
 * Create mock SpiralRings for testing without full loom initialization.
 */

import type { SpiralRing, SpiralOut, Spiralers } from '../../warp/spiral/pattern.js';
import { SpiralRing as SpiralRingClass, SpiralOut as SpiralOutClass } from '../../warp/spiral/pattern.js';
import type { TreadleDefinition } from '../../machinery/treadle-kit/declarative.js';

/**
 * Configuration for creating a mock WARP module.
 */
export interface WarpMockConfig {
  /** Ring name → SpiralRing mapping */
  rings?: Record<string, SpiralRing>;
  /** Enable automatic mock generation */
  autoMock?: boolean;
}

/**
 * A mock spiral ring for testing.
 */
export interface MockSpiralRing extends SpiralRing {
  /** Ring name */
  name: string;
  /** Mock metadata */
  mockMetadata: Record<string, unknown>;
  /** Parent ring (if any) */
  parent?: SpiralRing;
  /** Child rings */
  children: SpiralRing[];
}

/**
 * Create a mock WARP module configuration.
 *
 * @example
 * ```typescript
 * const warp = warpMock({
 *   rings: {
 *     foundframe: createMockCore('Foundframe'),
 *     android: createMockSpiralOut('Android'),
 *   }
 * });
 * ```
 */
export function warpMock(config: WarpMockConfig = {}): Record<string, SpiralRing> {
  if (config.rings) {
    return config.rings;
  }

  // Auto-generate minimal mock rings
  if (config.autoMock) {
    return {
      foundframe: createMockCore('Foundframe'),
    };
  }

  return {};
}

/**
 * Create a mock CoreRing for testing.
 */
export function createMockCore(name: string): MockSpiralRing {
  const ring = new SpiralRingClass() as MockSpiralRing;
  ring.name = name;
  ring.mockMetadata = { type: 'core' };
  ring.children = [];
  return ring;
}

/**
 * Create a mock SpiralOut for testing.
 */
export function createMockSpiralOut<
  O extends Spiralers = Spiralers
>(
  name: string,
  inner: SpiralRing,
  spiralers?: O
): SpiralOut<O> & MockSpiralRing {
  // Create SpiralOut directly using the class constructor
  // SpiralOut takes (inner, treadleTag, spiralers)
  const out = new SpiralOutClass(inner, name, spiralers ?? {} as O);
  
  // Add mock properties
  const mock = out as unknown as SpiralOut<O> & MockSpiralRing;
  mock.name = name;
  mock.mockMetadata = { type: 'spiralOut', innerName: (inner as any).name };
  mock.children = [inner];
  
  return mock;
}

/**
 * Create a mock ring with tieups attached.
 *
 * @example
 * ```typescript
 * const foundframe = createMockRingWithTieups('Foundframe', [
 *   { treadle: dbBindingTreadle, config: { entities: ['Bookmark'] } }
 * ]);
 * ```
 */
export function createMockRingWithTieups(
  name: string,
  tieups: Array<{ treadle: TreadleDefinition; config: Record<string, unknown> }>
): MockSpiralRing {
  const ring = createMockCore(name);
  
  // Attach tieups using Symbol
  const INTRA_TIEUPS_KEY = Symbol.for('loom:intra-tieups');
  (ring as any)[INTRA_TIEUPS_KEY] = tieups;
  
  return ring;
}

/**
 * Create a complete mock spiral chain for testing.
 *
 * Creates: Core → SpiralOut → SpiralMux (if multiple platforms)
 *
 * @example
 * ```typescript
 * const chain = createMockSpiralChain({
 *   core: 'Foundframe',
 *   platforms: ['android', 'desktop'],
 *   tauri: true,
 * });
 * // Returns: { foundframe, android, desktop, tauri }
 * ```
 */
export async function createMockSpiralChain(config: {
  core: string;
  platforms?: string[];
  tauri?: boolean;
}): Promise<Record<string, SpiralRing>> {
  const rings: Record<string, SpiralRing> = {};
  
  // Create core
  const core = createMockCore(config.core);
  rings[config.core.toLowerCase()] = core;
  
  // Create platform spiral outs
  const platformRings: SpiralRing[] = [];
  for (const platform of (config.platforms ?? [])) {
    const platformRing = createMockSpiralOut(platform, core, {
      [platform]: { name: platform },
    });
    rings[platform] = platformRing;
    platformRings.push(platformRing);
  }
  
  // Create Tauri mux if requested
  if (config.tauri && platformRings.length > 0) {
    const { spiralMux } = await import('../../warp/spiral/pattern.js');
    const tauri = spiralMux(platformRings, {
      tauri: { name: 'tauri' },
    });
    rings.tauri = tauri;
  }
  
  return rings;
}
