/**
 * TypeScript Compactor (In-Process)
 *
 * "The lightweight compactor for TypeScript-only workflows."
 *
 * Unlike the full Compactor pattern (write → compile → run → write),
 * this stays entirely in-process for TypeScript → TypeScript transformations.
 *
 * Usage:
 *   const compactor = new TsCompactor({
 *     outputPath: './generated',
 *     queries: collectedQueries,
 *     databaseUrl: 'file:./data.db'
 *   });
 *
 *   const result = await compactor.compact();
 *   // Executes queries in-process, captures SQL, generates output
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CollectedQuery } from '../reed/query-collector.js';

export interface TsCompactorConfig {
  /** Where to output generated files */
  outputPath: string;

  /** Collected queries from loom files */
  queries: CollectedQuery[];

  /** Database URL for Prisma */
  databaseUrl: string;

  /** Whether to keep intermediate files (for debugging) */
  keepIntermediate?: boolean;

  /** Verbose logging */
  verbose?: boolean;
}

export interface TsCompactorResult {
  /** Whether compaction succeeded */
  success: boolean;

  /** Generated file paths */
  generatedFiles: string[];

  /** Captured query information */
  capturedQueries: Array<{
    name: string;
    className: string;
    sql: string;
    params: unknown[];
    model: string;
    operation: string;
  }>;

  /** Errors encountered */
  errors: string[];
}

/**
 * TypeScript-only compactor — executes in-process, no midstage compilation!
 *
 * The flow:
 * 1. Load Prisma client dynamically
 * 2. Execute each query lambda
 * 3. Capture SQL via query log
 * 4. Generate TypeScript/Kysely output directly
 */
export class TsCompactor {
  protected config: TsCompactorConfig;

  constructor(config: TsCompactorConfig) {
    this.config = config;
  }

