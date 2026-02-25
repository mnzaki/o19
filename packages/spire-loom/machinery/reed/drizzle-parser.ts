/**
 * Drizzle Schema Parser
 * 
 * "The reed collects the schema threads."
 * 
 * Imports the Drizzle schema.ts module and extracts table definitions.
 * No regex parsing — we get actual runtime objects!
 */

import { pathToFileURL } from 'node:url';

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
}

export interface ForeignKeyDef {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  primaryKey?: string;
  foreignKeys: ForeignKeyDef[];
}

export interface QueryDef {
  name: string;
  sql: string;
  parameters: string[];
  returnType: 'one' | 'many' | 'optional';
}

export interface ParsedSchema {
  tables: TableDef[];
  queries: QueryDef[];
}

/**
 * Parse a Drizzle schema file by importing it as a module.
 * 
 * This gives us the actual runtime table definitions, not regex-extracted approximations.
 */
export async function parseDrizzleSchema(schemaPath: string): Promise<ParsedSchema> {
  const schemaUrl = pathToFileURL(schemaPath).href;
  
  try {
    // Import the schema module — get real objects!
    const schemaModule = await import(schemaUrl);
    
    const tables: TableDef[] = [];
    const queries: QueryDef[] = [];
    
    // Extract tables from exports
    for (const [exportName, value] of Object.entries(schemaModule)) {
      // Skip non-table exports (helpers, types, etc.)
      if (!isDrizzleTable(value)) continue;
      
      const table = extractTableDef(exportName, value);
      if (table) {
        tables.push(table);
      }
    }
    
    // Look for query definitions (if any)
    for (const [exportName, value] of Object.entries(schemaModule)) {
      if (exportName.endsWith('Queries') && typeof value === 'object' && value !== null) {
        const tableQueries = extractQueries(value);
        queries.push(...tableQueries);
      }
    }
    
    return { tables, queries };
    
  } catch (error) {
    throw new Error(
      `Failed to parse Drizzle schema at ${schemaPath}: ${(error as Error).message}\n` +
      `The reed cannot collect what it cannot reach.`
    );
  }
}

/**
 * Check if a value is a Drizzle table definition.
 */
function isDrizzleTable(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  
  // Drizzle tables have these characteristics
  const internal = value._ || {};
  const hasColumns = internal.columns !== undefined || 
                     (typeof value === 'object' && Object.keys(value).length > 0);
  const hasName = value[Symbol.for('drizzle:Name')] !== undefined ||
                  value.name !== undefined;
  
  // Check for Drizzle's internal markers
  const constructorName = value.constructor?.name || '';
  return hasColumns || hasName || constructorName.includes('Table');
}

/**
 * Extract table definition from a Drizzle table object.
 */
function extractTableDef(name: string, table: any): TableDef | null {
  try {
    const columns: ColumnDef[] = [];
    const foreignKeys: ForeignKeyDef[] = [];
    let primaryKey: string | undefined;
    
    // Access Drizzle's internal structure
    const tableConfig = table._ || table;
    const columnEntries = tableConfig.columns || table;
    
    for (const [colName, colConfigAny] of Object.entries(columnEntries)) {
      if (!colConfigAny || typeof colConfigAny !== 'object') continue;
      
      const colConfig = colConfigAny as Record<string, any>;
      
      const column: ColumnDef = {
        name: colName,
        type: extractColumnType(colConfig),
        nullable: !colConfig.notNull,
        defaultValue: colConfig.default,
        isPrimaryKey: colConfig.primaryKey === true,
      };
      
      if (column.isPrimaryKey) {
        primaryKey = colName;
      }
      
      columns.push(column);
      
      // Check for foreign key references
      if (colConfig.references) {
        foreignKeys.push({
          column: colName,
          referencesTable: colConfig.references.table,
          referencesColumn: colConfig.references.column,
        });
      }
    }
    
    return {
      name,
      columns,
      primaryKey,
      foreignKeys,
    };
    
  } catch (error) {
    console.warn(`Failed to extract table ${name}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Extract SQL type from Drizzle column config.
 */
function extractColumnType(colConfig: any): string {
  // Drizzle column types
  if (colConfig.dataType) return colConfig.dataType;
  if (colConfig.columnType) return colConfig.columnType;
  
  // Infer from config properties
  if (colConfig.primaryKey && colConfig.autoIncrement) return 'integer';
  if (colConfig.notNull !== undefined) return 'text'; // Default assumption
  
  return 'unknown';
}

/**
 * Extract query definitions from a queries object.
 */
function extractQueries(queriesObj: Record<string, any>): QueryDef[] {
  const queries: QueryDef[] = [];
  
  for (const [name, queryDef] of Object.entries(queriesObj)) {
    if (typeof queryDef === 'function' || typeof queryDef === 'object') {
      // TODO: Extract SQL and parameters from query definition
      // This will depend on how we define queries (template literals, builders, etc.)
      queries.push({
        name,
        sql: '', // Extract from queryDef
        parameters: [], // Extract from queryDef
        returnType: 'many',
      });
    }
  }
  
  return queries;
}

/**
 * Validate that a parsed schema is complete and usable.
 * 
 * Crinkles the cranks if validation fails.
 */
export function validateSchema(schema: ParsedSchema): void {
  const errors: string[] = [];
  
  for (const table of schema.tables) {
    // Check for primary key
    if (!table.primaryKey && !table.columns.some(c => c.isPrimaryKey)) {
      errors.push(`Table "${table.name}" has no primary key`);
    }
    
    // Check for valid column types
    for (const col of table.columns) {
      if (col.type === 'unknown') {
        errors.push(`Table "${table.name}" column "${col.name}" has unknown type`);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(
      `🔧 Crinkle! The loom detected schema errors:\n` +
      errors.map(e => `  - ${e}`).join('\n') +
      `\n\nThe loom cannot weave with broken threads.`
    );
  }
}
