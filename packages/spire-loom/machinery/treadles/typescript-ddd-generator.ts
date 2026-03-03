/**
 * TypeScript DDD Generator
 *
 * Generates TypeScript domain types and Port interfaces from Management Imprints.
 *
 * Matrix match: (TypescriptSpiraler, TsCore) → TypeScript DDD layer
 */

import { TypescriptSpiraler } from '../../warp/spiral/spiralers/typescript/index.js';
import { TsCore } from '../../warp/spiral/index.js';
import { declareTreadle, generateFromTreadle, type OutputSpec } from '../treadle-kit/declarative.js';
import type { ManagementMethods } from '../heddles/types.js';
import { camelCase } from '../treadle-kit/index.js';

// ============================================================================
// Treadle Definition
// ============================================================================

export const typescriptDDDTreadle = declareTreadle({
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
    pipeline: []
  },

  // Template data
  data: (_context, current, previous) => {
    const ts = current.ring as unknown as TypescriptSpiraler;
    const core = previous.ring as unknown as TsCore;
    const metadata = core.getMetadata();

    return {
      // Package info
      packageName: metadata.packageName,
      packagePath: core.metadata?.packagePath || `packages/${metadata.packageName}`,

      // Store rings for hookup
      _currentRing: current.ring,
      _coreRing: previous.ring
    };
  },

  // Output files
  // Note: paths are relative to the package directory (packageDir is prepended by weaver)
  outputs: [
    (ctx) => {
      const methodsByMgmt = ctx.methods?.byManagement();
      if (!methodsByMgmt || methodsByMgmt.size === 0) {
        console.log('[ddd-services] No management methods found, skipping generation');
        return [];
      }

      // Convert Map values to array for iteration
      // Note: methods will be passed via generateCode transform, not in context
      const services = Array.from(methodsByMgmt.values()).map((mgmt: ManagementMethods) => ({
        name: mgmt.name,
        entityName: mgmt.entityName,
        entityCamelName: camelCase(mgmt.entityName),
        serviceName: mgmt.serviceName,
        portName: mgmt.portName
      }));
      const outputs: OutputSpec[] = [];
      outputs.push({
        template: 'typescript/ports.ts.ejs',
        path: 'src/ports/index.ts',
        language: 'typescript',
        context: { services }
      });
      return outputs;
    }
  ]
});

// ============================================================================
// Exports
// ============================================================================

export const generateTypescriptDDD = generateFromTreadle(typescriptDDDTreadle);
