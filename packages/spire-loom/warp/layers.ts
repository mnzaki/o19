/**
 * Layers and Layerings
 *
 * The foundation of the weave graph.
 *
 * Layer: Concrete packages where code is generated.
 * Layering: Graph connectors that weave layers together.
 */

import { tieup as tieupFn, type TieupConfig } from './tieups.js';

/**
 * Layering - The compositional mechanism for weaveable elements.
 *
 * Spiralings (graph connectors) extend this to participate in the weave graph.
 * Layers (concrete packages) are separate - they have their own tieup mechanism.
 */
export abstract class Layering {
  /**
   * Attach tieups to this graph connector.
   *
   * For Spiralings: not yet implemented (future feature).
   * For Layers: use Layer.tieup() instead.
   */
  abstract tieup(sourceOrConfig: Layering | TieupConfig, maybeConfig?: TieupConfig): this;
}

/**
 * Layer - A concrete package/unit where code is generated.
 *
 * Examples: SpiralRing, SpiralOut, CoreRing, etc.
 * Layers have their own tieup mechanism separate from Layering.
 */
export abstract class Layer {
  name!: string;

  /**
   * Attach tieups to generate code in this layer's package.
   *
   * @example
   * ```typescript
   * // Use this layer as source
   * layer.tieup({ treadles: [dbBindingTreadle] });
   *
   * // Use another layer as source
   * layer.tieup(sourceLayer, { treadles: [typeGenTreadle] });
   * ```
   */
  tieup(sourceOrConfig: Layer | TieupConfig, maybeConfig?: TieupConfig): this {
    return tieupFn.call(this, sourceOrConfig as any, maybeConfig as any) as this;
  }
}

/**
 * ExternalLayer - A layer defined outside the core system.
 *
 * Used for struct definitions and external bindings.
 */
export abstract class ExternalLayer extends Layer {}
