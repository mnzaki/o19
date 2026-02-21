/**
 * CRUD Mapping (The Sley - Threading)
 *
 * Resolves bindings between standard CRUD interface methods
 * and Management-specific method implementations.
 *
 * The sley ensures every bind-point connects to the right implementation:
 * - Where does `create()` find its `@crud('create')` method?
 * - Where does `update()` find its `@crud('update')` method?
 * - Non-CRUD methods pass through unchanged.
 */

import type { CrudOperation } from '../../warp/imprint.js';

// ============================================================================
// Tag System
// ============================================================================

/**
 * A tag in namespace:format (e.g., 'crud:create', 'auth:required')
 */
export type Tag = string;

/**
 * Filter specification for methods.
 * Methods matching any of these tags are excluded.
 */
export type TagFilter = Tag[];

/**
 * Check if a method should be filtered out based on its tags.
 *
 * @param methodTags - Tags attached to the method
 * @param filterOut - Tags to filter out
 * @returns true if method should be excluded
 */
export function shouldFilterMethod(methodTags: string[] | undefined, filterOut: TagFilter): boolean {
  if (!methodTags || methodTags.length === 0) {
    // Methods without tags are never filtered out
    return false;
  }
  
  // Check if any of the method's tags match the filter
  return methodTags.some(tag => filterOut.includes(tag));
}

/**
 * Filter methods based on tags.
 * Methods without tags always pass through.
 *
 * @param methods - All methods to consider
 * @param filterOut - Tags to filter out
 * @returns Methods that pass the filter
 */
export function filterMethodsByTags<T extends { tags?: string[] }>(
  methods: T[],
  filterOut: TagFilter
): T[] {
  return methods.filter(method => !shouldFilterMethod(method.tags, filterOut));
}

// ============================================================================
// CRUD Configuration
// ============================================================================

/**
 * Configuration for CRUD adaptor generation.
 */
export interface CrudAdaptorConfig {
  /** Tags to filter OUT (exclude from generation), e.g., ['crud:read'] */
  filterOut?: TagFilter;
}

/**
 * Check if CRUD adaptor generation should be enabled.
 */
export function isCrudAdaptorEnabled(config: unknown): config is { ddd: { adaptors: CrudAdaptorConfig } } {
  return (
    typeof config === 'object' &&
    config !== null &&
    'ddd' in config &&
    typeof (config as any).ddd === 'object' &&
    (config as any).ddd !== null &&
    'adaptors' in (config as any).ddd &&
    typeof (config as any).ddd.adaptors === 'object'
  );
}

// ============================================================================
// CRUD Mapping
// ============================================================================

/**
 * A mapping from a standard CRUD interface method to a Management method.
 */
export interface CrudMapping {
  /** The CRUD operation type */
  operation: CrudOperation;
  /** Standard interface method name (create, update, delete, etc.) */
  interfaceMethod: string;
  /** Original Management method name (e.g., "addBookmark") */
  implementationMethod: string;
  /** Parameter mappings from interface to implementation */
  paramMapping: ParamMapping[];
  /** Return type of the interface method */
  returnType: string;
  /** Whether this is a collection return */
  isCollection: boolean;
}

/**
 * Maps a standard interface parameter to an implementation parameter.
 */
export interface ParamMapping {
  /** Name in the interface method signature */
  interfaceName: string;
  /** Name in the implementation method call */
  implementationName: string;
  /** TypeScript type */
  tsType: string;
  /** Whether parameter is optional */
  optional?: boolean;
  /** Expression to transform value (if needed) */
  transform?: string;
}

/**
 * CRUD methods for a single Management.
 */
export interface ManagementCrudMethods {
  /** Management name (e.g., "BookmarkMgmt") */
  managementName: string;
  /** Entity name (e.g., "Bookmark") */
  entityName: string;
  /** Mappings for this management */
  mappings: CrudMapping[];
  /** Non-CRUD methods that pass through */
  passthroughMethods: PassthroughMethod[];
}

/**
 * A non-CRUD method that passes through to its original implementation.
 */
export interface PassthroughMethod {
  /** Method name */
  name: string;
  /** camelCase version for JS */
  jsName: string;
  /** Parameter info */
  params: Array<{ name: string; tsType: string; optional?: boolean }>;
  /** Return type */
  returnType: string;
  isCollection: boolean;
  description?: string;
  /** Tags attached to this method */
  tags?: string[];
}

/**
 * Source method from Management metadata.
 */
export interface SourceMethod {
  name: string;
  jsName?: string;
  returnType: string;
  isCollection: boolean;
  description?: string;
  /** All tags attached to this method (e.g., ['crud:create', 'auth:required']) */
  tags?: string[];
  params: Array<{ name: string; type: string; optional?: boolean }>;
}

/**
 * Extract CRUD operation from tags.
 * Looks for tag in format 'crud:operation'
 */