  /**
   * Execute compaction entirely in-process.
   */
  async compact(): Promise<TsCompactorResult> {
    const result: TsCompactorResult = {
      success: false,
      generatedFiles: [],
      capturedQueries: [],
      errors: [],
    };

    try {
      if (this.config.verbose) {
        console.log(`🔧 TsCompactor: Processing ${this.config.queries.length} queries...`);
      }

      // Step 1: Dynamically import Prisma
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.config.databaseUrl,
          },
        },
        log: [{ emit: 'event', level: 'query' }],
      });

      // Step 2: Execute queries and capture SQL
      for (const query of this.config.queries) {
        try {
          const captured = await this.executeQuery(prisma, query);
          result.capturedQueries.push(captured);

          if (this.config.verbose) {
            console.log(`  ✓ ${query.className}.${query.methodName} → ${captured.operation}`);
          }
        } catch (error) {
          const msg = `Failed to execute ${query.methodName}: ${(error as Error).message}`;
          result.errors.push(msg);
          console.warn(`  ⚠️ ${msg}`);
        }
      }

      // Step 3: Generate output
      if (result.capturedQueries.length > 0) {
        await this.generateOutput(result);
      }

      // Step 4: Cleanup
      await prisma.$disconnect();

      result.success = result.errors.length === 0 || result.capturedQueries.length > 0;

      if (this.config.verbose) {
        console.log(`🔧 TsCompactor: ${result.capturedQueries.length} queries captured, ${result.generatedFiles.length} files generated`);
      }

    } catch (error) {
      result.errors.push(`Compaction failed: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Validate that a query can be precompiled.
   *
   * "The Loom Halts" — checks for patterns that can't be precompiled.
   */
  protected validateQueryCanPrecompile(
    query: CollectedQuery
  ): { valid: boolean; reason?: string } {
    // Check if we have a query function
    if (!query.queryFn) {
      return { valid: false, reason: 'No queryFn found' };
    }

    // Get function source for analysis
    const fnSource = query.queryFn.toString();

    // Check for dynamic property access (computed keys)
    // Example: orderBy: { [column]: 'desc' }
    if (/\[\s*\w+\s*\]/.test(fnSource) && fnSource.includes('orderBy')) {
      return {
        valid: false,
        reason: 'Dynamic column name in orderBy (computed property key)'
      };
    }

    // Check for dynamic table/model access
    // Example: prisma[tableName].findMany()
    if (/prisma\s*\[/.test(fnSource)) {
      return {
        valid: false,
        reason: 'Dynamic table/model access (prisma[tableName])'
      };
    }

    // Check for raw SQL
    if (fnSource.includes('$queryRaw') || fnSource.includes('$executeRaw')) {
      return {
        valid: false,
        reason: 'Raw SQL queries ($queryRaw/$executeRaw) cannot be precompiled'
      };
    }

    // Note: Variable IN clauses are hard to detect statically
    // We'll catch those at execution time if they fail

    return { valid: true };
  }

  /**
   * Execute a single query and capture its SQL.
   */
  protected async executeQuery(
    prisma: any,
    query: CollectedQuery
  ): Promise<TsCompactorResult['capturedQueries'][0]> {
    // Check if query can be precompiled (The Loom Halts)
    const validation = this.validateQueryCanPrecompile(query);
    if (!validation.valid) {
      throw new Error(
        `🛑 THE LOOM HALTS!\n` +
        `Cannot precompile query ${query.className}.${query.methodName}:\n` +
        `  ${validation.reason}\n\n` +
        `The pattern cannot be woven. Options:\n` +
        `  1. Use static values instead of dynamic ones\n` +
        `  2. Remove @loom.crud.query decorator (use runtime Prisma)\n` +
        `  3. Define multiple @loom.crud.query variants for each case`
      );
    }
    // Set up query capture
    let capturedSQL = '';
    let capturedParams: unknown[] = [];

    const handler = (e: any) => {
      capturedSQL = e.query;
      try {
        capturedParams = JSON.parse(e.params || '[]');
      } catch {
        capturedParams = [];
      }
    };

    prisma.$on('query', handler);

    try {
      // Execute the query function
      // Note: The queryFn is stored on the metadata, we need to call it
      const queryFn = query.queryFn;
      if (!queryFn) {
        throw new Error('No queryFn found in metadata');
      }

      await queryFn(prisma);

      // Infer model and operation from the SQL
      const { model, operation } = this.inferModelAndOperation(capturedSQL);

      return {
        name: query.methodName,
        className: query.className,
        sql: capturedSQL,
        params: capturedParams,
        model,
        operation,
      };
    } finally {
      prisma.$off('query', handler);
    }
  }

  /**
   * Infer model name and operation from SQL.
   */
  protected inferModelAndOperation(sql: string): { model: string; operation: string } {
    const lowerSQL = sql.toLowerCase();

    // Detect operation
    let operation = 'unknown';
    if (lowerSQL.includes('select')) operation = 'findMany';
    else if (lowerSQL.includes('insert')) operation = 'create';
    else if (lowerSQL.includes('update')) operation = 'update';
    else if (lowerSQL.includes('delete')) operation = 'delete';

    // Detect model (table name)
    let model = 'unknown';
    const fromMatch = lowerSQL.match(/from\s+(\w+)/);
    const intoMatch = lowerSQL.match(/into\s+(\w+)/);
    const updateMatch = lowerSQL.match(/update\s+(\w+)/);
    
    model = fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || 'unknown';

    return { model, operation };
  }

  /**
   * Generate TypeScript/Kysely output files.
   */
  protected async generateOutput(result: TsCompactorResult): Promise<void> {
    await fs.mkdir(this.config.outputPath, { recursive: true });

    // Generate combined file
    const combinedCode = this.generateCombinedFile(result.capturedQueries);
    const combinedPath = path.join(this.config.outputPath, 'queries.gen.ts');
    await fs.writeFile(combinedPath, combinedCode);
    result.generatedFiles.push(combinedPath);

    // Generate per-class files
    const byClass = this.groupByClass(result.capturedQueries);
    for (const [className, queries] of byClass) {
      const classCode = this.generateClassFile(className, queries);
      const classPath = path.join(this.config.outputPath, `${className.toLowerCase()}.gen.ts`);
      await fs.writeFile(classPath, classCode);
      result.generatedFiles.push(classPath);
    }

    // Generate report
    const reportPath = path.join(this.config.outputPath, 'compaction-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalQueries: this.config.queries.length,
      capturedQueries: result.capturedQueries.length,
      failedQueries: result.errors.length,
      queries: result.capturedQueries.map(q => ({
        name: q.name,
        className: q.className,
        model: q.model,
        operation: q.operation,
      })),
    }, null, 2));
  }

  /**
   * Generate combined queries file.
   */
  protected generateCombinedFile(
    queries: TsCompactorResult['capturedQueries']
  ): string {
    let code = `// Generated by spire-loom TsCompactor
// "Prisma API, Kysely SQL"

import { Kysely } from 'kysely';
import type { Database } from './types';

`;

    for (const query of queries) {
      code += this.generateQueryFunction(query);
      code += '\n';
    }

    return code;
  }

  /**
   * Generate a single query function.
   */
  protected generateQueryFunction(query: TsCompactorResult['capturedQueries'][0]): string {
    const fnName = this.toCamelCase(query.name);
    const params = query.params.map((_, i) => `param${i}: unknown`).join(', ');

    // Simple mapping from operation to Kysely
    let kyselyCode: string;
    switch (query.operation) {
      case 'findMany':
        kyselyCode = `db.selectFrom('${query.model}').selectAll()`;
        break;
      case 'create':
        kyselyCode = `db.insertInto('${query.model}').values({ /* ... */ })`;
        break;
      case 'update':
        kyselyCode = `db.updateTable('${query.model}').set({ /* ... */ })`;
        break;
      case 'delete':
        kyselyCode = `db.deleteFrom('${query.model}')`;
        break;
      default:
        kyselyCode = `// TODO: ${query.operation}`;
    }

    return `/**
 * ${query.name} — captured from Prisma
 * Original SQL: ${query.sql.substring(0, 60)}...
 */
export async function ${fnName}(
  db: Kysely<Database>${params ? ', ' + params : ''}
) {
  return ${kyselyCode}.execute();
}
`;
  }

  /**
   * Generate class-specific file.
   */
  protected generateClassFile(
    className: string,
    queries: TsCompactorResult['capturedQueries']
  ): string {
    let code = `// Generated by spire-loom TsCompactor
// Class: ${className}

import { Kysely } from 'kysely';
import type { Database } from './types';

export class ${className}Queries {
  constructor(private db: Kysely<Database>) {}

`;

    for (const query of queries) {
      const fnName = this.toCamelCase(query.name);
      const params = query.params.map((_, i) => `param${i}: unknown`).join(', ');

      code += `  async ${fnName}(${params}) {
    // ${query.operation} on ${query.model}
    return this.db
      // TODO: Implement ${query.operation}
      .execute();
  }

`;
    }

    code += '}\n';
    return code;
  }

  /**
   * Group queries by class name.
   */
  protected groupByClass(
    queries: TsCompactorResult['capturedQueries']
  ): Map<string, TsCompactorResult['capturedQueries']> {
    const groups = new Map<string, TsCompactorResult['capturedQueries']>();
    for (const query of queries) {
      const existing = groups.get(query.className) || [];
      groups.set(query.className, [...existing, query]);
    }
    return groups;
  }

  /**
   * Convert to camelCase.
   */
  protected toCamelCase(str: string): string {
    return str
      .replace(/^[_]+/, '')
      .replace(/[_]([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

/**
 * Convenience function: create and run the compactor.
 */
export async function compactTypeScript(
  config: TsCompactorConfig
): Promise<TsCompactorResult> {
  const compactor = new TsCompactor(config);
  return compactor.compact();
}
