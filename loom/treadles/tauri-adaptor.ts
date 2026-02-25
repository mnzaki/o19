/**
 * Tauri Adaptor Treadle
 *
 * Generates Tauri-specific adaptor code for the front layer.
 * This connects the TypeScript domain layer to Tauri commands.
 *
 * Usage in WARP.ts (tieup style - no matches needed):
 *   .tieup(tauri, {
 *     treadles: [{
 *       treadle: tauriAdaptorTreadle,
 *       warpData: {
 *         entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
 *         operations: ['create', 'read', 'update', 'delete', 'list'],
 *       }
 *     }]
 *   })
 */

import {
  defineTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';

/**
 * Configuration for TauriAdaptorTreadle
 */
export interface TauriAdaptorConfig {
  /** Entity names to generate adaptors for */
  entities: string[];
  /** CRUD operations to support */
  operations: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function toPascal(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toLower(str: string): string {
  return str.toLowerCase();
}

// ============================================================================
// Treadle Definition (Tieup Style - No Matches)
// ============================================================================

export const tauriAdaptorTreadle = defineTreadle({
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
  outputs: [(ctx) => {
    const config = ctx.config as TauriAdaptorConfig | undefined;
    if (!config?.entities) {
      console.log('[tauri-adaptor] No entities configured, skipping generation');
      return [];
    }

    const outputs: OutputSpec[] = [];
    const entities = config.entities;
    const operations = config.operations || [];

    console.log(`[tauri-adaptor] Generating for entities: ${entities.join(', ')}`);
    console.log(`[tauri-adaptor] Operations: ${operations.join(', ')}`);

    // Generate command handlers for each entity
    for (const entity of entities) {
      const entityLower = toLower(entity);
      const entityPascal = toPascal(entity);
      
      outputs.push({
        template: 'tauri/commands.ts.ejs',
        path: `src/tauri/commands/${entityLower}.commands.ts`,
        language: 'typescript',
        // Per-output context data - merged with main data for this output only
        context: {
          entity: {
            name: entity,
            pascal: entityPascal,
            lower: entityLower
          },
          operations: operations
        }
      });
    }

    // Main adaptor index
    outputs.push({
      template: 'tauri/adaptor.ts.ejs',
      path: 'src/tauri/adaptor.gen.ts',
      language: 'typescript',
      context: {
        entities: entities.map(e => ({
          name: e,
          pascal: toPascal(e),
          lower: toLower(e)
        })),
        operations: operations
      }
    });

    return outputs;
  }],

  // Template data - provides base configuration
  data: (ctx) => {
    const config = ctx.config as TauriAdaptorConfig | undefined;
    if (!config) {
      return { entities: [], operations: [] };
    }

    return {
      entities: config.entities.map(e => ({
        name: e,
        pascal: toPascal(e),
        lower: toLower(e)
      })),
      operations: config.operations || []
    };
  }
});

// ============================================================================
// Exports
// ============================================================================

export type { TauriAdaptorConfig };
export const generateTauriAdaptors = generateFromTreadle(tauriAdaptorTreadle);