function getCrudOperationFromTags(tags: string[] | undefined): CrudOperation | undefined {
  if (!tags) return undefined;
  
  const crudTag = tags.find(tag => tag.startsWith('crud:'));
  if (crudTag) {
    return crudTag.replace('crud:', '') as CrudOperation;
  }
  return undefined;
}

/**
 * Map CRUD-tagged Management methods to standard interface methods.
 *
 * This function:
 * 1. Filters out methods matching filterOut tags
 * 2. Maps remaining CRUD-tagged methods to standard interface methods
 * 3. Passes through non-CRUD methods unchanged
 *
 * @param managementName - Name of the management (e.g., "BookmarkMgmt")
 * @param methods - Methods from the management
 * @param config - CRUD adaptor configuration (optional filtering)
 * @returns CRUD mappings and passthrough methods, or null if nothing to generate
 */
export function mapManagementCrud(
  managementName: string,
  methods: SourceMethod[],
  config?: CrudAdaptorConfig
): ManagementCrudMethods | null {
  const filterOut = config?.filterOut ?? [];
  const mappings: CrudMapping[] = [];
  const passthroughMethods: PassthroughMethod[] = [];

  // Extract entity name (remove "Mgmt" suffix)
  const entityName = managementName.replace(/Mgmt$/, '');

  for (const method of methods) {
    // Step 1: Check if method should be filtered out
    if (shouldFilterMethod(method.tags, filterOut)) {
      continue; // Skip this method entirely
    }

    // Step 2: Check if this is a CRUD-tagged method
    const operation = getCrudOperationFromTags(method.tags);
    
    if (operation) {
      // Create CRUD mapping
      const interfaceMethod = operation; // create, update, delete, read, list
      const mapping = createCrudMapping(
        operation,
        interfaceMethod,
        method,
        entityName
      );
      mappings.push(mapping);
    } else {
      // Non-CRUD method - pass through
      passthroughMethods.push({
        name: method.name,
        jsName: method.jsName || method.name,
        params: method.params.map(p => ({
          name: p.name,
          tsType: mapToTypeScriptType(p.type),
          optional: p.optional,
        })),
        returnType: mapToTypeScriptType(method.returnType),
        isCollection: method.isCollection,
        description: method.description,
        tags: method.tags,
      });
    }
  }

  // Return null if no mappings and no passthrough methods
  if (mappings.length === 0 && passthroughMethods.length === 0) {
    return null;
  }

  return {
    managementName,
    entityName,
    mappings,
    passthroughMethods,
  };
}

/**
 * Create a CRUD mapping from a source method.
 */
function createCrudMapping(
  operation: CrudOperation,
  interfaceMethod: string,
  source: SourceMethod,
  entityName: string
): CrudMapping {
  // Build param mapping based on operation type
  const paramMapping: ParamMapping[] = [];

  switch (operation) {
    case 'create':
      // create(data: CreateX) -> implementation(field1, field2, ...)
      paramMapping.push({
        interfaceName: 'data',
        implementationName: '', // Will be destructured
        tsType: `Create${entityName}`,
        transform: buildDestructuringTransform(source.params),
      });
      break;

    case 'update':
      // update(id, data) -> implementation(id, field1, field2, ...)
      paramMapping.push({
        interfaceName: 'id',
        implementationName: source.params[0]?.name ?? 'id',
        tsType: 'number',
      });
      if (source.params.length > 1) {
        paramMapping.push({
          interfaceName: 'data',
          implementationName: '',
          tsType: `Update${entityName}`,
          transform: buildDestructuringTransform(source.params.slice(1)),
        });
      }
      break;

    case 'delete':
      // delete(id) -> implementation(id)
      paramMapping.push({
        interfaceName: 'id',
        implementationName: source.params[0]?.name ?? 'id',
        tsType: 'number',
      });
      break;

    case 'read':
    case 'list':
    default:
      // Direct mapping for other operations
      for (const param of source.params) {
        paramMapping.push({
          interfaceName: param.name,
          implementationName: param.name,
          tsType: mapToTypeScriptType(param.type),
          optional: param.optional,
        });
      }
  }

  return {
    operation,
    interfaceMethod,
    implementationMethod: source.name,
    paramMapping,
    returnType: mapToTypeScriptType(source.returnType),
    isCollection: source.isCollection,
  };
}

/**
 * Build a destructuring transform for Create/Update data objects.
 */
function buildDestructuringTransform(
  params: Array<{ name: string; type: string; optional?: boolean }>
): string {
  const destructured = params
    .map(p => `${p.name}: data.${p.name}`)
    .join(', ');
  return `{ ${destructured} }`;
}

/**
 * Map a type string to TypeScript type.
 */
function mapToTypeScriptType(type: string): string {
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
      // Keep complex types as-is
      return type;
  }
}
