/**
 * TypeScript Prisma-Kysely AOT Compactor
 *
 * "The Refinery: Prisma's essence, distilled to Kysely SQL."
 *
 * A concrete implementation of the ORM Compactor using:
 * - TypeScript/Node.js as the midstage harness
 * - Prisma Client Extensions to intercept queries
 * - Kysely for SQL generation and capture
 *
 * The Prisma dependency is injected dynamically — no peer dependency on spire-loom.
 *
 * OUTPUT: *.gen.ts files with Kysely prepared statements (FRONTEND ONLY!)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { OrmCompactor } from './orm-compactor.js';
import type { OrmCompactorConfig } from './orm-compactor.js';
import type { CollectedQuery } from '../reed/query-collector.js';

export interface TsPrismaKyselyAotConfig extends OrmCompactorConfig {
  /** Path to the Drizzle schema (input) */
  drizzleSchemaPath: string;

  /** Database URL for Prisma (usually sqlite file) */
  databaseUrl: string;

  /** Collected queries from loom files */
  queries: CollectedQuery[];

  /** Prisma version to use (defaults to latest) */
  prismaVersion?: string;

  /** Whether to keep midstage after completion (for debugging) */
  keepMidstage?: boolean;
}

/**
 * TypeScript Prisma-Kysely AOT Compactor — Prisma API, Kysely SQL.
 *
 * The Refinery pattern: Heavyweight ORM at generation time → lightweight Kysely at runtime.
 *
 * Usage:
 *   const refinery = new TsPrismaKyselyAot({
 *     midstagePath: './.midstage/prisma-kysely-refinery',
 *     outputPath: './generated/foundframe-front',
 *     schema: parsedSchema,
 *     database: 'sqlite',
 *     drizzleSchemaPath: './src/schema.ts',
 *     databaseUrl: 'file:./.midstage/temp.db',
 *     queries: collectedQueries  // From reed/query-collector.ts
 *   });
 *
 *   const result = await refinery.compact();
 *   // result.generatedFiles contains paths to *.gen.ts files
 *
 * The compactor auto-installs Prisma dependencies in the midstage — no peer deps needed!
 *
 * OUTPUT: TypeScript/Kysely files (*.gen.ts), NOT Rust!
 */
export class TsPrismaKyselyAot extends OrmCompactor {
  protected pkaConfig: TsPrismaKyselyAotConfig;

  constructor(config: TsPrismaKyselyAotConfig) {
    super(config);
    this.pkaConfig = config;
  }

  protected mapSqlType(sqlType: string): string {
    // TypeScript type mapping (for Kysely)
    const mapping: Record<string, string> = {
      integer: 'number',
      text: 'string',
      boolean: 'boolean',
      real: 'number',
      blob: 'Buffer',
      timestamp: 'Date',
      json: 'unknown',
      datetime: 'Date',
    };
    return mapping[sqlType] || 'unknown';
  }

  protected async generateOrmMidstage(): Promise<void> {
    const { midstagePath } = this.config;
    const { schema } = this.ormConfig;

    // Create directories
    await fs.mkdir(midstagePath, { recursive: true });
    await fs.mkdir(path.join(midstagePath, 'src'), { recursive: true });
    await fs.mkdir(path.join(midstagePath, 'prisma'), { recursive: true });

    // Bobbin paths (template sources)
    const bobbinDir = new URL('../bobbin/prisma-kysely-aot/', import.meta.url).pathname;

    // Render bobbins with EJS
    await this.renderBobbin(
      path.join(bobbinDir, 'package.json.ejs'),
      path.join(midstagePath, 'package.json'),
      {
        prismaVersion: this.pkaConfig.prismaVersion || '^5.10.0',
        queries: this.pkaConfig.queries
      }
    );

    await this.renderBobbin(
      path.join(bobbinDir, 'tsconfig.json.ejs'),
      path.join(midstagePath, 'tsconfig.json'),
      {}
    );

    await this.renderBobbin(
      path.join(bobbinDir, 'schema.prisma.ejs'),
      path.join(midstagePath, 'prisma', 'schema.prisma'),
      {
        tables: schema.tables,
        pascalCase: (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''),
        mapToPrismaType: (t: string) => {
          const map: Record<string, string> = {
            integer: 'Int', text: 'String', boolean: 'Boolean',
            real: 'Float', blob: 'Bytes', timestamp: 'DateTime', json: 'Json'
          };
          return map[t] || 'String';
        }
      }
    );

    await this.renderBobbin(
      path.join(bobbinDir, 'bridge.ts.ejs'),
      path.join(midstagePath, 'src', 'bridge.ts'),
      {}
    );

    await this.renderBobbin(
      path.join(bobbinDir, 'capture.ts.ejs'),
      path.join(midstagePath, 'src', 'capture.ts'),
      { queries: this.pkaConfig.queries }
    );

    await this.renderBobbin(
      path.join(bobbinDir, 'codegen.ts.ejs'),
      path.join(midstagePath, 'src', 'codegen.ts'),
      { tables: schema.tables }
    );

    // Install dependencies (dynamic injection!)
    await this.injectDependencies();

    // Generate Prisma client
    await this.generatePrismaClient();
  }

