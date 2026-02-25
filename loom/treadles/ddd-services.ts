/**
 * DDD Services Treadle (APP-007)
 *
 * Generates domain services, ports, and adaptor wiring for foundframe-front.
 * Uses management methods (not entity lists) as the source of truth.
 *
 * Pattern:
 * - Generates one service per management (e.g., BookmarkService)
 * - Service injects readAdaptor (Kysely) and writeAdaptor (Tauri)
 * - Routes calls by CRUD operation type (read/list → Kysely, create/update/delete → Tauri)
 * - Generates ports interface for each service
 * - Generates adaptor-selector.ts for manual composition
 *
 * Usage in WARP.ts:
 *   const front = loom.spiral.typescript.ddd()
 *     .tieup({ treadles: [{ treadle: dddServicesTreadle, warpData: {} }] });
 */

import {
  defineTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';
import { camelCase } from '@o19/spire-loom/machinery/treadle-kit';
import { tagFilter, crudOperationFilter, type MgmtMethod } from '@o19/spire-loom/machinery/sley';
import type { RawMethod } from '@o19/spire-loom/machinery/bobbin';

// ============================================================================
// Types
// ============================================================================

interface ServiceMethod {
  name: string;
  camelName: string;
  params: Array<{ name: string; tsType: string; optional?: boolean }>;
  returnType: string;
  isCollection: boolean;
  crudOperation?: string;
  description?: string;
}

interface ManagementService {
  name: string; // e.g., "BookmarkMgmt"
  entityName: string; // e.g., "Bookmark"
  serviceName: string; // e.g., "BookmarkService"
  portName: string; // e.g., "BookmarkPort"
  methods: ServiceMethod[];
  readMethods: ServiceMethod[];
  writeMethods: ServiceMethod[];
  passthroughMethods: ServiceMethod[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractEntityName(managementName: string | undefined): string {
  if (!managementName) {
    return 'Unknown';
  }
  return managementName.replace(/Mgmt$/, '');
}

function convertToServiceMethod(method: RawMethod): ServiceMethod {
  return {
    name: method.name,
    camelName: camelCase(method.name),
    params: method.params.map((p) => ({
      name: p.name,
      tsType: p.type,
      optional: p.optional
    })),
    returnType: method.returnType,
    isCollection: method.isCollection,
    crudOperation: (method as any).crudOperation,
    description: method.description
  };
}

function buildManagementServices(methodsByMgmt: Map<string, RawMethod[]>): ManagementService[] {
  const services: ManagementService[] = [];

  methodsByMgmt.forEach((methods, mgmtName) => {
    const entityName = extractEntityName(mgmtName);
    const serviceMethods = methods.map(convertToServiceMethod);

    // Classify methods by CRUD operation
    const readMethods = serviceMethods.filter(
      (m) => m.crudOperation === 'read' || m.crudOperation === 'list'
    );
    const writeMethods = serviceMethods.filter((m) =>
      ['create', 'update', 'delete'].includes(m.crudOperation || '')
    );
    const passthroughMethods = serviceMethods.filter((m) => !m.crudOperation);

    services.push({
      name: mgmtName,
      entityName,
      serviceName: `${entityName}Service`,
      portName: `${entityName}Port`,
      methods: serviceMethods,
      readMethods,
      writeMethods,
      passthroughMethods
    });
  });

  return services;
}

// ============================================================================
// Treadle Definition
// ============================================================================

export const dddServicesTreadle = defineTreadle({
  name: 'ddd-services',

  // Tieup treadle - no matches needed
  methods: {
    filter: 'front',
    pipeline: []
  },

  // Generate outputs per management
  outputs: [
    (ctx) => {
      const methodsByMgmt = ctx.methods?.byManagement();
      if (!methodsByMgmt || methodsByMgmt.size === 0) {
        console.log('[ddd-services] No management methods found, skipping generation');
        return [];
      }

      const services = buildManagementServices(methodsByMgmt);
      const outputs: OutputSpec[] = [];

      console.log(
        `[ddd-services] Generating services for: ${services.map((s) => s.name).join(', ')}`
      );

      // Generate one port, service, and adaptor per management
      for (const service of services) {
        const entityLower = service.entityName.toLowerCase();

        // Port interface
        outputs.push({
          template: 'ddd/port.ts.ejs',
          path: `src/ports/gen/${entityLower}.port.gen.ts`,
          language: 'typescript',
          context: { service }
        });

        // Service implementation
        outputs.push({
          template: 'ddd/service.ts.ejs',
          path: `src/services/gen/${entityLower}.service.gen.ts`,
          language: 'typescript',
          context: { service }
        });

        // Adaptor wiring (if has both read and write methods)
        if (service.readMethods.length > 0 || service.writeMethods.length > 0) {
          outputs.push({
            template: 'ddd/adaptor.ts.ejs',
            path: `src/adaptors/gen/${entityLower}.adaptor.gen.ts`,
            language: 'typescript',
            context: { service }
          });
        }
      }

      // Index files for clean imports
      outputs.push({
        template: 'ddd/ports-index.ts.ejs',
        path: 'src/ports/gen/index.gen.ts',
        language: 'typescript',
        context: { services }
      });

      outputs.push({
        template: 'ddd/services-index.ts.ejs',
        path: 'src/services/gen/index.gen.ts',
        language: 'typescript',
        context: { services }
      });

      outputs.push({
        template: 'ddd/adaptors-index.ts.ejs',
        path: 'src/adaptors/gen/index.gen.ts',
        language: 'typescript',
        context: { services }
      });

      // Manual composition file (adaptor-selector.ts)
      outputs.push({
        template: 'ddd/adaptor-selector.ts.ejs',
        path: 'src/adaptor-selector.gen.ts',
        language: 'typescript',
        context: { services }
      });

      return outputs;
    }
  ],

  // Template data
  data: (ctx) => {
    const methodsByMgmt = ctx.methods?.byManagement();
    const services = methodsByMgmt ? buildManagementServices(methodsByMgmt) : [];

    return {
      services,
      hasServices: services.length > 0
    };
  }
});

// ============================================================================
// Exports
// ============================================================================

export type { ManagementService, ServiceMethod };
export const generateDddServices = generateFromTreadle(dddServicesTreadle);
