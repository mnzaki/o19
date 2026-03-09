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

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

function toLower(str: string): string {
  return str.toLowerCase();
}

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
      const entities = ctx.entities?.withFields() || [];

      if (entities.length === 0) {
        return [];
      }

      const outputs: OutputSpec[] = [];

      for (const entity of entities) {
        const entityName = entity.name;
        const entityLower = toLower(entityName);

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
            snakeName: toSnake(f.name),
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
          name: entityName,
          lower: entityLower,
          snake: toSnake(entityName),
          managementName: entity.managementName,
          fields
        };

        // Entity data struct file
        outputs.push({
          template: 'rust/db/entity_data.rs.mejs',
          path: `src/db/entities/${entityLower}_data.gen.rs`,
          language: 'rust',
          context: { entity: entityData }
        });

        // Entity trait file
        outputs.push({
          template: 'rust/db/entity_trait.rs.mejs',
          path: `src/db/entities/${entityLower}_trait.gen.rs`,
          language: 'rust',
          context: { entity: entityData }
        });
      }

      // Generate unified DbCommand enum
      outputs.push({
        template: 'rust/db/db_command.rs.mejs',
        path: `src/db/commands.gen.rs`,
        language: 'rust',
        context: {
          entities: entities.map((e: any) => ({
            name: e.name,
            lower: toLower(e.name),
            snake: toSnake(e.name),
            fields: (e.fields || []).map((f: any) => {
              let baseRustType = f.rustType || 'String';
              if (f.tsType === 'object' && baseRustType === 'String') {
                baseRustType = 'serde_json::Value';
              }
              return {
                name: f.name,
                snakeName: toSnake(f.name),
                rustType: f.nullable ? `Option<${baseRustType}>` : baseRustType,
                nullable: f.nullable,
                isPrimary: f.isPrimary,
                isCreatedAt: f.isCreatedAt,
                isUpdatedAt: f.isUpdatedAt
              };
            })
          }))
        }
      });

      // Generate DbHandle methods
      outputs.push({
        template: 'rust/db/db_handle.rs.mejs',
        path: `src/db/handle.gen.rs`,
        language: 'rust',
        context: {
          entities: entities.map((e: any) => ({
            name: e.name,
            lower: toLower(e.name),
            snake: toSnake(e.name),
            fields: (e.fields || []).map((f: any) => {
              let baseRustType = f.rustType || 'String';
              if (f.tsType === 'object' && baseRustType === 'String') {
                baseRustType = 'serde_json::Value';
              }
              return {
                name: f.name,
                snakeName: toSnake(f.name),
                rustType: f.nullable ? `Option<${baseRustType}>` : baseRustType,
                nullable: f.nullable,
                isPrimary: f.isPrimary,
                isCreatedAt: f.isCreatedAt,
                isUpdatedAt: f.isUpdatedAt
              };
            })
          }))
        }
      });

      // Generate complete DbActor implementation in spire/
      outputs.push({
        template: 'rust/db/db_actor.rs.mejs',
        path: `src/db/actor_impl.gen.rs`,
        language: 'rust',
        context: {
          entities: entities.map((e: any) => ({
            name: e.name,
            lower: toLower(e.name),
            snake: toSnake(e.name),
            fields: (e.fields || []).map((f: any) => {
              let baseRustType = f.rustType || 'String';
              if (f.tsType === 'object' && baseRustType === 'String') {
                baseRustType = 'serde_json::Value';
              }
              const sqlType = mapSqlType(baseRustType, f.tsType || 'string');
              return {
                name: f.name,
                snakeName: toSnake(f.name),
                rustType: f.nullable ? `Option<${baseRustType}>` : baseRustType,
                baseRustType: baseRustType,
                sqlType: sqlType,
                nullable: f.nullable,
                isPrimary: f.isPrimary,
                isCreatedAt: f.isCreatedAt,
                isUpdatedAt: f.isUpdatedAt
              };
            })
          }))
        }
      });

      return outputs;
    }
  ],

  data: (ctx) => {
    const entities = ctx.entities?.withFields() || [];

    return {
      entities: entities.map((e: any) => ({
        name: e.name,
        lower: toLower(e.name),
        snake: toSnake(e.name)
      }))
    };
  },

  // Use hookups instead of patches (patches are deprecated)
  // // Update mod.rs to include entity modules
  hookups: (ctx) =>
    ctx.entities!.all.map(
      (entity) =>
        ({
          path: 'src/db/mod.rs',
          moduleDeclarations: [
            {
              name: `${toLower(entity.name)}_data`,
              path: `../../spire/src/db/entities/${toLower(entity.name)}_data.gen.rs`,
              pub: true
            },
            {
              name: `${toLower(entity.name)}_trait`,
              path: `../../spire/src/db/entities/${toLower(entity.name)}_trait.gen.rs`,
              pub: true
            }
          ],
          useStatements: [
            `pub use ${toLower(entity.name)}_data::${entity.name}Data;`,
            `pub use ${toLower(entity.name)}_trait::${entity.name}Db;`
          ]
        }) as HookupSpec
    )
});

export const generateDbBindings = generateFromTreadle(dbBindingTreadle);
