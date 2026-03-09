/**
 * ⚠️  KIMI NOTICE: Before editing this treadle, read HOW_TO_LOOM.md
 *     The loom has patterns. Understanding them prevents cross-cutting.
 *     Conservation spiral matters. Read before weaving. 🌀
 *
 * KyselyAdaptorTreadle - Declarative treadle for generating Kysely adaptor implementations
 *
 * Generates TypeScript Kysely adaptor implementations for foundframe-front ports.
 * Uses Prisma-generated types from foundframe-front/src/db/types.ts
 *
 * Usage in WARP.ts (tieup style - no matches needed):
 *   const front = loom.spiral.typescript.ddd().tieup({
 *     treadles: [{
 *       treadle: kyselyAdaptorTreadle,
 *       warpData: {
 *         entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
 *         operations: ['create', 'read', 'update', 'delete', 'list'],
 *       }
 *     }]
 *   });
 */

import {
  declareTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';

/**
 * Configuration for KyselyAdaptorTreadle
 */
export interface KyselyAdaptorConfig {
  /** Entity names to generate adaptors for */
  entities: string[];
  /** CRUD operations to support */
  operations: ('create' | 'read' | 'update' | 'delete' | 'list')[];
}

// ============================================================================
// Helper Functions for Template Data
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

export const kyselyAdaptorTreadle = declareTreadle({
  name: 'kysely-adaptor',

  // Configuration schema for validation
  config: {
    entities: [] as string[],
    operations: [] as ('create' | 'read' | 'update' | 'delete' | 'list')[]
  },

  // Method configuration (required but minimal for tieup treadles)
  methods: {
    filter: 'front',
    pipeline: []
  },

  // Dynamic outputs - one per entity + index + factory
  newFiles: [
    (ctx) => {
      const config = ctx.config as KyselyAdaptorConfig | undefined;
      if (!config?.entities) {
        return [];
      }

      const outputs: OutputSpec[] = [];
      const entities = config.entities;
      const operations = config.operations || ['read', 'list'];

      // Generate one output file per entity
      for (const entity of entities) {
        const entityLower = toLower(entity);
        const entityPascal = toPascal(entity);

        outputs.push({
          template: 'kysely/adaptor.ts.mejs',
          path: `src/adaptors/${entityLower}.adaptor.ts`,
          language: 'typescript',
          // Per-output context with entity-specific data
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

      // Index file
      outputs.push({
        template: 'kysely/index.ts.mejs',
        path: 'src/adaptors/index.ts',
        language: 'typescript',
        context: {
          entities: entities.map((e) => ({
            name: e,
            pascal: toPascal(e),
            lower: toLower(e)
          })),
          operations: operations
        }
      });

      // Factory file
      outputs.push({
        template: 'kysely/factory.ts.mejs',
        path: 'src/adaptors/factory.ts',
        language: 'typescript',
        context: {
          entities: entities.map((e) => ({
            name: e,
            pascal: toPascal(e),
            lower: toLower(e)
          })),
          operations: operations
        }
      });

      return outputs;
    }
  ],

  // Template data - provides base configuration
  data: (ctx) => {
    const config = ctx.config as KyselyAdaptorConfig | undefined;
    if (!config) {
      return { entities: [], operations: [] };
    }

    return {
      entities: config.entities.map((e) => ({
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

export const generateKyselyAdaptors = generateFromTreadle(kyselyAdaptorTreadle);
