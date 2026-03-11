/**
 * DDD Services Treadle (Builtin)
 *
 * Generates domain services, ports, and adaptor wiring for TypeScript DDD layer.
 * Uses management methods (not entity lists) as the source of truth.
 *
 * Pattern:
 * - Generates one service per management (e.g., BookmarkService)
 * - Service injects readAdaptor and writeAdaptor
 * - Routes calls by CRUD operation type
 * - Generates ports interface for each service
 * - Generates adaptor-selector.ts for manual composition
 *
 * Usage in WARP.ts:
 *   const front = loom.spiral.typescript.ddd()
 *     .tieup({ treadles: [{ treadle: dddServicesTreadle, config: {} }] });
 */

import { declareTreadle } from '../treadle-kit/index.js';
import type { NewFileSpec } from '../treadle-kit/declarative.js';

// ============================================================================
// Treadle Definition
// ============================================================================

export const generateDddServices = declareTreadle({
  name: 'ddd-services',

  // Tieup treadle - no matches needed
  methods: {
    filter: 'front',
    pipeline: []
  },

  // Generate outputs per management
  newFiles: [
    (ctx) => {
      const methodsByMgmt = ctx.methods.byManagement();
      if (!methodsByMgmt || methodsByMgmt.size === 0) {
        console.log('[ddd-services] No management methods found, skipping generation');
        return [];
      }

      // Convert Map values to array for iteration
      // Note: methods will be passed via generateCode transform, not in context
      const services = ctx.mgmts.all;
      const outputs: NewFileSpec[] = [];

      console.log(
        `[ddd-services] Generating services for: ${services.map((s) => s.name).join(', ')}`
      );

      // Generate one port and service per management
      for (const service of services) {
        const entityCamel = service.entityName.camelCase;

        // Port interface - methods come from context via generateCode transform
        outputs.push({
          template: 'ddd/port.ts.mejs',
          path: `src/ports/${entityCamel}.port.ts`,
          context: { service }
        });

        // Service implementation
        outputs.push({
          template: 'ddd/service.ts.mejs',
          path: `src/services/${entityCamel}.service.ts`,
          context: { service }
        });
      }

      outputs.push({
        template: 'ddd/services-index.ts.mejs',
        path: 'src/services/index.ts',
        context: { services }
      });

      return outputs;
    }
  ],

  // Template data - methods available via context.methods
  data: (ctx) => {
    return {
      services: ctx.mgmts.all,
      hasServices: ctx.mgmts.all.length > 0
    };
  },

  // Hookups: Wire generated services into main index.ts
  hookups: [
    /*
    {
      path: 'src/index.ts',
      exports: [{ source: '../spire/src/services/index.js', star: true }]
    },
    {
      path: 'src/index.ts',
      exports: ["export { createServices } from '../spire/src/adaptor-selector.js';"]
    }
    */
  ]
});
