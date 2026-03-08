/**
 * Heddles Enrichment
 *
 * Enriches management methods with computed metadata from the ownership chain.
 * This is the core value of heddles - computing useResult, wrappers, etc.
 */

import { CoreRing, ExternalLayer, RustCore } from '../../warp/index.js';
import type {
  EntityMetadata,
  LinkMetadata,
  ManagementMetadata,
  MethodMetadata
} from '../../warp/metadata.js';
import {
  RUST_STRUCT_CONFIG,
  RUST_STRUCT_FIELDS,
  RUST_WRAPPERS,
  RustExternalLayer,
  type RustStructOptions
} from '../../warp/rust.js';
import type { EntityWithFields } from '../heddles/types.js';
import type { CrudMapping } from '../sley/crud-mapping.js';
import { groupByCrud, groupByManagement } from '../sley/method-pipeline.js';
import { toSnakeCase } from '../stringing.js';
import { buildComputedHelpers } from '../treadle-kit/computed-entity-helpers.js';
import { LanguageEntity, type LanguageEntityField } from './language/entity.js';
import { LanguageMethod } from './language/method.js';

/**
 * Management methods grouped with service metadata.
 * Provides all information needed to generate DDD services.
 */
export interface ManagementMethods {
  /** Management name (e.g., "BookmarkMgmt") */
  name: string;
  /** Entity name derived from management (e.g., "Bookmark") */
  entityName: string;
  /** Service class name (e.g., "BookmarkService") */
  serviceName: string;
  /** Port interface name (e.g., "BookmarkPort") */
  portName: string;
  /** All methods for this management */
  methods: LanguageMethod[];
  /** Read methods (read, list operations) */
  readMethods: LanguageMethod[];
  /** Write methods (create, update, delete operations) */
  writeMethods: LanguageMethod[];
  /** Passthrough methods (no CRUD classification) */
  passthroughMethods: LanguageMethod[];
}

/**
 * Method helpers available in generator context.
 * Provides convenient access to filtered and grouped management methods.
 */
export interface MethodHelpers {
  all: LanguageMethod[];

  /** Group methods by management name */
  byManagement(): Map<string, ManagementMethods>;
  /** Group methods by CRUD operation */
  byCrud(): Map<string, LanguageMethod[]>;
  /** Get methods with specific tag */
  withTag(tag: string): LanguageMethod[];
  /** Get methods with specific CRUD operation */
  withCrud(op: string): LanguageMethod[];

  /** Iterate all methods */
  forEach(cb: (method: LanguageMethod) => void): void;
  /** Iterate filtered methods */
  filteredForEach(
    filter: (method: LanguageMethod) => boolean,
    cb: (method: LanguageMethod) => void
  ): void;

  /** All create methods */
  get creates(): LanguageMethod[];
  /** All read methods */
  get reads(): LanguageMethod[];
  /** All update methods */
  get updates(): LanguageMethod[];
  /** All delete methods */
  get deletes(): LanguageMethod[];
  /** All list methods */
  get lists(): LanguageMethod[];
}

export interface EntityHelpers {
  all: LanguageEntity[];

  /** Iterate all methods */
  forEach(cb: (entity: LanguageEntity) => void): void;
  /** Iterate filtered methods */
  filteredForEach(
    filter: (method: LanguageEntity) => boolean,
    cb: (method: LanguageEntity) => void
  ): void;
}

//export interface QueryHelpers {}

