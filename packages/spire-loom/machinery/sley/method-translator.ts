/**
 * Method Translator (The Sley - Threading)
 *
 * Translates Management methods into a unified format ready for template rendering.
 *
 * Translation rules based on tags:
 * - No tags → Pass through as-is
 * - Tags matching filterOut → Excluded
 * - crud:* tag → Transform to standard CRUD interface method
 * - Other tags → Pass through with metadata
 */

import type { CrudOperation } from '../../warp/imprint.js';

/**
 * A method fully translated and ready for template rendering.
 */
export interface TranslatedMethod {
  /** Method name for Tauri invoke (snake_case command name) */
  name: string;
  /** JavaScript/adaptor method name (camelCase) */
  jsName: string;
  /** Description for JSDoc */
  description?: string;
  /** Parameters for the method signature */
  params: TranslatedParam[];
  /** Return type */
  returnType: string;
  /** Whether return is an array */
  isCollection: boolean;
  /** Original tags */
  tags?: string[];
  
  // CRUD-specific fields (only set if isCrud is true)
  /** Whether this is a CRUD-mapped method */
  isCrud?: boolean;
  /** CRUD operation type */
  crudOperation?: CrudOperation;
  /**
   * For CRUD create: the read command info to call after create.
   * This enables the pattern: const id = await create(...); return await get(id);
   */
  readAfterCreate?: {
    commandName: string;
    idParamName: string;
  };
  /**
   * For CRUD update: whether to spread data directly.
   * If true, params are "...data", otherwise destructured.
   */
  spreadData?: boolean;
  /**
   * For CRUD methods: the data transformation expression for invoke.
   * e.g., "id, ...data" or "{ url: data.url, ... }"
   */
  dataTransform?: string;
  /**
   * For CRUD create: the actual return type of the invoke call (the ID type),
   * which differs from returnType (the entity type).
   * e.g., invokeReturnType = "number", returnType = "Bookmark"
   */
  invokeReturnType?: string;
}

/**
 * A parameter in the translated method.
 */
export interface TranslatedParam {
  /** Parameter name in the method signature */
  name: string;
  /** TypeScript type */
  tsType: string;
  /** Whether optional */
  optional?: boolean;
  /**
   * For data object params: the destructuring mapping.
   * e.g., for "data: CreateBookmark", this would be "{ url: data.url, ... }"
   */
  transform?: string;
  /**
   * The source expression to use when calling invoke.
   * Usually just the param name, but for destructured data it's the transform.
   */
  invokeExpr?: string;
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
  tags?: string[];
  params: Array<{ name: string; type: string; optional?: boolean }>;
}

/**
 * Translation configuration.
 */
export interface TranslationConfig {
  /** Tags to filter out (e.g., ['crud:read']) */
  filterOut?: string[];
  /** Entity name for CRUD type generation (e.g., 'Bookmark') */
  entityName?: string;
  /** All methods in the Management (for looking up related CRUD methods) */
  allMethods?: SourceMethod[];
}

/**
 * Translate methods into a unified format for template rendering.
 *
 * This is the main entry point for method translation.
 * It handles:
 * 1. Filtering out methods by tags
 * 2. Transforming CRUD-tagged methods
 * 3. Passing through non-CRUD methods
 *
 * @param methods - Source methods from Management
 * @param config - Translation configuration
 * @returns Translated methods ready for rendering
 */
export function translateMethods(
  methods: SourceMethod[],
  config?: TranslationConfig
): TranslatedMethod[] {
  const filterOut = new Set(config?.filterOut ?? []);
  const entityName = config?.entityName ?? 'Entity';
  const allMethods = config?.allMethods ?? methods;
  const result: TranslatedMethod[] = [];

  // Find the read method for create pattern (create then get)
  const readMethod = findReadMethod(allMethods);

  for (const method of methods) {
    // Step 1: Check if method should be filtered out
    if (method.tags?.some(tag => filterOut.has(tag))) {
      continue;
    }

    // Step 2: Check for CRUD tag and translate accordingly
    const crudOp = extractCrudOperation(method.tags);
    if (crudOp) {
      result.push(translateCrudMethod(method, crudOp, entityName, readMethod));
    } else {
      // Step 3: Pass through as-is
      result.push(translatePassthroughMethod(method));
    }
  }

  return result;
}

/**
 * Find the read method (crud:read tagged) for create-then-get pattern.
 */
function findReadMethod(methods: SourceMethod[]): SourceMethod | undefined {
  return methods.find(m => m.tags?.includes('crud:read'));
}

/**
 * Extract CRUD operation from tags.
 * Returns undefined if no crud:* tag found.
 */
function extractCrudOperation(tags: string[] | undefined): CrudOperation | undefined {
  if (!tags) return undefined;
  const crudTag = tags.find(tag => tag.startsWith('crud:'));
  if (crudTag) {
    return crudTag.replace('crud:', '') as CrudOperation;
  }
  return undefined;
}