  /**
   * Render a bobbin (EJS template) to a destination file.
   */
  private async renderBobbin(
    templatePath: string,
    destPath: string,
    data: Record<string, any>
  ): Promise<void> {
    // For now, simple string replacement (could use proper EJS later)
    let template = await fs.readFile(templatePath, 'utf-8');

    // Simple EJS-like substitution
    template = template.replace(/<%=(.+?)%>/g, (_, expr) => {
      try {
        const fn = new Function(...Object.keys(data), `return ${expr}`);
        return fn(...Object.values(data));
      } catch {
        return '';
      }
    });

    template = template.replace(/<%-(.+?)%>/g, (_, expr) => {
      try {
        const fn = new Function(...Object.keys(data), `return ${expr}`);
        return fn(...Object.values(data));
      } catch {
        return '';
      }
    });

    await fs.writeFile(destPath, template, 'utf-8');
  }

  /**
   * Inject Prisma dependencies into the midstage.
   */
  private async injectDependencies(): Promise<void> {
    const { midstagePath } = this.config;

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['install'], {
        cwd: midstagePath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stderr = '';
      child.stderr?.on('data', (d) => stderr += d);

      child.on('close', (code) => {
        code === 0
          ? resolve()
          : reject(new Error(`npm install failed: ${stderr}`));
      });
    });
  }

  /**
   * Generate Prisma client from the schema.
   */
  private async generatePrismaClient(): Promise<void> {
    const { midstagePath } = this.config;

    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['prisma', 'generate'], {
        cwd: midstagePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DATABASE_URL: this.pkaConfig.databaseUrl
        }
      });

      let stderr = '';
      child.stderr?.on('data', (d) => stderr += d);

      child.on('close', (code) => {
        code === 0
          ? resolve()
          : reject(new Error(`prisma generate failed: ${stderr}`));
      });
    });
  }

  protected compile() {
    // TypeScript compilation via tsc
    return {
      command: 'npx',
      args: ['tsc', '--build', 'tsconfig.json'],
      cwd: this.config.midstagePath
    };
  }

  protected run() {
    return {
      command: 'node',
      args: ['--import', 'tsx', 'src/capture.ts'],
      cwd: this.config.midstagePath,
      env: {
        OUTPUT_DIR: this.config.outputPath,
        DATABASE_URL: this.pkaConfig.databaseUrl
      }
    };
  }

  protected parse(stdout: string): string[] {
    return stdout
      .split('\n')
      .filter(line => line.startsWith('GENERATED:'))
      .map(line => line.replace('GENERATED:', '').trim());
  }

  protected async verify(files: string[]): Promise<void> {
    // TODO: Run TypeScript check on generated files
    // This ensures we never output broken TypeScript
  }
}

/**
 * Convenience function: create and run the compactor.
 */
export async function compactWithPrismaKysely(config: TsPrismaKyselyAotConfig) {
  const compactor = new TsPrismaKyselyAot(config);
  return compactor.compact();
}