type Enhancer = (mgmt: ManagementMetadata & { link: LinkMetadata }) => ManagementMetadata;
const enrichers = new Map<new (...args: any[]) => ExternalLayer, Enhancer>();
enrichers.set(RustExternalLayer, (mgmt) => {
  // Resolve the link to get struct metadata
  const target = mgmt.link.target as RustExternalLayer;
  if (target.isRustStruct()) {
    //  // Get struct config for useResult
    //  const structConfig: RustStructOptions | undefined = target?.[RUST_STRUCT_CONFIG];
    //  const shouldAddResultTag = structConfig?.useResult ?? false;
    //  const rustFields = target?.[RUST_STRUCT_FIELDS]
    //  // Get field wrappers from struct metadata
    //  // The structClass.__rustFields is a Map<string, { [RUST_WRAPPERS]: string[] }>
    //  const fieldMeta = rustFields?.get(tar
    //  // Access wrappers using the Symbol key (not string 'wrappers')
    //  const wrappers = fieldMeta?.[RUST_WRAPPERS] ?? [];
    // Enrich each method with computed metadata
    //  const enrichedMethods = mgmt.methods.map((method) => ({
    //    ...method,
    //    wrappers,
    //    fieldName: link.fieldName,
    //    // Add 'rust:result' tag if struct has useResult: true
    //    tags: shouldAddResultTag ? [...(method.tags || []), 'rust:result'] : method.tags
    //  }));
  }

  return mgmt;
});

/**
 * Enrich management methods with computed metadata.
 *
 * The heddles look up the ownership chain to compute values:
 * - Management → Link → Struct Field → Wrappers
 * - Management → Link → Struct → useResult config
 *
 * This is the proper place for such computation (not in reed or treadles).
 */
export function enrichManagement(mgmt: ManagementMetadata): ManagementMetadata {
  // If no link, return as-is
  if (!mgmt.link) {
    return mgmt;
  }

  for (const [layerType, enhancer] of enrichers) {
    if (mgmt.link?.target instanceof layerType) {
      mgmt = enhancer(mgmt as ManagementMetadata & { link: LinkMetadata });
    }
  }

  return mgmt;
}

/**
 * Extract management name from bind-point name.
 * Best-effort mapping since LanguageMethod doesn't have managementName.
 *
 * @param bindPointName - Snake_case method name (e.g., "bookmark_add_bookmark")
 * @param managementNames - All known management names
 * @returns Best matching management name or undefined
 */
export function extractManagementFromBindPoint(
  bindPointName: string,
  managementNames: string[]
): string | undefined {
  const methodNameLower = bindPointName.toLowerCase();

  for (const mgmtName of managementNames) {
    const mgmtPrefix = toSnakeCase(mgmtName.replace(/Mgmt$/, ''));
    if (methodNameLower.startsWith(mgmtPrefix + '_')) {
      return mgmtName;
    }
  }
  return undefined;
}

/**
 * Extract entity name from management name.
 * E.g., "BookmarkMgmt" -> "Bookmark"
 */
function extractEntityName(managementName: string): string {
  return managementName.replace(/Mgmt$/, '');
}

/**
 * Build ManagementMethods from a collection of methods.
 */
function buildManagementMethods(mgmtName: string, methods: LanguageMethod[]): ManagementMethods {
  const entityName = extractEntityName(mgmtName);

  // Classify methods by CRUD operation
  const readMethods = methods.filter(
    (m) => m.crudOperation === 'read' || m.crudOperation === 'list'
  );
  const writeMethods = methods.filter((m) =>
    ['create', 'update', 'delete'].includes(m.crudOperation || '')
  );
  const passthroughMethods = methods.filter((m) => !m.crudOperation);

  return {
    name: mgmtName,
    entityName,
    serviceName: `${entityName}Service`,
    portName: `${entityName}Port`,
    methods,
    readMethods,
    writeMethods,
    passthroughMethods
  };
}

/**
 * Build method helpers for GeneratorContext.
 * Provides convenient access to filtered and grouped methods.
 *
 * Uses sley's groupByManagement and groupByCrud utilities for consistent
 * grouping behavior across the codebase.
 *
 * @param methods - Raw methods after pipeline transformation
 * @returns Method helpers with grouping and filtering
 */
