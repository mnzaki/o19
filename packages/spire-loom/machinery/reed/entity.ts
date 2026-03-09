/**
 * Entity Enhancement System 🌀
 *
 * Language-specific entity enhancement with deferred type resolution.
 *
 * Mirrors the LanguageMethod pattern:
 * - Raw entity metadata stored in constructor
 * - Types resolved lazily when getters are accessed
 * - Language set via this.lang property
 * - Supports multi-language via cloneWithLang (rs, ts, kt properties)
 *
 * @module machinery/reed/language/entity
 */

import { pascalCase, camelCase, snakeCase } from '../stringing.js';
import { LanguageThing } from './language/types.js';

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Raw entity field metadata (from entity decorator).
 *
 * Stores TypeScript types only - language mapping happens at enhancement time.
 */
export interface RawEntityField {
  /** Field name */
  name: string;
  /** TypeScript type */
  tsType: string;
  /** Whether nullable */
  nullable?: boolean;
  /** Whether primary key */
  isPrimary?: boolean;
  /** Auto-generated timestamp */
  isCreatedAt?: boolean;
  /** Auto-updated timestamp */
  isUpdatedAt?: boolean;
  /** Include in INSERT */
  forInsert?: boolean;
  /** Include in UPDATE */
  forUpdate?: boolean;
}

/**
 * Raw entity metadata (from entity decorator).
 */
export interface RawEntity {
  /** Entity name */
  name: string;
  /** Entity fields */
  fields: RawEntityField[];
}

/**
 * Entity field with language-specific type resolution.
 */
export interface LanguageEntityField extends RawEntityField {
  /** Language-specific type (resolved at enhancement time) */
  langType: string;
  /** SQL type for database schemas */
  sqlType: string;
  /** Column name (snake_case) */
  columnName: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function pluralize(name: string): string {
  // Simple pluralization rules
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('ch')) {
    return name + 'es';
  }
  if (name.endsWith('y') && !/[aeiou]y$/i.test(name)) {
    return name.slice(0, -1) + 'ies';
  }
  return name + 's';
}

// ============================================================================
// LanguageEntity Class
// ============================================================================

/**
 * Entity with language-specific field types.
 *
 * Uses deferred type resolution like LanguageMethod.
 * Fields are resolved when accessed, using the language set via this.lang.
 */
export class LanguageEntity extends LanguageThing {
  constructor(
    /** Raw entity metadata - accepts EntityMetadata from heddles */
    readonly raw: RawEntity | { name: string; fields?: RawEntityField[] }
  ) {
    super(raw.name);
  }

  /** Type name (PascalCase) - resolved from current language */
  get typeName(): string {
    return pascalCase(this.raw.name);
  }

  /** Table name (snake_case plural) */
  get tableName(): string {
    return snakeCase(pluralize(this.raw.name));
  }

  /** Variable name (camelCase) */
  get variableName(): string {
    return camelCase(this.raw.name);
  }

  /** Module name (snake_case) */
  get moduleName(): string {
    return snakeCase(this.raw.name);
  }

  /** camelName alias */
  get camelName(): string {
    return camelCase(this.raw.name);
  }

  /** pascalName alias */
  get pascalName(): string {
    return pascalCase(this.raw.name);
  }

  /** snakeName alias */
  get snakeName(): string {
    return snakeCase(this.raw.name);
  }

  /** All fields with language-specific types resolved */
  get fields(): LanguageEntityField[] {
    return (this.raw.fields || []).map((field) => this.enhanceField(field));
  }

  /** Primary key field */
  get primaryField(): LanguageEntityField | undefined {
    const rawField = (this.raw.fields || []).find((f) => f.isPrimary);
    return rawField ? this.enhanceField(rawField) : undefined;
  }

  /** Insertable fields (excludes auto-generated) */
  get insertFields(): LanguageEntityField[] {
    return (this.raw.fields || [])
      .filter((f) => f.forInsert !== false && !f.isUpdatedAt)
      .map((f) => this.enhanceField(f));
  }

  /** Updatable fields (excludes primary key and auto-generated) */
  get updateFields(): LanguageEntityField[] {
    return (this.raw.fields || [])
      .filter((f) => f.forUpdate !== false && !f.isPrimary && !f.isCreatedAt)
      .map((f) => this.enhanceField(f));
  }

  /** SQL CREATE TABLE statement */
  get tableDefinition(): string {
    const columns = this.fields
      .map(
        (f) =>
          `  ${f.columnName} ${f.sqlType}${f.isPrimary ? ' PRIMARY KEY' : ''}${f.nullable ? '' : ' NOT NULL'},`
      )
      .join('\n');
    return `CREATE TABLE ${this.tableName} (\n${columns}\n);`;
  }

  /** Enhance a raw field with language-specific types */
  private enhanceField(field: RawEntityField): LanguageEntityField {
    const langTypeDef = this.lang.codeGen.types.fromTsType(field.tsType, false);
    const langType = langTypeDef.name.toString();

    // SQL type mapping (simplified)
    const sqlType = (() => {
      switch (field.tsType.toLowerCase()) {
        case 'string':
          return 'TEXT';
        case 'number':
          return 'INTEGER';
        case 'boolean':
        case 'bool':
          return 'INTEGER';
        default:
          return 'TEXT';
      }
    })();

    return {
      ...field,
      langType,
      sqlType,
      columnName: snakeCase(field.name)
    };
  }
}
