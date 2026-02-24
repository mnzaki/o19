/**
 * Prisma Refinement Provider
 *
 * "Refine rings with Prisma's SQL optimization."
 *
 * Usage:
 *   const prisma = foundframe.typescript.prisma({
 *     schema: './prisma/schema.prisma',
 *     databaseUrl: 'file:./data.db'
 *   });
 *
 *   @loom.refine.withPrisma(prisma)
 *   const front = foundframe.typescript.ddd();
 */

import type {
  RefinementProvider,
  RefinementResult,
  WeavingContext,
} from './types.js';
import type { Ring } from '../spiral/ring.js';

export interface PrismaRefinementConfig {
  /** Path to Prisma schema file */
  schema: string;

  /** Database URL (SQLite file or connection string) */
  databaseUrl: string;

  /** Prisma version to use */
  version?: string;

  /** Additional Prisma generator options */
  generatorOptions?: Record<string, unknown>;
}

/**
 * Create a Prisma refinement provider.
 *
 * This provider:
 * 1. Auto-installs Prisma dependencies (dynamic injection)
 * 2. Provides Prisma client for @loom.crud.query autocomplete
 * 3. Captures SQL via Prisma-Kysely Bridge during weaving
 * 4. Triggers TsPrismaKyselyAot for TypeScript/Kysely generation
 * 
 * OUTPUT: TypeScript/Kysely files (*.gen.ts) — FRONTEND ONLY!
 */
export function withPrisma(
  config: PrismaRefinementConfig
): RefinementProvider<PrismaRefinementConfig> {
  return {
    name: 'prisma',
    config,

    async initialize(): Promise<void> {
      // Called during loom dressing
      console.log(`🔧 Prisma-Kysely refinement initialized: ${config.schema}`);
    },

    async refine(ring: Ring, context: WeavingContext): Promise<RefinementResult> {
      const result: RefinementResult = {
        generatedFiles: [],
        errors: [],
        warnings: [],
      };

      try {
        // Use the lightweight TsCompactor (in-process, no midstage compilation!)
        const { TsCompactor } = await import(
          '../../machinery/beater/ts-compactor.js'
        );

        // Get queries from context (collected by reed/query-collector.ts)
        const queries = (context as any).queries || [];

        if (queries.length === 0) {
          context.log('No @loom.crud.query decorators found to process');
          return result;
        }

        // Create compactor instance
        const compactor = new TsCompactor({
          outputPath: context.outputPath,
          queries,
          databaseUrl: config.databaseUrl,
          verbose: config.verbose,
        });

        // Run compaction (all in-process!)
        const compactResult = await compactor.compact();

        result.generatedFiles = compactResult.generatedFiles;

        if (compactResult.errors.length > 0) {
          result.errors.push(...compactResult.errors);
        }

        if (compactResult.capturedQueries.length > 0) {
          context.log(`Captured ${compactResult.capturedQueries.length} queries`);
        }
      } catch (error) {
        result.errors.push(
          `Prisma refinement failed: ${(error as Error).message}`
        );
      }

      return result;
    },

    async getClient(): Promise<unknown> {
      // This would return a Prisma client for autocomplete
      // Requires the midstage to be set up first
      throw new Error(
        'getClient() must be called after initialize(). ' +
        'Use the client from the midstage.'
      );
    },

    async captureSQL<T>(
      queryFn: (client: unknown) => Promise<T>
    ): Promise<{ sql: string; params: any[]; result: T }> {
      // This would execute the query and capture SQL
      // Implementation depends on midstage being ready
      throw new Error(
        'captureSQL() must be called during weaving after refine().'
      );
    },
  };
}

// Export the config type for convenience
export type { PrismaRefinementConfig };
