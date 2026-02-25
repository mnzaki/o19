/**
 * ⚠️  KIMI NOTICE: Before editing this treadle, read HOW_TO_LOOM.md
 *     The loom has patterns. Understanding them prevents cross-cutting.
 *     Conservation spiral matters. Read before weaving. 🌀
 *
 * DbBindingTreadle - Declarative treadle for generating DbActor bindings
 *
 * Generates SQLite entity traits and DbCommand variants for foundframe entities.
 * Used with .tieup() to generate inside the foundframe crate.
 *
 * Usage in WARP.ts (tieup style):
 *   const foundframe = loom.spiral(Foundframe).tieup({
 *     treadles: [{
 *       treadle: dbBindingTreadle,
 *       warpData: {
 *         entities: ['Bookmark', 'Media', 'Post', 'Person'],
 *         operations: ['create', 'read', 'update', 'delete', 'list']
 *       }
 *     }]
 *   });
 */

import {
  defineTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';

/**
 * Configuration for DbBindingTreadle
 */
export interface DbBindingConfig {
  /** Entity names to generate bindings for */
  entities: string[];
  /** CRUD operations to support */
  operations: ('create' | 'read' | 'update' | 'delete' | 'list')[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function toLower(str: string): string {
  return str.toLowerCase();
}

// ============================================================================
// Treadle Definition (Tieup Style - No Matches)
// ============================================================================

export const dbBindingTreadle = defineTreadle({
  name: 'db-binding',

  // Method configuration (required but minimal for tieup treadles)
  methods: {
    filter: 'core',
    pipeline: []
  },

  // Dynamic outputs - entity traits and commands for each entity
  outputs: [(ctx) => {
    const config = ctx.config as DbBindingConfig | undefined;
    if (!config?.entities) {
      return [];
    }

    const outputs: OutputSpec[] = [];
    const entities = config.entities;

    // Generate entity trait and commands files for each entity
    for (const entity of entities) {
      const entityLower = toLower(entity);
      
      // Entity trait file
      outputs.push({
        template: 'rust/db/entity_trait.rs.ejs',
        path: `src/db/entities/${entityLower}.gen.rs`,
        language: 'rust'
      });
      
      // Commands file
      outputs.push({
        template: 'rust/db/commands.rs.ejs',
        path: `src/db/commands/${entityLower}.gen.rs`,
        language: 'rust'
      });
    }

    return outputs;
  }],

  // Template data - provides entity configuration to templates
  data: (ctx) => {
    const config = ctx.config as DbBindingConfig | undefined;
    if (!config) {
      return { entities: [], operations: [] };
    }

    return {
      entities: config.entities.map(e => ({
        name: e,
        lower: toLower(e),
        snake: toSnake(e)
      })),
      operations: config.operations || []
    };
  },

  // Patch db/mod.rs to include generated modules
  patches: [(ctx) => {
    const config = ctx.config as DbBindingConfig | undefined;
    if (!config?.entities) {
      return [];
    }

    return {
      type: 'ensureBlock',
      targetFile: 'src/db/mod.rs',
      marker: 'db-modules',
      template: 'rust/db/mod.rs.ejs',
      language: 'rust'
    };
  }]
});

// ============================================================================
// Exports
// ============================================================================

export type { DbBindingConfig };
export const generateDbBindings = generateFromTreadle(dbBindingTreadle);
