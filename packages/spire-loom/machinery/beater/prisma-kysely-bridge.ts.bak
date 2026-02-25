/**
 * Prisma-Kysely Bridge
 *
 * "Prisma steers, Kysely reveals the path."
 *
 * A Prisma Client Extension that intercepts queries and translates them
 * to Kysely, enabling SQL capture at generation time.
 *
 * This is the "Trojan Horse" pattern — Prisma's API on the outside,
 * Kysely's SQL generation on the inside.
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Callback invoked when a query is captured.
 */
export type QueryCaptureCallback = (
  sql: string,
  params: unknown[],
  model: string,
  operation: string
) => void;

/**
 * Create a Prisma client with the Kysely bridge extension.
 *
 * @param basePrisma - The base Prisma client
 * @param onQuery - Callback to capture generated SQL
 * @returns Extended Prisma client
 */
export function createPrismaKyselyBridge(
  basePrisma: PrismaClient,
  onQuery: QueryCaptureCallback
): PrismaClient {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // For now, we'll use Prisma's query log to capture SQL
          // Future: Full Kysely translation
          
          // Set up query logging for this operation
          const queries: Array<{ query: string; params: string }> = [];
          
          const handler = (e: any) => {
            queries.push({
              query: e.query,
              params: e.params
            });
          };
          
          // Subscribe to query events
          (basePrisma as any).$on('query', handler);
          
          try {
            // Execute the original Prisma query
            const result = await query(args);
            
            // Capture the SQL that was generated
            if (queries.length > 0) {
              const lastQuery = queries[queries.length - 1];
              onQuery(
                lastQuery.query,
                JSON.parse(lastQuery.params || '[]'),
                model,
                operation
              );
            }
            
            return result;
          } finally {
            // Unsubscribe
            (basePrisma as any).$off('query', handler);
          }
        }
      }
    }
  }) as PrismaClient;
}

/**
 * Capture SQL from a Prisma query execution.
 *
 * This is a convenience wrapper that creates a temporary bridge,
 * executes the query, and returns the captured SQL.
 */
export async function capturePrismaSQL<T>(
  prisma: PrismaClient,
  queryFn: (prisma: PrismaClient) => Promise<T>
): Promise<{
  result: T;
  sql: string;
  params: unknown[];
  model: string;
  operation: string;
}> {
  let captured: {
    sql: string;
    params: unknown[];
    model: string;
    operation: string;
  } | null = null;

  const bridged = createPrismaKyselyBridge(prisma, (sql, params, model, operation) => {
    captured = { sql, params, model, operation };
  });

  const result = await queryFn(bridged);

  if (!captured) {
    throw new Error('No SQL was captured. Query may have been cached or no DB operation was performed.');
  }

  return {
    result,
    ...captured
  };
}

/**
 * Validate a captured SQL query.
 *
 * Runs EXPLAIN QUERY PLAN to check for performance issues.
 */
export async function validateQuery(
  prisma: PrismaClient,
  sql: string
): Promise<{
  valid: boolean;
  plan: string;
  warnings: string[];
}> {
  const warnings: string[] = [];

  try {
    // Run EXPLAIN QUERY PLAN
    const planResult = await (prisma as any).$queryRawUnsafe(
      `EXPLAIN QUERY PLAN ${sql}`
    );

    const planStr = JSON.stringify(planResult);

    // Check for full table scans
    if (planStr.includes('SCAN TABLE')) {
      warnings.push('Query performs full table scan');
    }

    // Check for temporary b-trees (sorting without index)
    if (planStr.includes('USE TEMP B-TREE')) {
      warnings.push('Query uses temporary B-tree for sorting');
    }

    return {
      valid: warnings.length === 0,
      plan: planStr,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      plan: '',
      warnings: [`EXPLAIN failed: ${(error as Error).message}`]
    };
  }
}