export function enrichManagementMethods(methodMetadata: MethodMetadata[]): MethodHelpers {
  const methods = methodMetadata.map((m) => new LanguageMethod(m));
  // Pre-compute groupings using sley utilities
  const byMgmtMap = groupByManagement(methods);
  const byCrudMap = groupByCrud(methods);

  return {
    all: methods,

    byManagement(): Map<string, ManagementMethods> {
      // Filter out 'unknown' entries and warn if any exist
      const result = new Map<string, ManagementMethods>();
      byMgmtMap.forEach((methods, mgmtName) => {
        if (mgmtName === 'unknown') {
          console.warn(
            `[context-methods] ${methods.length} method(s) without management name:`,
            methods.map((m) => m.name).join(', ')
          );
          return;
        }
        result.set(mgmtName, buildManagementMethods(mgmtName, methods as LanguageMethod[]));
      });
      return result;
    },

    byCrud(): Map<string, LanguageMethod[]> {
      return byCrudMap as Map<string, LanguageMethod[]>;
    },

    withTag(tag: string): LanguageMethod[] {
      return methods.filter((m) => (m as any).tags?.includes(tag));
    },

    withCrud(op: string): LanguageMethod[] {
      return methods.filter((m) => (m as any).crudOperation === op);
    },

    forEach(cb: (method: LanguageMethod) => void): void {
      methods.forEach(cb);
    },

    filteredForEach(
      filter: (method: LanguageMethod) => boolean,
      cb: (method: LanguageMethod) => void
    ): void {
      methods.filter(filter).forEach(cb);
    },

    get creates(): LanguageMethod[] {
      return this.withCrud('create');
    },
    get reads(): LanguageMethod[] {
      return this.withCrud('read');
    },
    get updates(): LanguageMethod[] {
      return this.withCrud('update');
    },
    get deletes(): LanguageMethod[] {
      return this.withCrud('delete');
    },
    get lists(): LanguageMethod[] {
      return this.withCrud('list');
    }
  };
}

export function enrichManagementEntities(entities: EntityMetadata[]): EntityHelpers {
  const all = entities.map((e) => {
    // Enhance fields with language-specific types
    const fields: LanguageEntityField[] = e.fields!.map((field) => {
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
        sqlType,
        columnName: toSnakeCase(field.name)
      };
    });
    return new LanguageEntity(e.name, e.name, e.lower, fields);
  });

  return {
    all,

    //byManagement(): Map<string, LanguageEntity[]> {
    //  const grouped = new Map<string, LanguageEntity[]>();
    //  for (const entity of all) {
    //    const list = grouped.get(entity.managementName) ?? [];
    //    list.push(entity);
    //    grouped.set(entity.managementName, list);
    //  }
    //  return grouped;
    //},

    //withTag(tag: string): LanguageEntity[] {
    //  return all.filter((e) => e.tags?.includes(tag));
    //},

    //get readOnly(): LanguageEntity[] {
    //  return entities.filter((e) => e.options?.readOnly);
    //},

    //get readWrite(): EntityMetadata[] {
    //  return entities.filter((e) => !e.options?.readOnly);
    //},

    /**
     * Get entities with field metadata and computed SQL helpers.
     *
     * This is the main entry point for code generation - it provides
     * entities with all the computed properties templates need:
     * - insertFields, updateFields
     * - insertColumns, insertPlaceholders
     * - primaryField, etc.
     */
    //withFields(): LanguageEntity[] {
    //  return all
    //    .filter((e) => e.fields && e.fields.length > 0)
    //    .map((entity) => {
    //      const helpers = buildComputedHelpers(entity.fields!);
    //      return {
    //        ...entity,
    //        ...helpers
    //      } as EntityWithFields;
    //    });
    //},

    forEach(cb: (entity: LanguageEntity) => void): void {
      all.forEach(cb);
    },

    filteredForEach(
      filter: (entity: LanguageEntity) => boolean,
      cb: (entity: LanguageEntity) => void
    ): void {
      all.filter(filter).forEach(cb);
    }
  };
}
