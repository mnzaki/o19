/**
 * Computed Entity Helpers 🧮
 *
 * Build computed SQL helpers for entity field metadata.
 *
 * "What is computed once can be woven everywhere."
 *
 * This module provides reusable computations for entity field metadata,
 * turning raw field definitions into SQL-ready structures.
 */

/**
 * Field metadata as stored in EntityMetadata.
 * 
 * Only TypeScript types are stored here. Language-specific types
 * (rust, sql, etc.) are resolved at enhancement time via the
 * enhancement system. Templates should use entity.rs.fields[i].type
 * for language-specific types.
 */
export interface EntityFieldMetadata {
  /** Property name (camelCase) */
  name: string;
  /** TypeScript type (source of truth) */
  tsType: string;
  /** SQL column name (snake_case) */
  columnName: string;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether this is the primary key */
  isPrimary: boolean;
  /** Whether this is an auto-managed created timestamp */
  isCreatedAt: boolean;
  /** Whether this is an auto-managed updated timestamp */
  isUpdatedAt: boolean;
  /** Whether to include in INSERT statements */
  forInsert: boolean;
  /** Whether to include in UPDATE statements */
  forUpdate: boolean;
}

/**
 * Computed helpers derived from field metadata.
 * These are the structures templates actually use.
 */
export interface ComputedEntityHelpers {
  /** Fields that should be included in INSERT statements */
  insertFields: EntityFieldMetadata[];
  /** Fields that should be included in UPDATE statements */
  updateFields: EntityFieldMetadata[];
  /** Column names for INSERT */
  insertColumns: string[];
  /** Placeholders (? or $1, etc.) for INSERT */
  insertPlaceholders: string[];
  /** Column names for UPDATE SET clause */
  updateColumns: string[];
  /** Placeholders for UPDATE SET clause */
  updatePlaceholders: string[];
  /** Column names for WHERE clause (primary key) */
  whereColumns: string[];
  /** The primary key field (if any) */
  primaryField?: EntityFieldMetadata;
  /** All column names for SELECT * */
  allColumns: string[];
}

/**
 * Compute SQL operation flags for a single field.
 *
 * Rules:
 * - forInsert: Include unless primary key or auto timestamp
 * - forUpdate: Include unless primary key or created timestamp
 * - forSelect: Always include
 *
 * @param field - The field to compute flags for
 * @returns Computed flags
 */
export function computeFieldFlags(field: {
  isPrimary: boolean;
  isCreatedAt: boolean;
  isUpdatedAt: boolean;
}): { forInsert: boolean; forUpdate: boolean; forSelect: boolean } {
  return {
    forInsert: !field.isPrimary && !field.isCreatedAt && !field.isUpdatedAt,
    forUpdate: !field.isPrimary && !field.isCreatedAt,
    forSelect: true
  };
}

/**
 * Build all computed helpers from field metadata.
 *
 * This is the main entry point - pass in your fields, get back
 * all the SQL helpers you need for code generation.
 *
 * @param fields - Entity field metadata
 * @returns Computed helpers for templates
 */
export function buildComputedHelpers(
  fields: EntityFieldMetadata[]
): ComputedEntityHelpers {
  // Filter fields by operation
  const insertFields = fields.filter(f => f.forInsert);
  const updateFields = fields.filter(f => f.forUpdate);
  const primaryField = fields.find(f => f.isPrimary);

  return {
    // Field arrays
    insertFields,
    updateFields,

    // Column name arrays
    insertColumns: insertFields.map(f => f.columnName),
    updateColumns: updateFields.map(f => f.columnName),
    whereColumns: primaryField ? [primaryField.columnName] : [],
    allColumns: fields.map(f => f.columnName),

    // Placeholder arrays (SQLite style ?)
    insertPlaceholders: insertFields.map(() => '?'),
    updatePlaceholders: updateFields.map(() => '?'),

    // Primary key reference
    primaryField
  };
}

/**
 * Build SQLite-style numbered placeholders.
 *
 * @param count - Number of placeholders
 * @param startAt - Starting number (default: 1)
 * @returns Array of placeholders like ['?1', '?2', '?3']
 */
export function buildNumberedPlaceholders(count: number, startAt = 1): string[] {
  return Array.from({ length: count }, (_, i) => `?${startAt + i}`);
}

/**
 * Build PostgreSQL-style numbered placeholders.
 *
 * @param count - Number of placeholders
 * @param startAt - Starting number (default: 1)
 * @returns Array of placeholders like ['$1', '$2', '$3']
 */
export function buildPostgresPlaceholders(count: number, startAt = 1): string[] {
  return Array.from({ length: count }, (_, i) => `$${startAt + i}`);
}

