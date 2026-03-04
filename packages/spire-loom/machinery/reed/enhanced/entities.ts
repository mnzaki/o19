/**
 * Entity Enhancement System 🌀
 *
 * Generic entity enhancement with language-specific views.
 *
 * Declares itself as the 'entity' enhancement system using declareEnhancement().
 * Parallel to method enhancement - provides:
 * - enhanceEntity: Transform raw entity for a specific language
 * - createEntityLanguageView: Create idiomatic view with naming conventions
 * - createEnhancedEntity: Container with multiple language views
 *
 * @module machinery/reed/enhanced/entities
 */

import { languages as languageRegistry, getLanguageExtensionKey } from '../language/index.js';
import type { LanguageDefinition, NamingConventions } from '../language/imperative.js';
import { pascalCase, camelCase, toSnakeCase } from '../../stringing.js';
import { declareEnhancement } from './enhancement.js';

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

/**
 * Entity with language-specific field types.
 */
export interface LanguageEntity {
  /** Entity name */
  name: string;
  /** Type name in language convention */
  typeName: string;
  /** Table name (snake_case plural) */
  tableName: string;
  /** Fields with resolved types */
  fields: LanguageEntityField[];
  /** Primary key field */
  primaryField?: LanguageEntityField;
  /** Insertable fields (excludes auto-generated) */
  insertFields: LanguageEntityField[];
  /** Updatable fields (excludes primary key and auto-generated) */
  updateFields: LanguageEntityField[];
}

// ============================================================================
// Entity Field View
// ============================================================================

/**
 * Simplified field view for templates.
 */
export interface EntityFieldView {
  /** Field name */
  readonly name: string;
  /** Variable name in language convention */
  readonly variableName: string;
  /** Language-specific type */
  readonly type: string;
  /** SQL type */
  readonly sqlType: string;
  /** Column name */
  readonly columnName: string;
  /** TypeScript type */
  readonly tsType: string;
  /** Whether nullable */
  readonly nullable: boolean;
  /** Whether primary key */
  readonly isPrimary: boolean;
  /** Whether auto-created timestamp */
  readonly isCreatedAt: boolean;
  /** Whether auto-updated timestamp */
  readonly isUpdatedAt: boolean;
}

// ============================================================================
// Entity Language View
// ============================================================================

/**
 * Language view for entities - idiomatic API for templates.
 */
export interface EntityLanguageView {
  /** Reference to language definition */
  readonly _language: LanguageDefinition;
  /** Reference to underlying LanguageEntity */
  readonly _raw: LanguageEntity;
  /** Reference to naming convention */
  readonly _naming: NamingConventions;

  // Entity naming
  /** Type name (PascalCase) */
  readonly typeName: string;
  /** Table name (snake_case plural) */
  readonly tableName: string;
  /** Variable name (camelCase) */
  readonly variableName: string;
  /** Module name (snake_case) */
  readonly moduleName: string;

  // Raw names
  readonly camelName: string;
  readonly pascalName: string;
  readonly snakeName: string;

  // Fields
  /** All fields with language views */
  readonly fields: EntityFieldView[];
  /** Primary key field */
  readonly primaryField?: EntityFieldView;
  /** Insertable fields */
  readonly insertFields: EntityFieldView[];
  /** Updatable fields */
  readonly updateFields: EntityFieldView[];

  // Code generation helpers
  /** Struct/Class definition */
  readonly structDefinition: string;
  /** SQL CREATE TABLE statement */
  readonly tableDefinition: string;
}

// ============================================================================
// Enhanced Entity Container
// ============================================================================

/**
 * Enhanced entity with multiple language views.
 *
 * Base RawEntity properties are preserved, with language views
 * attached as extension-keyed properties (rs, ts, kt).
 */
export interface EnhancedEntity extends RawEntity {
  /** Default language extension key */
  readonly _default: string;
  /** All enhanced language keys */
  readonly _languages: string[];

  // Default language getters (delegate to _default view)
  readonly typeName: string;
  readonly tableName: string;
  readonly variableName: string;
  readonly moduleName: string;
  readonly camelName: string;
  readonly pascalName: string;
  readonly snakeName: string;
  readonly fields: EntityFieldView[];
  readonly primaryField?: EntityFieldView;
  readonly insertFields: EntityFieldView[];
  readonly updateFields: EntityFieldView[];
  readonly structDefinition: string;
  readonly tableDefinition: string;

  // Language views by extension key
  readonly rs?: EntityLanguageView;
  readonly ts?: EntityLanguageView;
  readonly kt?: EntityLanguageView;
}

// ============================================================================
// Helper Functions
// ============================================================================

