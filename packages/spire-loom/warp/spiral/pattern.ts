/**
 * Spiral Pattern - Core Implementation
 *
 * The spiral creates rings that wrap other rings.
 * A spiral can wrap one ring (linear) or multiple rings (multiplexed).
 */

import { Layer } from '../imprint.js';

// ============================================================================
// Base Classes
// ============================================================================

export class SpiralRing extends Layer {}

/**
 * TODO explain me, GLOSSARY-wise
 */
export interface Spiraling {}

/**
 * Metadata about a core ring.
 */
export interface CoreMetadata {
  /** The language/runtime of this core */
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
    public core: CoreData
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
export abstract class Spiraler implements Spiraling {
  constructor(public innerRing: SpiralRing) {}
}

/**
 * A MuxSpiraler handles multiple inner rings (for platform aggregation).
 * Used by Tauri to route to Android/iOS/Desktop.
 */
export abstract class MuxSpiraler implements Spiraling {
  constructor(public innerRings: SpiralRing[]) {}
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
    spiralers: O
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
  return new SpiralOut(inner, spiralers) as unknown as SpiralOutType<O>;
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