/**
 * Build an UPDATE SET clause.
 *
 * @param fields - Fields to include in SET
 * @param placeholderStyle - 'sqlite' | 'postgres' | 'simple'
 * @returns SET clause like "col1 = ?, col2 = ?"
 */
export function buildUpdateSetClause(
  fields: EntityFieldMetadata[],
  placeholderStyle: 'sqlite' | 'postgres' | 'simple' = 'simple'
): string {
  const placeholders = fields.map((f, i) => {
    const ph = placeholderStyle === 'sqlite'
      ? `?${i + 1}`
      : placeholderStyle === 'postgres'
        ? `$${i + 1}`
        : '?';
    return `${f.columnName} = ${ph}`;
  });

  return placeholders.join(', ');
}

/**
 * Build an INSERT column list.
 *
 * @param fields - Fields to include
 * @returns Column list like "(col1, col2, col3)"
 */
export function buildInsertColumns(fields: EntityFieldMetadata[]): string {
  return `(${fields.map(f => f.columnName).join(', ')})`;
}

/**
 * Build an INSERT values clause.
 *
 * @param fields - Fields to include
 * @param placeholderStyle - 'sqlite' | 'postgres' | 'simple'
 * @returns Values clause like "VALUES (?, ?, ?)"
 */
export function buildInsertValues(
  fields: EntityFieldMetadata[],
  placeholderStyle: 'sqlite' | 'postgres' | 'simple' = 'simple'
): string {
  const count = fields.length;
  const placeholders = placeholderStyle === 'sqlite'
    ? buildNumberedPlaceholders(count)
    : placeholderStyle === 'postgres'
      ? buildPostgresPlaceholders(count)
      : Array(count).fill('?');

  return `VALUES (${placeholders.join(', ')})`;
}

/**
 * Build a complete INSERT statement.
 *
 * @param tableName - The table name
 * @param fields - Fields to include
 * @param placeholderStyle - 'sqlite' | 'postgres' | 'simple'
 * @returns Complete INSERT statement
 */
export function buildInsertStatement(
  tableName: string,
  fields: EntityFieldMetadata[],
  placeholderStyle: 'sqlite' | 'postgres' | 'simple' = 'simple'
): string {
  return `INSERT INTO ${tableName} ${buildInsertColumns(fields)} ${buildInsertValues(fields, placeholderStyle)}`;
}

/**
 * Build a SELECT statement.
 *
 * @param tableName - The table name
 * @param fields - Fields to select (or all if not specified)
 * @returns Complete SELECT statement
 */
export function buildSelectStatement(
  tableName: string,
  fields?: EntityFieldMetadata[]
): string {
  const columns = fields
    ? fields.map(f => f.columnName).join(', ')
    : '*';
  return `SELECT ${columns} FROM ${tableName}`;
}

/**
 * Build an UPDATE statement (without WHERE).
 *
 * @param tableName - The table name
 * @param fields - Fields to update
 * @param placeholderStyle - 'sqlite' | 'postgres' | 'simple'
 * @returns UPDATE statement up to SET clause
 */
export function buildUpdateStatement(
  tableName: string,
  fields: EntityFieldMetadata[],
  placeholderStyle: 'sqlite' | 'postgres' | 'simple' = 'simple'
): string {
  return `UPDATE ${tableName} SET ${buildUpdateSetClause(fields, placeholderStyle)}`;
}

/**
 * Build a CREATE TABLE column definition.
 * 
 * Note: This requires the SQL type to be provided. Use entity.rs.fields[i].sqlType
 * from the enhancement system, or use entity.rs.tableDefinition for the full statement.
 *
 * @param field - Field metadata with sqlType
 * @param sqlType - The SQL type for this column
 * @returns Column definition like "col_name TEXT NOT NULL"
 */
export function buildColumnDefinition(
  field: EntityFieldMetadata,
  sqlType: string
): string {
  const parts = [field.columnName, sqlType];

  if (!field.nullable) {
    parts.push('NOT NULL');
  }

  if (field.isPrimary) {
    parts.push('PRIMARY KEY AUTOINCREMENT');
  }

  return parts.join(' ');
}

/**
 * Build a complete CREATE TABLE statement.
 * 
 * Note: Use entity.rs.tableDefinition from the enhancement system
 * for language-aware table generation. This helper requires you to
 * provide SQL types via the getSqlType callback.
 *
 * @param tableName - The table name
 * @param fields - All fields
 * @param getSqlType - Function to get SQL type for each field
 * @returns Complete CREATE TABLE statement
 */
export function buildCreateTableStatement(
  tableName: string,
  fields: EntityFieldMetadata[],
  getSqlType: (tsType: string) => string
): string {
  const columns = fields.map(f => buildColumnDefinition(f, getSqlType(f.tsType))).join(',\n  ');
  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns}\n)`;
}