function applyNamingConvention(
  name: string,
  convention: NamingConventions[keyof NamingConventions] | null | undefined
): string {
  if (!convention) return name;

  switch (convention) {
    case 'snake_case':
      return toSnakeCase(name);
    case 'camelCase':
      return camelCase(name);
    case 'PascalCase':
      return pascalCase(name);
    case 'SCREAMING_SNAKE':
      return toSnakeCase(name).toUpperCase();
    case 'kebab-case':
      return toSnakeCase(name).replace(/_/g, '-');
    default:
      return name;
  }
}

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
// Entity Enhancement
// ============================================================================

/**
 * Enhance a raw entity with a language's type system.
 *
 * Resolves TypeScript types to language-specific types using the
 * language's TypeFactory.
 *
 * @param entity - Raw entity from decorator metadata
 * @param language - Language identifier (e.g., 'rust', 'typescript')
 * @returns Language-enhanced entity
 */
export function enhanceEntity(entity: RawEntity, language: string): LanguageEntity {
  const lang = languageRegistry.get(language);
  if (!lang?.codeGen?.types) {
    throw new Error(
      `Language '${language}' not registered or has no types. ` +
        `Registered languages: ${
          languageRegistry
            .getAll()
            .map((l) => l.name)
            .join(', ') || '(none)'
        }`
    );
  }

  const types = lang.codeGen.types;
  const naming = lang.conventions.naming;

  // Enhance fields with language-specific types
  const fields: LanguageEntityField[] = entity.fields.map((field) => {
    const langTypeDef = types.fromTsType(field.tsType, false);
    const langType = langTypeDef.name;

    // SQL type mapping (simplified - could be extended)
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
      columnName: toSnakeCase(field.name)
    };
  });

  // Identify special fields
  const primaryField = fields.find((f) => f.isPrimary);
  const insertFields = fields.filter((f) => f.forInsert !== false && !f.isUpdatedAt);
  const updateFields = fields.filter(
    (f) => f.forUpdate !== false && !f.isPrimary && !f.isCreatedAt
  );

  return {
    name: entity.name,
    typeName: applyNamingConvention(entity.name, naming.type),
    tableName: toSnakeCase(pluralize(entity.name)),
    fields,
    primaryField,
    insertFields,
    updateFields
  };
}

// ============================================================================
// Entity Language View
// ============================================================================

/**
 * Create a language view for an entity.
 *
 * Provides idiomatic naming and template-friendly properties.
 *
 * @param entity - Language-enhanced entity
 * @param lang - Language definition
 * @param langKey - Extension key (rs, ts, kt)
 * @returns Entity language view
 */
