/**
 * Method Pipeline (The Sley - Threading)
 *
 * A composable pipeline for processing Management methods across spiral rings.
 *
 * Architecture:
 * ```
 * Management Imprint (loom/bookmark.ts)
 *     ↓
 * Raw MgmtMethod[] (from inner ring)
 *     ↓
 * Translation Layer 1: addPrefix('bookmark_')
 *     ↓
 * Translation Layer 2: crudMapping()
 *     ↓
 * ... more translations ...
 *     ↓
 * Filter (by tags, reach)
 *     ↓
 * Code Generation
 * ```
 *
 * Key Principles:
 * - Translations STACK: each ring can add transformations
 * - Methods are COMPLETE until filtering: no data loss
 * - Filtering is LAST-SECOND: right before templates render
 * - Each ring sees the FULL picture: all methods available
 */

import type { CrudOperation } from '../../warp/imprint.js';
import { toSnakeCaseFull as toSnakeCase } from '../stringing.js';

// ============================================================================
// Core Types
// ============================================================================

/**
 * A Management method at any stage of processing.
 *
 * This is the unified representation that flows through the pipeline.
 * Each translation layer can modify fields, but the method identity is preserved.
 * 
 * Note: name is the high-level TypeScript method name (e.g., "generatePairingCode").
 * Transformations like snake_case happen when converting to RawMethod.
 * 
 * IMPORTANT: The management layer does NO translation of the WARP.
 * It merely collects and carries the WARP definitions forward.
 * All transformations (prefixing, snake_case, etc.) happen in the pipeline
 * when converting MgmtMethod → RawMethod.
 */
export interface MgmtMethod {
  /** Unique identifier: "{managementName}.{methodName}" */
  readonly id: string;

  /** Management this method belongs to (e.g., "BookmarkMgmt") */
  managementName: string;

  /** Method name from Management Imprint (e.g., "generatePairingCode") - as written in WARP.ts */
  name: string;

  /** JavaScript/TypeScript method name (camelCase, same as name) */
  jsName: string;

  /** Parameters for the method */
  params: MgmtParam[];

  /** Return type */
  returnType: string;

  /** Whether return is an array */
  isCollection: boolean;

  /** JSDoc description */
  description?: string;

  /** Tags from decorators (e.g., ['crud:create', 'auth:required']) */
  tags?: string[];

  /** CRUD operation if tagged */
  crudOperation?: CrudOperation;

  /**
   * Arbitrary metadata that translations can attach.
   * Use namespacing: 'myTranslation.key' to avoid collisions.
   * 
   * NOTE: Heddles use this to store computed metadata like useResult, wrappers.
   */
  metadata?: Record<string, unknown>;
}

/**
 * A parameter in a Management method.
 */
export interface MgmtParam {
  /** Parameter name */
  name: string;

  /** TypeScript type */
  tsType: string;

  /** Whether optional */
  optional?: boolean;

  /** Expression for passing to implementation (e.g., "data.url") */
  invokeExpr?: string;
}

/**
 * A function that transforms methods.
 *
 * Translations are PURE FUNCTIONS:
 * - Input: methods from inner ring
 * - Output: transformed methods for this ring
 * - No side effects, no filtering (filtering happens later)
 */
export type MethodTranslation = (methods: MgmtMethod[]) => MgmtMethod[];

/**
 * A filter predicate for methods.
 * Returns true to KEEP the method, false to exclude.
 */
export type MethodFilter = (method: MgmtMethod) => boolean;

// ============================================================================
// Pipeline Builder
// ============================================================================

/**
 * Builds a method processing pipeline.
 *
 * Usage:
 * ```typescript
 * const pipeline = new MethodPipeline()
 *   .translate(addPrefix('bookmark_'))
 *   .translate(crudMapping())
 *   .translate(adaptorTransforms());
 *
 * const allMethods = pipeline.process(rawMethods);
 * const filtered = pipeline.filter(allMethods, tagFilter(['crud:read']));
 * ```
 */
export class MethodPipeline {
  private translations: MethodTranslation[] = [];

  /**
   * Add a translation to the pipeline.
   * Translations are applied in the order added.
   */
  translate(translation: MethodTranslation): this {
    this.translations.push(translation);
    return this;
  }

  /**
   * Process methods through all translations.
   * Returns the complete, transformed method set.
   */
  process(methods: MgmtMethod[]): MgmtMethod[] {
    return this.translations.reduce(
      (current, translate) => translate(current),
      methods
    );
  }

