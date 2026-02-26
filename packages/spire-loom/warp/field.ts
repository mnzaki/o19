/**
 * Entity Field Definitions 🌱
 *
 * Runtime field metadata for entity classes.
 *
 * "Fields are the seeds from which database rows bloom."
 *
 * This module provides the field factory pattern for defining entity
 * schemas with zero decorators. Fields are assigned as class properties
 * and collected at decoration time.
 *
 * Usage:
 * ```typescript
 * @BookmarkMgmt.Entity()
 * class Bookmark {
 *   id = crud.field.id();
 *   url = crud.field.string();
 *   createdAt = crud.field.createdAt();
 * }
 * ```
 *
 * Architecture:
 * ```
 * Field Factory → Field Instance → @Entity() Decorator
 *      ↓                ↓              ↓
 *   crud.field.      new Field()   collectFields()
 *   string()         (anonymous     (ClassMetadata
 *                    name)          Collector)
 * ```
 */

import { toSnakeCase } from '../machinery/stringing.js';
import {
  mapToRustType,
  mapToSqlType
} from '../machinery/bobbin/type-mappings.js';

// ============================================================================
// Options Interfaces
// ============================================================================

/**
 * Base options for all field types.
 */
export interface BaseOptions<T = any> {
  /** Whether the field is nullable */
  nullable?: boolean;
  /** Override the Rust type mapping */
  rustType?: string;
  /** Override the SQL type mapping */
  sqlType?: string;
  /** Override the column name (default: snake_case of property name) */
  columnName?: string;
  /** Default value for Rust Default impl */
  default?: T | (() => T);

  // Internal flags (set by specialized factories)
  /** Whether this is a primary key */
  isPrimary?: boolean;
  /** Whether this is an auto-managed created timestamp */
  isCreatedAt?: boolean;
  /** Whether this is an auto-managed updated timestamp */
  isUpdatedAt?: boolean;
}

/**
 * Options for string fields.
 */
export interface StringOptions extends BaseOptions<string> {
  /** Maximum length (for VARCHAR), undefined means TEXT */
  length?: number;
}

/**
 * Options for number fields.
 */
export interface NumberOptions extends BaseOptions<number> {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
}

/**
 * Options for primary key fields.
 */
export interface IdOptions extends BaseOptions<number> {
  // Primary key specific options (currently none)
}

/**
 * Options for timestamp fields.
 */
export interface TimestampOptions extends BaseOptions<number> {
  /** Auto-set on insert */
  autoNow?: boolean;
  /** Auto-set on update */
  autoNowUpdate?: boolean;
}

/**
 * Complete field options type.
 */
export interface FieldOptions<T> extends BaseOptions<T> {}

// ============================================================================
// Core Field Class
// ============================================================================

/**
 * Base field class with metadata.
 *
 * This is the foundation for all field types. It carries type information
 * and computed properties for code generation.
 *
 * The name property is set lazily by the @Entity() decorator after
 * instantiation, since the factory doesn't know the property name.
 */
export class Field<T> {
  /** Property name (set by @Entity() decorator) */
  name: string = '';

  /** TypeScript type */
  readonly tsType: string;

  /** Field options */
  readonly options: FieldOptions<T>;

  constructor(tsType: string, options: FieldOptions<T> = {}) {
    this.tsType = tsType;
    this.options = options;
  }

  // ========================================================================
  // Computed Properties (for template use)
  // ========================================================================

  /**
   * Rust type (mapped from TypeScript type).
   */
  get rustType(): string {
    return this.options.rustType ?? mapToRustType(this.tsType);
  }

  /**
   * SQL type (mapped from TypeScript type).
   */
  get sqlType(): string {
    // Handle string length → VARCHAR vs TEXT
    if (this.tsType === 'string' && 'length' in this.options) {
      const length = (this.options as StringOptions).length;
      if (length) {
        return `VARCHAR(${length})`;
      }
    }
    return this.options.sqlType ?? mapToSqlType(this.tsType);
  }

