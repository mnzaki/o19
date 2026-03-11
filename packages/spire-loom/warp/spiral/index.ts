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
import { RustExternalLayer } from '../rust.js';
import { TsExternalLayer } from '../typescript.js';
import { RustCore, rustCore } from './rust.js';
import { surfaceRing } from './surface.js';
import { TsCore, tsCore } from './typescript.js';
import { EXTERNAL_LAYER_CORE, ExternalLayer } from '../layers.js';

// Re-export Rust and TypeScript spiral implementations
export * from './pattern.js';
export * from './operation-mux.js';
export * from './spiralers/index.js';
export { RustCore, rustCore } from './rust.js';
export { TsCore, tsCore } from './typescript.js';
export { SurfaceRing, surfaceRing } from './surface.js';

// ============================================================================
// Spiral Functions
// ============================================================================

/**
 * Create a core spiral (the first ring in any spiral architecture).
 * The core provides its spiralers via getSpiralers().
 *
 * Usage:
 *   const foundframe = loom.spiral(loom.rustCore());
 *   // foundframe.android.foregroundService()
 *   // foundframe.desktop.direct()
 */
export function spiralCore<S extends Partial<i.Spiralers>, C extends p.CoreRing<S, any>>(
  core: C
): i.SpiralOutType<S, C> {
  // Get spiralers from the core and create SpiralOut directly
  // (no parent spiraler when starting from a core)
  const spiralers = core.getSpiralers();
  return new p.SpiralOut(core, 'core', spiralers) as i.SpiralOutType<S, C>;
}

/**
 * Create a spiral from a CoreRing class
 *
 * Usage:
 *   @rust.Struct
 *   class Foundframe { ... }
 *   const foundframe = spiral(Foundframe);
 *   // foundframe.inner.core.thestream
 *   // foundframe.android.foregroundService()
 *
export function spiral<C extends p.CoreRing<any, any>>(
  core: C
): i.SpiralOutType<S, C>;
*/

/**
 * Create a spiral from a @rust.Struct decorated class.
 *
 * Usage:
 *   @rust.Struct
 *   class Foundframe { ... }
 *   const foundframe = spiral(Foundframe);
 *   // foundframe.inner.core.thestream
 *   // foundframe.android.foregroundService()
 *
export function spiral<T extends new (...args: any[]) => any>(
  structClass: T & { [RUST_STRUCT_MARK]?: true }
): i.SpiralOutType<
  { android: spiralers.RustAndroidSpiraler; desktop: spiralers.DesktopSpiraler },
  RustCore<InstanceType<T>, T>
>;

/**
 * Create a spiral from a RustExternalLayer (e.g., a @rust.Struct class).
 * This overload provides proper typing for the core's struct fields.
 *
export function spiral<T extends new (...args: any[]) => any>(
  core: T
): p.SpiralOutType<
  { android: spiralers.RustAndroidSpiraler; desktop: spiralers.DesktopSpiraler },
  RustCore<InstanceType<T>, T>
>;
/**/

/**
 * Create a spiral from an ExternalLayer instance.
 *
 * Usage:
 *   const foundframe = spiral(myCustomCore());
 *
export function spiral<T extends ExternalLayer<any>>(
  layer: new (...args: any[]) => T
): i.SpiralOutType<T extends ExternalLayer<p.CoreRing<infer S, any>> ? S : i.Spiralers, C>;
/**/

/**
 * Create a spiral from a @typescript.Class decorated class.
 * For TypeScript cores like Prisma database interfaces.
 *
 * Usage:
 *   @typescript.Class
 *   class DB { ... }
 *   const prisma = spiral(DB);
 *   // prisma.typescript.ddd()
 *
export function spiral<T extends new (...args: any[]) => any>(
  structClass: T & { [TS_CLASS_MARK]?: true }
): i.SpiralOutType<{ typescript: spiralers.TypescriptSpiraler }, TsCore<InstanceType<T>, T>>;
*/

/**
 * Create a spiral from a TsExternalLayer (e.g., a @typescript.Class class).
 *
export function spiral<T extends new (...args: any[]) => any>(
  core: T
): p.SpiralOutType<{ typescript: spiralers.TypescriptSpiraler }, TsCore<InstanceType<T>, T>>;
/**/

