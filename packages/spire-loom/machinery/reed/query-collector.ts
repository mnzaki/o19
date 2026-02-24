/**
 * Query Collector
 *
 * "Collect @loom.crud.query decorators from loom files."
 *
 * This module collects query definitions from loom/*.ts files
 * so they can be passed to refinements during weaving.
 */

import { pathToFileURL } from 'node:url';
import { collectQueriesFromModule, type QueryMetadata } from '../../warp/crud.js';

export interface CollectedQuery extends QueryMetadata {
  /** The class this query belongs to */
  className: string;

  /** The file this query was collected from */
  filePath: string;

  /** The spiral this query belongs to (if known) */
  spiralName?: string;

  /** The actual query function (for in-process execution) */
  queryFn?: (client: unknown) => Promise<unknown>;
}

export interface QueryCollectionResult {
  /** All collected queries */
  queries: CollectedQuery[];

  /** Errors encountered during collection */
  errors: string[];

  /** Files that were successfully processed */
  filesProcessed: string[];
}

/**
 * Collect queries from a single loom file.
 *
 * @param filePath - Path to the loom file (e.g., 'loom/media.ts')
 * @returns Array of collected queries
 */
export async function collectQueriesFromFile(
  filePath: string
): Promise<CollectedQuery[]> {
  const fileUrl = pathToFileURL(filePath).href;
  
  try {
    // Import the loom module
    const module = await import(fileUrl);

    // Collect queries from all exports
    const queries: CollectedQuery[] = [];

    for (const [exportName, exported] of Object.entries(module)) {
      // Skip non-class exports
      if (typeof exported !== 'function') continue;

      // Get queries from this class
      const classQueries = collectQueriesFromModule({ [exportName]: exported });
      
      for (const query of classQueries) {
        // Extract the query function from the class method
        const queryFn = extractQueryFunction(exported, query.methodName);
        
        queries.push({
          ...query,
          className: exportName,
          filePath,
          queryFn,
        });
      }
    }

    return queries;
  } catch (error) {
    throw new Error(
      `Failed to collect queries from ${filePath}: ${(error as Error).message}`
    );
  }
}

/**
 * Collect queries from all loom files in a directory.
 *
 * @param loomDir - Directory containing loom files (e.g., './loom')
 * @returns Collection result with all queries and metadata
 */
export async function collectQueriesFromDirectory(
  loomDir: string
): Promise<QueryCollectionResult> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const result: QueryCollectionResult = {
    queries: [],
    errors: [],
    filesProcessed: [],
  };

  try {
    // Read directory
    const entries = await fs.readdir(loomDir, { withFileTypes: true });

    // Find all .ts files
    const tsFiles = entries
      .filter(e => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))
      .map(e => path.join(loomDir, e.name));

    // Process each file
    for (const filePath of tsFiles) {
      try {
        const queries = await collectQueriesFromFile(filePath);
        result.queries.push(...queries);
        result.filesProcessed.push(filePath);
      } catch (error) {
        result.errors.push(
          `Failed to process ${filePath}: ${(error as Error).message}`
        );
      }
    }

    // Also process subdirectories (e.g., loom/queries/)
    const subdirs = entries.filter(e => e.isDirectory());
    for (const subdir of subdirs) {
      const subdirPath = path.join(loomDir, subdir.name);
      const subdirResult = await collectQueriesFromDirectory(subdirPath);
      
      result.queries.push(...subdirResult.queries);
      result.errors.push(...subdirResult.errors);
      result.filesProcessed.push(...subdirResult.filesProcessed);
    }

  } catch (error) {
    // Directory might not exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      result.errors.push(`Failed to read loom directory: ${(error as Error).message}`);
    }
  }

  return result;
}

/**
 * Group queries by their target provider.
 *
 * This helps when distributing queries to different refinements.
 */
export function groupQueriesByProvider(
  queries: CollectedQuery[]
): Map<string, CollectedQuery[]> {
  const groups = new Map<string, CollectedQuery[]>();

  for (const query of queries) {
    const provider = query.providerName || 'default';
    const existing = groups.get(provider) || [];
    groups.set(provider, [...existing, query]);
  }

  return groups;
}

/**
 * Get queries for a specific spiral.
 *
 * Filters collected queries to only those belonging to a specific spiral class.
 */
export function getQueriesForSpiral(
  queries: CollectedQuery[],
  spiralName: string
): CollectedQuery[] {
  return queries.filter(q => q.className === spiralName || q.spiralName === spiralName);
}

/**
 * Extract the query function from a class method.
 *
 * This retrieves the __queryFn that was attached by the @loom.crud.query decorator.
 */
function extractQueryFunction(
  Class: any,
  methodName: string
): ((client: unknown) => Promise<unknown>) | undefined {
  try {
    // Get the method from the prototype
    const method = Class.prototype?.[methodName];
    if (!method) return undefined;

    // Return the attached query function
    return method.__queryFn;
  } catch {
    return undefined;
  }
}
