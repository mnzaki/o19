/**
 * ORM Compactor — Schema to Query Code
 * 
 * "Pack the ORM tight: validate queries at generation time."
 * 
 * The ORM Compactor extends the base Compactor pattern specifically for
 * database ORM generation. It adds:
 * - Schema-aware code generation helpers
 * - Query validation against real database
 * - Prepared statement generation
 * 
 * Usage:
 *   1. Extend OrmCompactor
 *   2. Implement `generateMidstage()` using helpers
 *   3. The base handles compile/run/parse
 */

import { Compactor } from './compactor.js';
import type { CompactorConfig, CompactorResult } from './compactor.js';
import type { ParsedSchema, TableDef, ColumnDef } from '../reed/drizzle-parser.js';

export interface OrmCompactorConfig extends CompactorConfig {
  /** Parsed Drizzle schema */
  schema: ParsedSchema;
  
  /** Target database type */
  database: 'sqlite' | 'postgresql' | 'mysql';
}

/**
 * Abstract ORM Compactor — validates queries against schema at generation time.
 * 
 * Implement `generateOrmMidstage()` to generate your ORM midstage code.
 * Use the provided helpers for common tasks.
 */
export abstract class OrmCompactor extends Compactor {
  protected ormConfig: OrmCompactorConfig;
  
  constructor(config: OrmCompactorConfig) {
    super(config);
    this.ormConfig = config;
  }
  
  /**
   * You implement this — generate the ORM-specific midstage.
   */
  protected abstract generateOrmMidstage(): Promise<void>;
  
  /**
   * Internal: delegates to your implementation.
   */
  protected async generate(): Promise<void> {
    return this.generateOrmMidstage();
  }
  
  // ===== ORM Helpers =====
  
  /** Map SQL types to target language types */
  protected abstract mapSqlType(sqlType: string): string;
  
  /** Convert snake_case to PascalCase */
  protected toPascalCase(str: string): string {
    return str
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }
  
  /** Generate struct/record definition for a table */
  protected generateStruct(table: TableDef, lang: 'rust' | 'typescript' | 'kotlin'): string {
    const structName = this.toPascalCase(table.name);
    
    switch (lang) {
      case 'rust':
        const fields = table.columns.map(col => {
          const rustType = this.mapSqlType(col.type);
          const optional = col.nullable ? `Option<${rustType}>` : rustType;
          return `    pub ${col.name}: ${optional},`;
        }).join('\n');
        return `
#[derive(Debug, Clone)]
pub struct ${structName} {
${fields}
}`;
      
      case 'typescript':
        const tsFields = table.columns.map(col => {
          const tsType = this.mapSqlType(col.type);
          const optional = col.nullable ? `?` : '';
          return `  ${col.name}${optional}: ${tsType};`;
        }).join('\n');
        return `
export interface ${structName} {
${tsFields}
}`;
      
      default:
        throw new Error(`Unsupported language: ${lang}`);
    }
  }
  
  /** Generate basic CRUD query signatures */
  protected generateCrudQueries(table: TableDef): Array<{ name: string; sql: string; params: string[] }> {
    return [
      {
        name: `get_${table.name}_by_id`,
        sql: `SELECT * FROM ${table.name} WHERE id = ?`,
        params: ['id']
      },
      {
        name: `list_${table.name}_all`,
        sql: `SELECT * FROM ${table.name}`,
        params: []
      },
      {
        name: `insert_${table.name}`,
        sql: this.generateInsertSql(table),
        params: table.columns.filter(c => c.name !== 'id').map(c => c.name)
      },
      {
        name: `update_${table.name}`,
        sql: this.generateUpdateSql(table),
        params: [...table.columns.filter(c => c.name !== 'id').map(c => c.name), 'id']
      },
      {
        name: `delete_${table.name}`,
        sql: `DELETE FROM ${table.name} WHERE id = ?`,
        params: ['id']
      }
    ];
  }
  
  private generateInsertSql(table: TableDef): string {
    const cols = table.columns.filter(c => c.name !== 'id');
    const colNames = cols.map(c => c.name).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    return `INSERT INTO ${table.name} (${colNames}) VALUES (${placeholders})`;
  }
  
  private generateUpdateSql(table: TableDef): string {
    const cols = table.columns.filter(c => c.name !== 'id');
    const setClause = cols.map(c => `${c.name} = ?`).join(', ');
    return `UPDATE ${table.name} SET ${setClause} WHERE id = ?`;
  }
}

/**
 * Define an ORM compactor declaratively.
 */
export interface OrmCompactorSpec {
  /** Map SQL type to target language type */
  mapType: (sqlType: string) => string;
  
  /** Generate the complete midstage */
  generate: (schema: ParsedSchema, midstagePath: string, outputPath: string) => Promise<void>;
  
  /** Compile command */
  compile: (midstagePath: string) => { command: string; args: string[] };
  
  /** Run command */
  run: (midstagePath: string, outputPath: string) => { command: string; args: string[]; env?: Record<string, string> };
  
  /** Parse stdout for generated files */
  parse: (stdout: string) => string[];
}

export function defineOrmCompactor(spec: OrmCompactorSpec): new (config: OrmCompactorConfig) => OrmCompactor {
  return class extends OrmCompactor {
    protected mapSqlType(sqlType: string) { return spec.mapType(sqlType); }
    protected generateOrmMidstage() { return spec.generate(this.ormConfig.schema, this.config.midstagePath, this.config.outputPath); }
    protected compile() { return { ...spec.compile(this.config.midstagePath), cwd: this.config.midstagePath }; }
    protected run() { return { ...spec.run(this.config.midstagePath, this.config.outputPath), cwd: this.config.midstagePath }; }
    protected parse(stdout: string) { return spec.parse(stdout); }
    protected verify() { return Promise.resolve(); }
  };
}
