/**
 * TypeScript DDD Generator
 *
 * Generates TypeScript domain types and Port interfaces from Management Imprints.
 *
 * Matrix match: (TypescriptSpiraler, TsCore) → TypeScript DDD layer
 */

import { TypescriptSpiraler } from '../../warp/spiral/spiralers/typescript/index.js';
import { TsCore } from '../../warp/spiral/index.js';
import { defineTreadle, generateFromTreadle } from '../treadle-kit/declarative.js';
import type { GeneratorContext } from '../heddles/index.js';

// ============================================================================
// Treadle Definition
// ============================================================================

export const typescriptDDDTreadle = defineTreadle({
  // When does this run?
  matches: [{ current: 'TypescriptSpiraler.ddd', previous: 'TsCore' }],

  // Extra validation
  validate: (current, previous) => {
    // current.ring is a SpiralOut, the spiraler is stored in .spiraler
    const spiraler = (current.ring as any).spiraler;
    if (!(spiraler instanceof TypescriptSpiraler)) return false;
    if (!(previous.ring instanceof TsCore)) {
      throw new Error('TypescriptSpiraler must wrap TsCore');
    }
    return true;
  },

  // Method filtering and transformation
  methods: {
    filter: 'front',
    pipeline: [],
  },

  // Template data
  data: (_context, current, previous) => {
    const ts = current.ring as TypescriptSpiraler;
    const core = previous.ring as TsCore;
    const metadata = core.getMetadata();

    return {
      // Package info
      packageName: metadata.packageName,
      packagePath: core.metadata?.packagePath || `packages/${metadata.packageName}`,
      
      // Store rings for hookup
      _currentRing: current.ring,
      _coreRing: previous.ring,
    };
  },

  // Output files
  // Note: paths are relative to the package directory (packageDir is prepended by weaver)
  outputs: [
    {
      template: 'typescript/ports.ts.ejs',
      path: 'src/ports.gen.ts',
      language: 'typescript',
    },
    {
      template: 'typescript/types.ts.ejs',
      path: 'src/types.gen.ts',
      language: 'typescript',
    },
  ],

});

// ============================================================================
// Exports
// ============================================================================

export const generateTypescriptDDD = generateFromTreadle(typescriptDDDTreadle);
