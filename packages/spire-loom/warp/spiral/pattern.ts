/**
 * Spiral Pattern - Core Implementation
 *
 * The spiral creates rings that wrap other rings.
 * A spiral can wrap one ring (linear) or multiple rings (multiplexed).
 */

import { Layer, Layering } from '../layers.js';
import type { TieupConfig } from '../tieups.js';

// ============================================================================
// Base Classes
// ============================================================================

export class SpiralRing extends Layer {}

/**
 * Spiraling - Graph connectors that weave layers together.
 * 
 * Spiralers are part of the weave graph structure. They connect layers
 * but don't themselves contain code packages. Future: tieups on spiralers
 * could affect how they connect/transformation between layers.
 */
export abstract class Spiraling extends Layering {
  /**
   * Tieups on spiralers are not yet implemented.
   * Future: could attach transformation logic to graph edges.
   */
  tieup(_sourceOrConfig: Layering | TieupConfig, _maybeConfig?: TieupConfig): this {
    throw new Error('Tieups on spiralers not yet implemented. Attach tieups to layers instead.');
  }
}

/**
 * Metadata about a core ring.
 */
export interface CoreMetadata {
  /** The language/runtime of this core */
  language: 'rust' | 'typescript';
}

/**
 * Package metadata for any ring.
 * Used by treadles to know where to write files.
 */
export interface RingPackageMetadata {
  /** Absolute or workspace-relative path to the package */
  packagePath: string;
  /** Package name (crate name, npm package name, etc.) */
  packageName: string;
  /** Language of the package */
  language: 'rust' | 'typescript';
}

/**
 * Abstract base for all core rings.
 * Cores are the innermost rings that provide the domain logic.
 *
 * Each core is backed by an ExternalLayer (the metadata definition).
 */
export abstract class CoreRing<
  S extends Partial<Spiralers>,
  L extends SpiralRing = SpiralRing,
  CoreData = unknown
> extends SpiralRing {
  constructor(
    /** The external layer (struct definition) backing this core */
    public layer: L,
    /** The core data/struct that defines the domain model */
    public core: CoreData,
    /** Package metadata for file generation */
    public metadata?: RingPackageMetadata
  ) {
    super();
  }

  /**
   * Get the spiralers available for this core.
   * Each core type (Rust, Go, etc.) provides its own set of spiralers
   * that know how to wrap/adapt this core.
   */
  abstract getSpiralers(): S;

  /**
   * Get metadata about this core.
   */
  abstract getMetadata(): CoreMetadata;
}

/**
 * A Spiraler creates SpiralOut instances.
 * Each Spiraler represents one Ring of the Spiral.
 *
 * The innerRing is the SpiralOut we spiral out from.
 * Yes, this creates chains like: spiraler.innerRing.inner.innerRing.inner.innerRing
 * Embrace the spiral! 🌀
 */
export abstract class Spiraler extends Spiraling {
  constructor(public innerRing: SpiralRing) {
    super();
  }
}

/**
 * A MuxSpiraler handles multiple inner rings (for platform aggregation).
 * Used by Tauri to route to Android/iOS/Desktop.
 */
export abstract class MuxSpiraler extends Spiraling {
  constructor(public innerRings: SpiralRing[]) {
    super();
  }
}

// ============================================================================
// SpiralOut - Single Ring Wrapper
// ============================================================================

/**
 * Spiralers is a map of all Spiraler instances for a particular SpiralOut.
 * These are the objects that create the next ring in the spiral.
 *
 * Uses 'any' for values to allow specific Spiraler subclasses without widening.
 * Type safety is enforced by the generic parameter O in SpiralOut/SpiralOutType.
 */
export type Spiralers = Record<string, any>;

/**
 * A SpiralOut wraps a single inner ring with spiralers.
 * Represents one step in a linear spiral.
 */
export class SpiralOut<
  O extends Partial<Spiralers> = Spiralers,
  Inner extends SpiralRing = SpiralRing
> extends SpiralRing {
  constructor(
    public inner: Inner,
    spiralers: O,
    /** Package metadata inherited from inner ring */
    public metadata?: RingPackageMetadata
  ) {
    super();
    Object.assign(this, spiralers);
  }
}

export type SpiralOutType<
  O extends Partial<Spiralers> = Spiralers,
  Inner extends SpiralRing = SpiralRing
> = SpiralOut<O, Inner> & O;

// ============================================================================
// SpiralMux - Multiple Ring Wrapper
// ============================================================================

/**
 * A SpiralMux wraps multiple inner rings.
 * Used for platform aggregation (e.g., Tauri routing to Android/Desktop).
 */
export class SpiralMux<O extends Partial<Spiralers> = Spiralers> extends SpiralRing {
  constructor(
    public innerRings: SpiralRing[],
    spiralers: O
  ) {
    super();
    Object.assign(this, spiralers);
  }
}

export type SpiralMuxType<O extends Partial<Spiralers> = Spiralers> = SpiralMux<O> & O;

/**
 * Spiral out from a single ring (linear spiral).
 * Creates the next ring wrapping a single inner ring.
 */
export function spiralOut<O extends Partial<Spiralers> = Spiralers>(
  inner: SpiralRing,
  spiralers: O
): SpiralOutType<O> {
  // Inherit metadata from inner ring if available
  const metadata = (inner as any).metadata;
  return new SpiralOut(inner, spiralers, metadata) as unknown as SpiralOutType<O>;
}

/**
 * Spiral out from multiple rings (multiplexed spiral).
 * Creates a mux that wraps multiple inner rings.
 */
export function spiralMux<O extends Partial<Spiralers> = Spiralers>(
  innerRings: SpiralRing[],
  spiralers: O
): SpiralMuxType<O> {
  return new SpiralMux(innerRings, spiralers) as unknown as SpiralMuxType<O>;
}
