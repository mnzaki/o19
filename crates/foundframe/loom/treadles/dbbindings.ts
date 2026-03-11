/**
 * DbBindingTreadle - Generates Rust data structs and DB traits from entity metadata
 *
 * Uses context.entities (like context.methods) to discover entities and their fields.
 * Generates complete DbActor implementation with SQL queries.
 */

import {
  declareTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';
import { HookupSpec } from '../../../../packages/spire-loom/machinery/sley/hookups';

/**
 * Map Rust types to SQLite types
 */
function mapSqlType(rustType: string, tsType: string): string {
  if (rustType.startsWith('Option<')) {
    const inner = rustType.replace('Option<', '').replace('>', '');
    return mapSqlType(inner, tsType);
  }

  switch (rustType) {
    case 'i64':
    case 'i32':
      return 'INTEGER';
    case 'f64':
    case 'f32':
      return 'REAL';
    case 'bool':
      return 'BOOLEAN';
    case 'String':
      return 'TEXT';
    case 'serde_json::Value':
      return 'TEXT'; // JSON stored as text
    default:
      if (tsType === 'Date') return 'INTEGER'; // Unix timestamp
      return 'TEXT';
  }
}

export const dbBindingTreadle = declareTreadle({
  name: 'db-binding',

  methods: {
    filter: 'core',
    pipeline: []
  },

  newFiles: [
    (ctx) => {
      // ctx.entities is BoundQuery<LanguageEntity> - use .all to get entities
      // Each LanguageEntity has .name (Name object) and .fields
      const entities = ctx.entities?.all || [];

      if (entities.length === 0) {
        return [];
      }

      const outputs: OutputSpec[] = [];

      for (const entity of entities) {
        // Build field data for templates from entity metadata
        const fields = (entity.fields || []).map((f: any) => {
          let baseRustType = f.rustType || 'String';
          if (f.tsType === 'object' && baseRustType === 'String') {
            baseRustType = 'serde_json::Value';
          }
          const rustType = f.nullable ? `Option<${baseRustType}>` : baseRustType;
          const sqlType = mapSqlType(baseRustType, f.tsType || 'string');

          return {
            name: f.name,
            snakeName: f.name.snakeCase || f.name,
            type: rustType,  // Template uses field.type
            rustType: rustType,
            baseRustType: baseRustType,
            sqlType: sqlType,
            tsType: f.tsType,
            nullable: f.nullable,
            isPrimary: f.isPrimary,
            isCreatedAt: f.isCreatedAt,
            isUpdatedAt: f.isUpdatedAt
          };
        });

        const entityData = {
          name: entity.name,  // Name object - templates use {{ entity.name }}
          lower: entity.name.camelCase,  // camelCase for filenames
          snake: entity.name.snakeCase,
          managementName: entity.managementName,
          fields
        };

        // Entity data struct file
        outputs.push({
          template: 'rust/db/entity_data.rs.mejs',
          path: `src/db/entities/${entity.name.camelCase}_data.gen.rs`,
          language: 'rust',
          context: { entity: entityData }
        });

        // Entity trait file
        outputs.push({
          template: 'rust/db/entity_trait.rs.mejs',
          path: `src/db/entities/${entity.name.camelCase}_trait.gen.rs`,
          language: 'rust',
          context: { entity: entityData }
        });
      }

      // Generate unified DbCommand enum
      outputs.push({
        template: 'rust/db/db_command.rs.mejs',
        path: `src/db/commands.gen.rs`,
        language: 'rust',
        context: { entities }
      });

      // Generate DbHandle methods
      outputs.push({
        template: 'rust/db/db_handle.rs.mejs',
        path: `src/db/handle.gen.rs`,
        language: 'rust',
        context: { entities }
      });

      // Generate complete DbActor implementation in spire/
      outputs.push({
        template: 'rust/db/db_actor.rs.mejs',
        path: `src/db/actor_impl.gen.rs`,
        language: 'rust',
        context: { entities }
      });

      return outputs;
    }
  ],

  data: (ctx) => {
    // ctx.entities is BoundQuery<LanguageEntity> with .all getter
    // Pass entities directly - templates use Name object's toString()
    const entities = ctx.entities?.all || [];

    return { entities };
  },

  // Use hookups instead of patches (patches are deprecated)
  hookups: (ctx) =>
    ctx.entities!.all.map(
      (entity) =>
        ({
          path: 'src/db/mod.rs',
          moduleDeclarations: [
            {
              name: `${entity.name.camelCase}_data`,
              path: `../../spire/src/db/entities/${entity.name.camelCase}_data.gen.rs`,
              pub: true
            },
            {
              name: `${entity.name.camelCase}_trait`,
              path: `../../spire/src/db/entities/${entity.name.camelCase}_trait.gen.rs`,
              pub: true
            }
          ],
          useStatements: [
            `pub use ${entity.name.camelCase}_data::${entity.name.pascalCase}Data;`,
            `pub use ${entity.name.camelCase}_trait::${entity.name.pascalCase}Db;`
          ]
        }) as HookupSpec
    )
});

export const generateDbBindings = generateFromTreadle(dbBindingTreadle);
