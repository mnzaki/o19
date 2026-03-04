/**
 * Tauri Adaptor Treadle (Builtin)
 *
 * Generates Tauri-specific adaptor code for the front layer.
 * This connects the TypeScript domain layer to Tauri commands.
 *
 * Usage in WARP.ts (tieup style):
 *   .tieup(tauri, {
 *     treadles: [{
 *       treadle: tauriAdaptorTreadle,
 *       warpData: {
 *         entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
 *         operations: ['create', 'read', 'update', 'delete', 'list'],
 *         pluginName: 'o19-foundframe-tauri'
 *       }
 *     }]
 *   })
 */

import {
  camelCase,
  declareTreadle,
  generateFromTreadle,
  pascalCase,
  type OutputSpec
} from '../treadle-kit/index.js';

/**
 * Configuration for TauriAdaptorTreadle
 */
export interface TauriAdaptorConfig {
  /** Entity names to generate adaptors for */
  entities: string[];
  /** CRUD operations to support */
  operations: string[];
  /** The name of the tauri plugin to invoke */
  pluginName?: string;
}

// ============================================================================
// Treadle Definition
// ============================================================================

export const tauriAdaptorTreadle = declareTreadle({
  name: 'tauri-adaptor',

  // Configuration schema for validation
  config: {
    entities: [] as string[],
    operations: [] as string[]
  },

  // Method configuration (required but minimal for tieup treadles)
  methods: {
    filter: 'front',
    pipeline: []
  },

  // Dynamic outputs based on configuration
  outputs: [
    (ctx) => {
      const config = ctx.config as TauriAdaptorConfig | undefined;
      if (!config) {
        console.log('[tauri-adaptor] No configuration found, skipping generation');
        return [];
      }
      // WE don't want alllll entities TODO FIXME do we have like pariedDevice
      // and so on??
      const entities = ctx.entities?.all;
      if (!entities) {
        console.log('[tauri-adaptor] No entities found, skipping generation');
        return [];
      }

      const methodsByMgmt = ctx.methods?.byManagement();
      if (!methodsByMgmt || methodsByMgmt.size === 0) {
        console.log('[tauri-adaptor] No management methods found, skipping generation');
        return [];
      }

      // Extract service metadata only (methods will come from locals.methods)
      const services = Array.from(methodsByMgmt.values()).map((mgmt) => ({
        name: mgmt.name,
        entityName: mgmt.entityName,
        entityCamelName: camelCase(mgmt.entityName),
        portName: mgmt.portName
      }));

      const outputs: OutputSpec[] = [];

      const operations = config?.operations || [];

      console.log(`[tauri-adaptor] Generating for entities: ${entities.join(', ')}`);
      console.log(`[tauri-adaptor] Operations: ${operations.join(', ')}`);

      // Generate command handlers for each entity
      for (const entity of entities) {
        const entityCamel = camelCase(entity.name);
        const entityPascal = pascalCase(entity.name);

        outputs.push({
          template: 'tauri/commands.ts.mejs',
          path: `ts/commands/${entityCamel}.commands.ts`,
          language: 'typescript',
          context: {
            entity: {
              name: entity.name,
              pascal: entityPascal,
              camel: entityCamel
            },
            operations: operations,
            pluginName: config.pluginName
          }
        });
      }

      // Generate adaptor wiring for each service
      for (const service of services) {
        const entityCamel = camelCase(service.entityName);
        outputs.push({
          template: 'tauri/adaptor.ts.mejs',
          path: `ts/adaptors/${entityCamel}.adaptor.ts`,
          language: 'typescript',
          context: { service, pluginName: config.pluginName }
        });
      }

      // Commands index file
      outputs.push({
        template: 'tauri/commands-index.ts.mejs',
        path: 'ts/commands/index.ts',
        language: 'typescript',
        context: {
          entities: entities.map((e) => ({
            name: e,
            pascal: pascalCase(e.name),
            camel: camelCase(e.name)
          })),
          operations: operations
        }
      });

      // Main adaptor index
      outputs.push({
        template: 'tauri/adaptors-index.ts.mejs',
        path: 'ts/adaptors/index.ts',
        language: 'typescript',
        context: {
          entities: entities.map((e) => ({
            name: e,
            pascal: pascalCase(e.name),
            camel: camelCase(e.name),
            serviceName: e.serviceName,
            serviceNameCamel: camelCase(e.serviceName)
          })),
          operations: operations,
          pluginName: config.pluginName
        }
      });

      return outputs;
    }
  ],

  // Template data - provides base configuration
  data: (ctx) => {
    const config = ctx.config as TauriAdaptorConfig | undefined;
    if (!config) {
      return { entities: [], operations: [] };
    }

    return {
      entities: config.entities.map((e) => ({
        name: e,
        pascal: pascalCase(e),
        camel: camelCase(e)
      })),
      operations: config.operations || []
    };
  },

  // Note: Permissions are generated by tauri-generator, not here.
  // tauri-generator uses 'platform' methods with addManagementPrefix() pipeline,
  // which produces consistent prefixed names like "bookmark_add_bookmark" -> "allow-bookmark-add-bookmark".
  // This treadle uses 'front' methods without the prefix pipeline,
  // which would produce "add_bookmark" -> "allow-add-bookmark".
  // Having both would create duplicate permissions in default.toml.
});

// ============================================================================
// Exports
// ============================================================================

export const generateTauriAdaptors = generateFromTreadle(tauriAdaptorTreadle);
