/**
 * TypeScript Spiral
 *
 * TypeScript-specific spiral implementation for the weave graph.
 */

import * as spiralers from './spiralers/index.js';
import * as p from './pattern.js';
import type { TsExternalLayer } from '../typescript.js';

export interface TsCoreMetadata {
  language: 'typescript';
  packageName: string;
}

/**
 * TypeScript Core implementation.
 * For TypeScript-based layers like Prisma database interfaces.
 *
 * Usage:
 *   new TsCore(DB)  // layer first, then options
 *   new TsCore(DB, { packageName: 'prisma' })
 */
export class TsCore<
  Layer extends TsExternalLayer = TsExternalLayer,
  StructClass = Layer
> extends p.CoreRing<
  {
    typescript: spiralers.TypescriptSpiraler;
  },
  Layer,
  Layer & StructClass
> {
  declare core: Layer & StructClass;

  constructor(
    layer: Layer,
    public options: {
      packageName?: string;
      packagePath?: string;  // Path to the package directory
    } = {}
  ) {
    // Metadata is enriched by heddles from export name after loadWarp sets .name
    // We set language here so it's available immediately; heddles will add packageName/path
    super(layer, layer as any, { language: 'typescript' } as any);
  }

  getSpiralers() {
    return {
      typescript: new spiralers.TypescriptSpiraler(this)
    };
  }

  getMetadata(): TsCoreMetadata {
    // Use layer.name (set by loadWarp from export name) or fall back to constructor name
    const layerName = this.layer.name || (this.layer?.constructor as any)?.name || 'unknown';

    const packageName = this.options.packageName || layerName;

    return {
      language: 'typescript',
      packageName
    };
  }
}

/**
 * Factory function for creating a TypeScript core.
 * Usage: loom.spiral(loom.tsCore(DB))
 */
export function tsCore(
  layer: TsExternalLayer,
  options?: { packageName?: string; packagePath?: string }
): TsCore {
  return new TsCore(layer, options);
}
