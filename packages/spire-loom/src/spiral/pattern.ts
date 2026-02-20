/**
 * Spiral Pattern - Core Implementation
 *
 * The spiral creates rings that wrap other rings.
 * A spiral can wrap one ring (linear) or multiple rings (multiplexed).
 */

// ============================================================================
// Base Classes
// ============================================================================

export class SpiralRing {}

/**
 * TODO explain me, GLOSSARY-wise
 */
export interface Spiraling {}

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
 * "Outters" is a map of all Spiraler instances for a particular SpiralOut.
 */
type Outters = Record<string, Spiraler | MuxSpiraler>;

/**
 * A SpiralOut wraps a single inner ring with outters.
 * Represents one step in a linear spiral.
 */
export class SpiralOut<O extends Partial<Outters> = Outters> extends SpiralRing {
  constructor(
    public inner: SpiralRing,
    outters: O
  ) {
    super();
    Object.assign(this, outters);
  }
}

export type SpiralOutType<O extends Partial<Outters> = Outters> = SpiralOut<O> & O;

// ============================================================================
// SpiralMux - Multiple Ring Wrapper
// ============================================================================

/**
 * A SpiralMux wraps multiple inner rings.
 * Used for platform aggregation (e.g., Tauri routing to Android/Desktop).
 */
export class SpiralMux<O extends Partial<Outters> = Outters> extends SpiralRing {
  constructor(
    public innerRings: SpiralRing[],
    outters: O
  ) {
    super();
    Object.assign(this, outters);
  }
}

export type SpiralMuxType<O extends Partial<Outters> = Outters> = SpiralMux<O> & O;

// ============================================================================
// Spiral Functions
// ============================================================================

/**
 * Spiral out from a single ring (linear spiral).
 * Creates the next ring wrapping a single inner ring.
 */
export function spiralOut<O extends Partial<Outters> = Outters>(
  inner: SpiralRing,
  outters: O
): SpiralOutType<O> {
  return new SpiralOut(inner, outters) as unknown as SpiralOutType<O>;
}

/**
 * Spiral out from multiple rings (multiplexed spiral).
 * Creates a mux that wraps multiple inner rings.
 */
export function spiralMux<O extends Partial<Outters> = Outters>(
  innerRings: SpiralRing[],
  outters: O
): SpiralMuxType<O> {
  return new SpiralMux(innerRings, outters) as unknown as SpiralMuxType<O>;
}
