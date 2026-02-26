/**
 * DbBindingTreadle - Generates Rust data structs and DB traits from entity metadata
 *
 * Uses context.entities to discover entities.
 * 
 * CURRENT LIMITATION: Field metadata is not available from decorators.
 * The generated structs are placeholders with just an id field.
 * See MISSING_METADATA.md for what's needed for full functionality.
 */

import {
  defineTreadle,
  generateFromTreadle,
  type OutputSpec,
  type PatchSpec
} from '@o19/spire-loom/machinery/treadle-kit';

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function toLower(str: string): string {
  return str.toLowerCase();
}

export const dbBindingTreadle = defineTreadle({
  name: 'db-binding',

  methods: {
    filter: 'core',
    pipeline: []
  },

  outputs: [(ctx) => {
    const entities = ctx.entities?.all || [];
    
    if (entities.length === 0) {
      return [];
    }

    const outputs: OutputSpec[] = [];

    for (const entity of entities) {
      const entityName = entity.name;
      const entityLower = toLower(entityName);
      
      // Minimal entity data - just what we have available
      const entityData = {
        name: entityName,
        lower: entityLower,
        snake: toSnake(entityName),
        managementName: entity.managementName,
        // NOTE: Fields are not available - see MISSING_METADATA.md
        hasFields: false
      };
      
      // Entity data struct file (placeholder)
      outputs.push({
        template: 'rust/db/entity_data.rs.ejs',
        path: `src/db/entities/${entityLower}_data.gen.rs`,
        language: 'rust',
        context: { entity: entityData }
      });
      
      // Entity trait file (placeholder)
      outputs.push({
        template: 'rust/db/entity_trait.rs.ejs',
        path: `src/db/entities/${entityLower}_trait.gen.rs`,
        language: 'rust',
        context: { entity: entityData }
      });
      
      // Commands file (placeholder)
      outputs.push({
        template: 'rust/db/commands.rs.ejs',
        path: `src/db/commands/${entityLower}.gen.rs`,
        language: 'rust',
        context: { entity: entityData }
      });
    }

    return outputs;
  }],

  data: (ctx) => {
    const entities = ctx.entities?.all || [];
    
    return {
      entities: entities.map((e: any) => ({
        name: e.name,
        lower: toLower(e.name),
        snake: toSnake(e.name)
      }))
    };
  },

  patches: [(ctx) => {
    const entities = ctx.entities?.all || [];
    
    if (entities.length === 0) {
      return [];
    }

    return [{
      type: 'ensureBlock',
      targetFile: 'src/db/mod.rs',
      marker: 'db-modules',
      template: 'rust/db/mod.rs.ejs',
      language: 'rust'
    }];
  }]
});

export const generateDbBindings = generateFromTreadle(dbBindingTreadle);