  /**
   * SQL column name (snake_case of property name).
   */
  get columnName(): string {
    return this.options.columnName ?? toSnakeCase(this.name);
  }

  /**
   * Whether the field is nullable.
   */
  get nullable(): boolean {
    return this.options.nullable ?? false;
  }

  /**
   * Whether this is the primary key.
   */
  get isPrimary(): boolean {
    return this.options.isPrimary ?? false;
  }

  /**
   * Whether this is an auto-managed created timestamp.
   */
  get isCreatedAt(): boolean {
    return this.options.isCreatedAt ?? false;
  }

  /**
   * Whether this is an auto-managed updated timestamp.
   */
  get isUpdatedAt(): boolean {
    return this.options.isUpdatedAt ?? false;
  }

  /**
   * Whether to include in INSERT statements.
   * Primary keys and auto timestamps are excluded.
   */
  get forInsert(): boolean {
    return !this.isPrimary && !this.isCreatedAt && !this.isUpdatedAt;
  }

  /**
   * Whether to include in UPDATE statements.
   * Primary keys and created timestamps are excluded.
   */
  get forUpdate(): boolean {
    return !this.isPrimary && !this.isCreatedAt;
  }

  /**
   * Whether to include in SELECT statements (always true).
   */
  get forSelect(): boolean {
    return true;
  }
}

// ============================================================================
// Specialized Field Types
// ============================================================================

/**
 * Primary key field.
 *
 * Always maps to i64 in Rust and INTEGER in SQL.
 * Automatically excluded from INSERT and UPDATE.
 */
export class PrimaryKeyField extends Field<number> {
  constructor(options: IdOptions = {}) {
    super('number', {
      isPrimary: true,
      rustType: 'i64',
      sqlType: 'INTEGER',
      nullable: false,
      ...options
    });
  }
}

/**
 * Timestamp field for created_at/updated_at.
 *
 * Maps to i64 in Rust and INTEGER in SQL (Unix timestamp).
 */
export class TimestampField extends Field<number> {
  constructor(isCreated: boolean, options: TimestampOptions = {}) {
    super('number', {
      rustType: 'i64',
      sqlType: 'INTEGER',
      nullable: false,
      isCreatedAt: isCreated,
      isUpdatedAt: !isCreated,
      ...options
    });
  }
}

// ============================================================================
// Field Factory
// ============================================================================

/**
 * Field factory namespace.
 *
 * These are the functions users call to define entity fields.
 * Each returns a Field instance with appropriate defaults.
 *
 * Usage:
 * ```typescript
 * @BookmarkMgmt.Entity()
 * class Bookmark {
 *   id = crud.field.id();
 *   url = crud.field.string();
 *   count = crud.field.int();
 *   createdAt = crud.field.createdAt();
 * }
 * ```
 */