  /**
   * Filter methods at the last second.
   * This should be called right before code generation.
   */
  filter(methods: MgmtMethod[], predicate: MethodFilter): MgmtMethod[] {
    return methods.filter(predicate);
  }
}

// ============================================================================
// Common Translations
// ============================================================================

/**
 * Add a prefix to all method bind-point names.
 *
 * This is used by the rustCore ring to ensure unique command names
 * across all managements: "bookmark_add" instead of just "add".
 *
 * @param prefix - Prefix to add (e.g., "bookmark_", "device_")
 * @returns Translation function
 */
export function addPrefix(prefix: string): MethodTranslation {
  return (methods) =>
    methods.map((method) => ({
      ...method,
      name: `${prefix}${method.name}`,
    }));
}

/**
 * Add management name as prefix (snake_case).
 *
 * Example: BookmarkMgmt methods get "bookmark_" prefix
 */
export function addManagementPrefix(): MethodTranslation {
  return (methods) =>
    methods.map((method) => {
      const mgmtPrefix = toSnakeCase(
        method.managementName.replace(/Mgmt$/, '')
      );
      return {
        ...method,
        name: `${mgmtPrefix}_${method.name}`,
      };
    });
}

/**
 * Transform CRUD-tagged methods to standard interface methods.
 *
 * This translation:
 * - Renames 'crud:create' methods to 'create'
 * - Renames 'crud:update' methods to 'update'
 * - Renames 'crud:delete' methods to 'delete'
 * - Keeps read/list methods as-is (they're already named well)
 * - Adds CRUD metadata for template rendering
 */
export function crudInterfaceMapping(): MethodTranslation {
  return (methods) => {
    // Group methods by management for lookup
    const byMgmt = groupByManagement(methods);
    const result: MgmtMethod[] = [];

    for (const method of methods) {
      const crudOp = extractCrudOperation(method.tags);

      if (crudOp) {
        // Find the read method for this management (for create-then-get)
        const mgmtMethods = byMgmt.get(method.managementName) || [];
        const readMethod = mgmtMethods.find((m) =>
          m.tags?.includes('crud:read')
        );

        // Transform to CRUD interface method
        const transformed = transformToCrudInterface(method, crudOp, readMethod);
        result.push(transformed);
      } else {
        // Non-CRUD: pass through unchanged
        result.push(method);
      }
    }

    return result;
  };
}

/**
 * Transform TypeScript types in method signatures.
 */
export function mapTypes(typeMap: Record<string, string>): MethodTranslation {
  return (methods) =>
    methods.map((method) => ({
      ...method,
      returnType: typeMap[method.returnType] ?? method.returnType,
      params: method.params.map((p) => ({
        ...p,
        tsType: typeMap[p.tsType] ?? p.tsType,
      })),
    }));
}

// ============================================================================
// Common Filters
// ============================================================================

/**
 * Create a filter that excludes methods with matching tags.
 *
 * @param filterOut - Tags to exclude (e.g., ['crud:read'])
 * @returns Filter predicate
 */
export function tagFilter(filterOut: string[]): MethodFilter {
  const filterSet = new Set(filterOut);

  return (method) => {
    if (!method.tags || method.tags.length === 0) {
      // Methods without tags are never filtered
      return true;
    }
    // Keep methods that don't match any filter tag
    return !method.tags.some((tag) => filterSet.has(tag));
  };
}

/**
 * Create a filter that only includes specific CRUD operations.
 */
export function crudOperationFilter(
  operations: CrudOperation[]
): MethodFilter {
  const opSet = new Set(operations);

  return (method) => {
    if (!method.crudOperation) return true; // Keep non-CRUD
    return opSet.has(method.crudOperation);
  };
}

// ============================================================================
// Helpers
// ============================================================================

// toSnakeCase is imported from '../stringing.js'

/**
 * Extract CRUD operation from tags.
 */
function extractCrudOperation(tags: string[] | undefined): CrudOperation | undefined {
  if (!tags) return undefined;
  const crudTag = tags.find((tag) => tag.startsWith('crud:'));
  if (crudTag) {
    return crudTag.replace('crud:', '') as CrudOperation;
  }
  return undefined;
}

/**
 * Group methods by management name.
 */
export function groupByManagement<T extends { managementName: string }>(
  methods: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const method of methods) {
    const list = grouped.get(method.managementName) ?? [];
    list.push(method);
    grouped.set(method.managementName, list);
  }

  return grouped;
}

/**
 * Group methods by CRUD operation.
 */
