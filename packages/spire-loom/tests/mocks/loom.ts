/**
 * Mock Loom Factory
 *
 * Creates a mock loom object that mimics the real @o19/spire-loom API
 * without any actual dependencies.
 */

import type { SpiralRing } from '../../warp/spiral/pattern.js';

/**
 * Mock loom object - simulates the real loom API
 */
export interface MockLoom {
  /** Create a spiral from a core */
  spiral: {
    (core: SpiralRing): MockSpiralOut;
    (android: SpiralRing, desktop: SpiralRing): MockSpiralMux;
    rust: {
      core: (struct: any, options?: any) => MockCoreRing;
    };
  };
  /** Refinement decorators */
  refine: {
    withPrisma: (config: any) => any;
    withRefinement: (provider: any) => any;
  };
  /** CRUD decorators */
  crud: {
    create: (target: any, propertyKey: string) => void;
    read: (target: any, propertyKey: string) => void;
    update: (target: any, propertyKey: string) => void;
    delete: (target: any, propertyKey: string) => void;
    list: (options?: { collection?: boolean }) => (target: any, propertyKey: string) => void;
  };
  /** Reach decorator */
  reach: (level: 'Global' | 'Local' | 'Private') => (target: any) => void;
  /** Link decorator */
  link: (target: any) => (target: any, propertyKey: string) => void;
  /** Management base class */
  Management: new () => any;
}

/**
 * Mock spiral out with tieup support
 */
export interface MockSpiralOut {
  inner: SpiralRing;
  metadata?: {
    packagePath: string;
    packageName: string;
    crateName: string;
    language: 'rust' | 'typescript';
  };
  tieup: {
    intra: (treadle: any, config: any) => MockSpiralOut;
  };
  android: {
    foregroundService: (options?: any) => MockSpiralOut;
  };
  desktop: {
    direct: () => MockSpiralOut;
  };
  typescript: {
    ddd: () => MockSpiralOut;
    drizzle_adaptors: (options?: any) => MockSpiralOut;
  };
  tauri: {
    plugin: (options?: any) => MockSpiralOut;
    app: (options?: any) => MockSpiralOut;
  };
}

/**
 * Mock spiral mux
 */
export interface MockSpiralMux {
  innerRings: SpiralRing[];
  typescript: {
    ddd: () => MockSpiralOut;
  };
}

/**
 * Mock core ring with metadata
 */
export interface MockCoreRing extends SpiralRing {
  metadata: {
    packagePath: string;
    packageName: string;
    crateName: string;
    language: 'rust' | 'typescript';
  };
  layer: any;
  core: any;
}

export interface MockLoomOptions {
  /** Pre-configure with specific package paths */
  packagePaths?: Record<string, string>;
}

/**
 * Create a mock loom object for testing.
 */
export function createMockLoom(options: MockLoomOptions = {}): MockLoom {
  return {
    spiral: Object.assign(
      (arg1: any, arg2?: any) => {
        // Single core: loom.spiral(core)
        if (!arg2) {
          // Inherit metadata from inner ring
          const innerMetadata = arg1?.metadata;
          const spiralOut: MockSpiralOut = {
            inner: arg1,
            metadata: innerMetadata,
            tieup: {
              intra: (treadle: any, config: any) => {
                const existing = tieupRegistry.get(spiralOut) || [];
                tieupRegistry.set(spiralOut, [...existing, { treadle, config }]);
                return spiralOut;
              }
            },
            android: {
              foregroundService: (opts?: any) => spiralOut
            },
            desktop: {
              direct: () => spiralOut
            },
            typescript: {
              ddd: () => spiralOut,
              drizzle_adaptors: (opts?: any) => spiralOut
            },
            tauri: {
              plugin: (opts?: any) => spiralOut,
              app: (opts?: any) => spiralOut
            }
          };
          return spiralOut;
        }
        
        // Multiple rings: loom.spiral(android, desktop)
        const mux: MockSpiralMux = {
          innerRings: [arg1, arg2],
          typescript: {
            ddd: () => ({
              inner: mux,
              tieup: { intra: () => ({}) as any },
              android: { foregroundService: () => ({}) as any },
              desktop: { direct: () => ({}) as any },
              typescript: { ddd: () => ({}) as any, drizzle_adaptors: () => ({}) as any },
              tauri: { plugin: () => ({}) as any, app: () => ({}) as any }
            })
          }
        };
        return mux;
      },
      {
        rust: {
          core: (struct: any, opts: any = {}) => {
            const core: MockCoreRing = {
              ...({} as SpiralRing),
              metadata: {
                packagePath: opts.packagePath || `crates/${opts.packageName || 'test'}`,
                packageName: opts.packageName || 'test',
                crateName: opts.crateName || `o19-${opts.packageName || 'test'}`,
                language: 'rust'
              },
              layer: struct,
              core: struct
            };
            return core;
          }
        }
      }
    ),

    refine: {
      withPrisma: (config: any) => (target: any) => target,
      withRefinement: (provider: any) => (target: any) => target
    },

    crud: {
      create: (target: any, propertyKey: string) => {},
      read: (target: any, propertyKey: string) => {},
      update: (target: any, propertyKey: string) => {},
      delete: (target: any, propertyKey: string) => {},
      list: (options?: { collection?: boolean }) => (target: any, propertyKey: string) => {}
    },

    reach: (level: 'Global' | 'Local' | 'Private') => (target: any) => target,
    link: (target: any) => (target: any, propertyKey: string) => {},

    Management: class MockManagement {}
  };
}

// Export a registry to access tieups in tests
export const tieupRegistry = new WeakMap<any, any[]>();