export function createEntityLanguageView(
  entity: LanguageEntity,
  lang: LanguageDefinition,
  langKey: string
): EntityLanguageView {
  const view = {} as EntityLanguageView;
  const naming = lang.conventions.naming;

  // Store references
  Object.defineProperty(view, '_language', {
    value: lang,
    writable: false,
    enumerable: false
  });
  Object.defineProperty(view, '_raw', {
    value: entity,
    writable: false,
    enumerable: false
  });
  Object.defineProperty(view, '_naming', {
    value: naming,
    writable: false,
    enumerable: false
  });

  // Entity naming
  Object.defineProperty(view, 'typeName', {
    get() {
      return entity.typeName;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'tableName', {
    get() {
      return entity.tableName;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'variableName', {
    get() {
      return applyNamingConvention(entity.name, naming.variable);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'moduleName', {
    get() {
      return applyNamingConvention(entity.name, naming.module);
    },
    enumerable: true
  });

  // Raw names
  Object.defineProperty(view, 'camelName', {
    get() {
      return camelCase(entity.name);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'pascalName', {
    get() {
      return pascalCase(entity.name);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'snakeName', {
    get() {
      return toSnakeCase(entity.name);
    },
    enumerable: true
  });

  // Fields
  const createFieldView = (field: LanguageEntityField): EntityFieldView => ({
    get name() {
      return field.name;
    },
    get variableName() {
      return applyNamingConvention(field.name, naming.variable);
    },
    get type() {
      return field.langType;
    },
    get sqlType() {
      return field.sqlType;
    },
    get columnName() {
      return field.columnName;
    },
    get tsType() {
      return field.tsType;
    },
    get nullable() {
      return field.nullable ?? false;
    },
    get isPrimary() {
      return field.isPrimary ?? false;
    },
    get isCreatedAt() {
      return field.isCreatedAt ?? false;
    },
    get isUpdatedAt() {
      return field.isUpdatedAt ?? false;
    }
  });

  Object.defineProperty(view, 'fields', {
    get() {
      return entity.fields.map(createFieldView);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'primaryField', {
    get() {
      return entity.primaryField ? createFieldView(entity.primaryField) : undefined;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'insertFields', {
    get() {
      return entity.insertFields.map(createFieldView);
    },
    enumerable: true
  });

  Object.defineProperty(view, 'updateFields', {
    get() {
      return entity.updateFields.map(createFieldView);
    },
    enumerable: true
  });

  // Code generation helpers
  Object.defineProperty(view, 'structDefinition', {
    get() {
      // Language-specific struct definition
      // Could be customized per language via rendering config
      const fields = entity.fields
        .map((f) => `  ${applyNamingConvention(f.name, naming.variable)}: ${f.langType},`)
        .join('\n');
      return `${entity.typeName} {\n${fields}\n}`;
    },
    enumerable: true
  });

  Object.defineProperty(view, 'tableDefinition', {
    get() {
      const columns = entity.fields
        .map(
          (f) =>
            `  ${f.columnName} ${f.sqlType}${f.isPrimary ? ' PRIMARY KEY' : ''}${f.nullable ? '' : ' NOT NULL'},`
        )
        .join('\n');
      return `CREATE TABLE ${entity.tableName} (\n${columns}\n);`;
    },
    enumerable: true
  });

  return view;
}

// ============================================================================
// Enhanced Entity Container
// ============================================================================

/**
 * Create an enhanced entity container with language views.
 *
 * @param raw - Original raw entity
 * @param enhancements - Map of language key to {entity, lang}
 * @param defaultLangKey - Default language extension key
 * @returns Enhanced entity with views and delegating getters
 */
export function createEnhancedEntity(
  raw: RawEntity,
  enhancements: Map<string, { item: LanguageEntity; lang: LanguageDefinition }>,
  defaultLangKey: string
): EnhancedEntity {
  // Start with raw entity properties
  const container = { ...raw } as EnhancedEntity;

  // Create views for each language
  for (const [langKey, { item, lang }] of enhancements) {
    const view = createEntityLanguageView(item, lang, langKey);
    (container as unknown as Record<string, unknown>)[langKey] = view;
  }

  // Store metadata
  Object.defineProperty(container, '_default', {
    value: defaultLangKey,
    writable: false,
    enumerable: false
  });

  Object.defineProperty(container, '_languages', {
    value: Array.from(enhancements.keys()),
    writable: false,
    enumerable: false
  });

  // Create delegating getters
  const createDelegator = (prop: keyof EntityLanguageView) => {
    Object.defineProperty(container, prop, {
      get() {
        const view = (this as Record<string, EntityLanguageView>)[this._default];
        return view?.[prop];
      },
      enumerable: true
    });
  };

  createDelegator('typeName');
  createDelegator('tableName');
  createDelegator('variableName');
  createDelegator('moduleName');
  createDelegator('camelName');
  createDelegator('pascalName');
  createDelegator('snakeName');
  createDelegator('fields');
  createDelegator('primaryField');
  createDelegator('insertFields');
  createDelegator('updateFields');
  createDelegator('structDefinition');
  createDelegator('tableDefinition');

  return container;
}

// ============================================================================
// Batch Enhancement
// ============================================================================

/**
 * Enhance multiple entities with multiple languages.
 *
 * @param entities - Raw entities to enhance
 * @param languages - Language identifiers to enhance with
 * @param defaultLanguage - Default language (first in array if not specified)
 * @returns Enhanced entities with language views
 */
export function enhanceEntities(
  entities: RawEntity[],
  languages: string[],
  defaultLanguage?: string
): EnhancedEntity[] {
  const defaultLang = defaultLanguage || languages[0];
  const defaultLangKey = getLanguageExtensionKey(defaultLang);

  return entities.map((raw) => {
    // Enhance for each language
    const enhancements = new Map<string, { item: LanguageEntity; lang: LanguageDefinition }>();

    for (const langName of languages) {
      const langKey = getLanguageExtensionKey(langName);
      const langDef = languageRegistry.get(langName);
      if (!langDef) continue;

      const enhanced = enhanceEntity(raw, langName);
      enhancements.set(langKey, { item: enhanced, lang: langDef });
    }

    return createEnhancedEntity(raw, enhancements, defaultLangKey);
  });
}

// ============================================================================
// Self-Declaration: The Entity Enhancement System
// ============================================================================

/**
 * The entity enhancement system.
 *
 * Declares itself using declareEnhancement(), providing both single-item
 * enhancement and batch operations via enhanceAll().
 *
 * @example
 * ```typescript
 * // Direct use (same as enhanceEntity)
 * const enhanced = entityEnhancement(raw, 'rust');
 *
 * // Batch enhance with multiple languages
 * const enhanced = entityEnhancement.enhanceAll(entities, ['rust', 'typescript']);
 * ```
 */
export const entityEnhancement = declareEnhancement({
  name: 'entity',
  enhance: enhanceEntity,
  createView: createEntityLanguageView,
  createContainer: (raw, enhancements, defaultLangKey) =>
    createEnhancedEntity(raw, enhancements, defaultLangKey)
});
