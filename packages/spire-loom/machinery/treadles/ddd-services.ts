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
import { map, toArray } from '../sley/iterators.js';

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

  // Generate outputs per management using iterators (APP-004)
  newFiles: [
    (ctx) => {
      const methodsByMgmt = ctx.methods.byManagement();
      if (!methodsByMgmt || methodsByMgmt.size === 0) {
        console.log('[ddd-services] No management methods found, skipping generation');
        return [];
      }

      // APP-004: Use iterator utilities for lazy, composable generation
      // Generate one port and service per management using map
      const serviceOutputs = toArray(
        map(ctx.mgmts, (service) => {
          const entityCamel = service.entityName.camelCase;
          return [
            // Port interface - methods come from context via generateCode transform
            {
              template: 'ddd/port.ts.mejs',
              path: `src/ports/${entityCamel}.port.ts`,
              context: { service }
            },
            // Service implementation
            {
              template: 'ddd/service.ts.mejs',
              path: `src/services/${entityCamel}.service.ts`,
              context: { service }
            }
          ];
        })
      ).flat();

      console.log(
        `[ddd-services] Generating services for: ${toArray(map(ctx.mgmts, (s) => s.name)).join(', ')}`
      );

      // Append index file
      return [
        ...serviceOutputs,
        {
          template: 'ddd/services-index.ts.mejs',
          path: 'src/services/index.ts',
          context: { services: toArray(ctx.mgmts) }
        }
      ];
    }
  ],

  // Template data - methods available via context.methods
  // APP-004: Use countItems instead of .all.length for lazy counting
  data: (ctx) => {
    return {
      services: toArray(ctx.mgmts),
      hasServices: ctx.mgmts.count > 0
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