/**
 * Create a multiplexed spiral wrapping multiple rings.
 * Used for Tauri to aggregate Android + Desktop.
 *
 * Usage:
 *   const tauri = spiral(android, desktop);
 *
export function spiral<C extends p.CoreRing<any, any>, T extends ExternalLayer<C>>(
  ...innerRings: i.SpiralRing[]
): i.SpiralMuxType<{ tauri: spiralers.TauriSpiraler }>;
*/

// Implementation
export function spiral<T extends ExternalLayer<any>>(
  layer: new (...args: any[]) => T
): i.SpiralOutType<
  T extends ExternalLayer<p.CoreRing<infer S, any>> ? S : never,
  T extends ExternalLayer<infer C> ? C : never
> {
  //export function spiral(...innerThings: unknown[]) {
  //if (innerThings.length === 1) {
  let ring;

  const externalLayerCore = (layer as any)[EXTERNAL_LAYER_CORE];
  if (externalLayerCore) {
    const core = new externalLayerCore(layer);
    ring = spiralCore(core as any);
  } else if (layer instanceof p.CoreRing) {
    ring = spiralCore(layer);
  } else if (layer instanceof p.SpiralRing) {
    ring = layer;
  } else {
    throw new Error(
      `Cannot spiral from ${typeof layer}: ${layer?.constructor?.name || layer}. Expected CoreRing, SpiralRing, or @rust.Struct/@typescript.Class class.`
    );
  }

  return ring;
  //}

  // Otherwise creates a spiral multiplexer
  //const innerRingsArr = innerThings as i.SpiralRing[];
  //const mux = p.spiralMux(innerRingsArr, {});
  //return mux;
}

/**
 * Create a base spiraler factory.
 *
 * This creates a factory object where each method:
 * 1. Creates a default core
 * 2. Creates the spiraler with that core
 * 3. Calls the spiraler's method and returns the result
 *
 * @param createCore - Function to create the default core
 * @param SpiralerClass - The Spiraler class to instantiate
 * @returns Factory object with wrapped methods
 */
function createBaseSpiralerFactory<S extends spiralers.Spiraler, C extends i.SpiralRing>(
  createCore: () => C,
  SpiralerClass: new (innerRing: i.SpiralRing) => S
): { [K in keyof S]: S[K] extends (...args: any[]) => any ? S[K] : never } & {
  core: () => C;
} {
  const factory: any = {
    core: createCore
  };

  // Get method names from Spiraler class prototype
  const methodNames = Object.getOwnPropertyNames(SpiralerClass.prototype).filter(
    (name) => name !== 'constructor' && typeof SpiralerClass.prototype[name] === 'function'
  );

  // Wrap each method
  for (const methodName of methodNames) {
    factory[methodName] = function (...args: any[]) {
      const core = createCore();
      const spiraler = new SpiralerClass(core);
      return (spiraler as any)[methodName](...args);
    };
  }

  return factory;
}

// Create factories for Rust and TypeScript
// Base spiraler factories attached to spiral function
export namespace spiral {
  export const rust = createBaseSpiralerFactory(
    (): RustCore => rustCore(new RustExternalLayer()),
    spiralers.RustSpiraler
  );
  export const typescript = createBaseSpiralerFactory(
    (): TsCore => tsCore(new TsExternalLayer()),
    spiralers.TypescriptSpiraler
  );
  export const tauri = createBaseSpiralerFactory(
    (): RustCore => rustCore(new RustExternalLayer()),
    spiralers.TauriSpiraler
  );

  /**
   * Create a surface app (end-user application).
   * Surface apps live in the apps/ directory.
   *
   * Usage:
   *   const myApp = loom.spiral.surface({ name: 'MyApp' });
   *   // Creates: apps/MyApp/
   */
  export function surface(options?: {
    name?: string;
    language?: 'typescript' | 'rust';
    template?: string;
  }) {
    const ring = surfaceRing(options);
    // Return as SpiralOut so it can be used like other spiral outputs
    return new p.SpiralOut(ring, 'surface', { app: ring });
  }
}

export default spiral;