export const field = {
  /**
   * Primary key field.
   *
   * @example
   * id = crud.field.id()
   * // rustType: 'i64', sqlType: 'INTEGER', forInsert: false
   */
  id(options: IdOptions = {}): PrimaryKeyField {
    return new PrimaryKeyField(options);
  },

  /**
   * String field.
   *
   * @example
   * url = crud.field.string()
   * // sqlType: 'TEXT'
   *
   * url = crud.field.string({ length: 2048 })
   * // sqlType: 'VARCHAR(2048)'
   *
   * url = crud.field.string({ nullable: true })
   * // nullable: true
   */
  string(options: StringOptions = {}): Field<string> {
    return new Field<string>('string', options);
  },

  /**
   * Text field (alias for string with TEXT type).
   *
   * @example
   * notes = crud.field.text()
   * // sqlType: 'TEXT'
   */
  text(options: Omit<StringOptions, 'length'> = {}): Field<string> {
    return new Field<string>('string', { sqlType: 'TEXT', ...options });
  },

  /**
   * Integer field.
   *
   * @example
   * count = crud.field.int()
   * // rustType: 'i64', sqlType: 'INTEGER'
   */
  int(options: NumberOptions = {}): Field<number> {
    return new Field<number>('number', options);
  },

  /**
   * Boolean field.
   *
   * @example
   * isActive = crud.field.bool()
   * // rustType: 'bool', sqlType: 'INTEGER' (SQLite has no native bool)
   */
  bool(options: BaseOptions<boolean> = {}): Field<boolean> {
    return new Field<boolean>('boolean', options);
  },

  /**
   * Timestamp field (generic).
   *
   * For auto-managed timestamps, use createdAt() or updatedAt().
   *
   * @example
   * timestamp = crud.field.timestamp()
   * // rustType: 'i64', sqlType: 'INTEGER'
   */
  timestamp(options: TimestampOptions = {}): Field<number> {
    return new Field<number>('number', {
      rustType: 'i64',
      sqlType: 'INTEGER',
      ...options
    });
  },

  /**
   * Auto-managed created timestamp.
   *
   * Automatically excluded from INSERT and UPDATE.
   *
   * @example
   * createdAt = crud.field.createdAt()
   * // isCreatedAt: true, forInsert: false, forUpdate: false
   */
  createdAt(options: Omit<TimestampOptions, 'autoNowUpdate'> = {}): TimestampField {
    return new TimestampField(true, { autoNow: true, ...options });
  },

  /**
   * Auto-managed updated timestamp.
   *
   * Automatically excluded from INSERT, included in UPDATE.
   *
   * @example
   * updatedAt = crud.field.updatedAt()
   * // isUpdatedAt: true, forInsert: false, forUpdate: true
   */
  updatedAt(options: Omit<TimestampOptions, 'autoNow'> = {}): TimestampField {
    return new TimestampField(false, { autoNowUpdate: true, ...options });
  },

  /**
   * JSON field.
   *
   * @example
   * metadata = crud.field.json<BookmarkMeta>()
   * // sqlType: 'JSON' (or 'JSONB' for PostgreSQL)
   *
   * metadata = crud.field.json({ sqlType: 'JSONB' })
   * // sqlType: 'JSONB'
   */
  json<T = unknown>(options: BaseOptions<T> = {}): Field<T> {
    return new Field<T>('object', {
      sqlType: 'JSON',
      ...options
    });
  },

  /**
   * Custom field (escape hatch).
   *
   * Use this when you need full control over type mappings.
   *
   * @example
   * uuid = crud.field.custom<string>('string', {
   *   rustType: 'Uuid',
   *   sqlType: 'UUID'
   * })
   */
  custom<T>(tsType: string, options: FieldOptions<T> = {}): Field<T> {
    return new Field<T>(tsType, options);
  }
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a Field instance.
 */
export function isField(value: unknown): value is Field<unknown> {
  return value instanceof Field;
}

/**
 * Check if a value is a PrimaryKeyField.
 */
export function isPrimaryKeyField(value: unknown): value is PrimaryKeyField {
  return value instanceof PrimaryKeyField;
}

/**
 * Check if a value is a TimestampField.
 */
export function isTimestampField(value: unknown): value is TimestampField {
  return value instanceof TimestampField;
}

// ============================================================================
// Metadata Extraction
// ============================================================================

/**
 * Extract field metadata for storage in EntityMetadata.
 *
 * This converts a Field instance to the serializable metadata format
 * that templates receive.
 *
 * @param field - The field to extract metadata from
 * @returns Serializable field metadata
 */
export function extractFieldMetadata(field: Field<unknown>): {
  name: string;
  tsType: string;
  rustType: string;
  sqlType: string;
  columnName: string;
  nullable: boolean;
  isPrimary: boolean;
  isCreatedAt: boolean;
  isUpdatedAt: boolean;
  forInsert: boolean;
  forUpdate: boolean;
} {
  return {
    name: field.name,
    tsType: field.tsType,
    rustType: field.rustType,
    sqlType: field.sqlType,
    columnName: field.columnName,
    nullable: field.nullable,
    isPrimary: field.isPrimary,
    isCreatedAt: field.isCreatedAt,
    isUpdatedAt: field.isUpdatedAt,
    forInsert: field.forInsert,
    forUpdate: field.forUpdate
  };
}