export function groupByCrud<T extends { crudOperation?: string }>(
  methods: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const method of methods) {
    const op = method.crudOperation;
    if (op) {
      const list = grouped.get(op) ?? [];
      list.push(method);
      grouped.set(op, list);
    }
  }

  return grouped;
}

/**
 * Transform a method to CRUD interface format.
 */
function transformToCrudInterface(
  method: MgmtMethod,
  operation: CrudOperation,
  readMethod?: MgmtMethod
): MgmtMethod {
  // Build new params based on operation
  let params: MgmtParam[];
  let invokeTransform: string | undefined;

  switch (operation) {
    case 'create':
      params = [
        {
          name: 'data',
          tsType: `Create${method.managementName.replace(/Mgmt$/, '')}`,
          optional: false,
          invokeExpr: buildDestructuringExpr(method.params, 'data'),
        },
      ];
      invokeTransform = params[0].invokeExpr;
      break;

    case 'update':
      params = [
        { name: 'id', tsType: 'number', optional: false },
        {
          name: 'data',
          tsType: `Update${method.managementName.replace(/Mgmt$/, '')}`,
          optional: false,
          invokeExpr: buildDestructuringExpr(method.params.slice(1), 'data'),
        },
      ];
      invokeTransform = `id, ${params[1].invokeExpr}`;
      break;

    case 'delete':
      params = [{ name: 'id', tsType: 'number', optional: false }];
      invokeTransform = 'id';
      break;

    case 'read':
    case 'list':
    default:
      params = method.params;
  }

  return {
    ...method,
    name: operation, // Interface method name: create, update, delete
    jsName: operation,
    params,
    crudOperation: operation,
    metadata: {
      ...method.metadata,
      'crud.invokeTransform': invokeTransform,
      'crud.readAfterCreate':
        operation === 'create' && readMethod
          ? {
              commandName: readMethod.name,
              idParamName: 'id',
            }
          : undefined,
      'crud.originalReturnType': method.returnType,
    },
  };
}

/**
 * Build destructuring expression: "{ url: data.url, title: data.title }"
 */
function buildDestructuringExpr(
  params: MgmtParam[],
  dataVar: string
): string {
  const mappings = params.map((p) => `${p.name}: ${dataVar}.${p.name}`);
  return `{ ${mappings.join(', ')} }`;
}

// ============================================================================
// Source Conversion
// ============================================================================

/**
 * Extended method metadata with enriched fields from heddles.
 * Heddles compute these from the ownership chain (struct config, field wrappers).
 */
export interface EnrichedMethodFields {
  useResult?: boolean;
  wrappers?: string[];
  fieldName?: string;
}

/**
 * Convert raw Management metadata to MgmtMethod pipeline format.
 *
 * This is the ENTRY POINT to the pipeline - call this first to get
 * methods in the right shape, then apply translations.
 * 
 * NOTE: This function preserves the WARP names exactly as written.
 * No transformation (snake_case, prefixing, etc.) happens here.
 * Those transformations are applied later by pipeline translations
 * when converting MgmtMethod → RawMethod.
 * 
 * NOTE: This function preserves enriched fields (useResult, wrappers) if present.
 * These come from heddles enrichment, not computed here.
 */
export function fromSourceMethods(
  managementName: string,
  methods: Array<{
    name: string;
    returnType: string;
    isCollection?: boolean;
    params: Array<{ name: string; type: string; optional?: boolean }>;
    description?: string;
    tags?: string[];
  } & EnrichedMethodFields>
): MgmtMethod[] {
  return methods.map((method) => {
    // Keep the original high-level name (e.g., "generatePairingCode")
    // Snake_case conversion happens later in toRawMethod
    return {
      id: `${managementName}.${method.name}`,
      managementName,
      name: method.name,
      jsName: method.name,
      params: method.params.map((p) => ({
        name: p.name,
        tsType: mapTypeScriptType(p.type),
        optional: p.optional,
      })),
      returnType: mapTypeScriptType(method.returnType),
      isCollection: method.isCollection ?? false,
      description: method.description,
      tags: method.tags,
      crudOperation: extractCrudOperation(method.tags),
      // Preserve enriched fields from heddles in metadata
      metadata: {
        useResult: (method as EnrichedMethodFields).useResult,
        wrappers: (method as EnrichedMethodFields).wrappers,
        fieldName: (method as EnrichedMethodFields).fieldName,
      },
    };
  });
}

/**
 * Map primitive types to TypeScript types.
 */
function mapTypeScriptType(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
      return 'string';
    case 'number':
    case 'int':
    case 'integer':
      return 'number';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'void':
      return 'void';
    default:
      return type;
  }
}