/**
 * Translate a CRUD-tagged method to standard interface format.
 */
function translateCrudMethod(
  method: SourceMethod,
  operation: CrudOperation,
  entityName: string,
  readMethod?: SourceMethod
): TranslatedMethod {
  const base = translatePassthroughMethod(method);
  
  base.isCrud = true;
  base.crudOperation = operation;

  switch (operation) {
    case 'create': {
      // create(data: CreateX) -> 
      //   const id = await invoke('add_x', { ...data });
      //   return await this.getById(id);
      base.jsName = 'create';
      
      // The final return type is the entity type (from getById)
      // base.returnType (set by translatePassthroughMethod) is what the command returns (the ID)
      // We need to save it as invokeReturnType and override returnType to the entity
      base.invokeReturnType = base.returnType;  // e.g., "number" or "i64" from source
      base.returnType = entityName;             // Entity type for the interface
      
      // Check if we have a matching read method for create-then-get pattern
      if (readMethod) {
        base.readAfterCreate = {
          commandName: readMethod.name,
          idParamName: 'id',
        };
      }
      
      base.params = [{
        name: 'data',
        tsType: `Create${entityName}`,
        optional: false,
        transform: buildDataTransform(method.params, 'data'),
        invokeExpr: buildDataTransform(method.params, 'data'),
      }];
      base.dataTransform = buildDataTransform(method.params, 'data');
      break;
    }

    case 'update': {
      // update(id: number, data: UpdateX) -> invoke('update_x', { id, ...data })
      base.jsName = 'update';
      const idParam = method.params[0];
      const dataParams = method.params.slice(1);
      
      base.params = [
        {
          name: 'id',
          tsType: 'number',
          optional: false,
        }
      ];
      
      if (dataParams.length > 0) {
        // Check if we can spread data directly (simple case: single 'data' param)
        const canSpreadDirectly = dataParams.length === 1 && dataParams[0].name === 'data';
        
        base.params.push({
          name: 'data',
          tsType: `Update${entityName}`,
          optional: false,
          transform: canSpreadDirectly 
            ? '...data' 
            : buildDataTransform(dataParams, 'data'),
          invokeExpr: canSpreadDirectly 
            ? '...data' 
            : buildDataTransform(dataParams, 'data'),
        });
        // dataTransform is the object content: "id, ...data" or "id, url: data.url, ..."
        base.dataTransform = canSpreadDirectly 
          ? 'id, ...data' 
          : `id, ${buildDataTransform(dataParams, 'data')}`;
        base.spreadData = canSpreadDirectly;
      } else {
        // No data params, just the id
        base.dataTransform = 'id';
      }
      break;
    }

    case 'delete':
      // delete(id: number) -> invoke('delete_x', { id })
      base.jsName = 'delete';
      base.params = [{
        name: 'id',
        tsType: 'number',
        optional: false,
      }];
      base.dataTransform = 'id';
      break;

    case 'read':
    case 'list':
    default:
      // Keep original params for read/list
      break;
  }

  return base;
}

/**
 * Translate a non-CRUD method (pass through as-is).
 */
function translatePassthroughMethod(method: SourceMethod): TranslatedMethod {
  return {
    name: method.name,
    jsName: method.jsName || method.name,
    description: method.description,
    params: method.params.map(p => ({
      name: p.name,
      tsType: mapToTypeScriptType(p.type),
      optional: p.optional,
      invokeExpr: p.name,
    })),
    returnType: mapToTypeScriptType(method.returnType),
    isCollection: method.isCollection,
    tags: method.tags,
    isCrud: false,
  };
}

/**
 * Build a data destructuring expression (properties only, no braces).
 * e.g., "url: data.url, title: data.title"
 */
function buildDataTransform(
  params: Array<{ name: string; type: string; optional?: boolean }>,
  dataVar: string
): string {
  const mappings = params.map(p => `${p.name}: ${dataVar}.${p.name}`);
  return mappings.join(', ');
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
      return type;
  }
}

/**
 * Group translated methods by type for template convenience.
 */
export interface GroupedMethods {
  /** CRUD methods (create, update, delete, etc.) */
  crud: TranslatedMethod[];
  /** Non-CRUD passthrough methods */
  passthrough: TranslatedMethod[];
  /** All methods combined */
  all: TranslatedMethod[];
}

/**
 * Translate and group methods by type.
 */
export function translateAndGroupMethods(
  methods: SourceMethod[],
  config?: TranslationConfig
): GroupedMethods {
  const translated = translateMethods(methods, config);
  
  return {
    crud: translated.filter(m => m.isCrud),
    passthrough: translated.filter(m => !m.isCrud),
    all: translated,
  };
}
