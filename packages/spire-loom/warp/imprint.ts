// ============================================================================
// Management Imprint Types - Stage 3 Decorators
// ============================================================================

/**
 * CRUD operation type.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * Metadata for CRUD operations.
 */
export interface CrudMetadata {
  operation: CrudOperation;
  entity?: string;
  soft?: boolean;
  collection?: boolean;
}

/**
 * Storage for decorator metadata using WeakMaps.
 * This works with Stage 3 decorators.
 */
const reachMetadata = new WeakMap<Function, 'Private' | 'Local' | 'Global'>();
const crudMetadata = new WeakMap<Function, Map<string, CrudMetadata>>();

/**
 * Temporary storage for method metadata before class is known.
 * Method decorators run before class decorators in Stage 3.
 */
let pendingCrudMethods: Array<{ methodName: string; metadata: CrudMetadata }> = [];

/**
 * Decorator for Management reach (Stage 3 format).
 * @param level - 'Private' | 'Local' | 'Global'
 * 
 * Usage:
 *   @reach('Global')
 *   class MyMgmt extends Management { ... }
 */
export function reach(level: 'Private' | 'Local' | 'Global') {
  return function<T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ): T {
    // Collect pending method metadata
    const methods = new Map<string, CrudMetadata>();
    for (const pending of pendingCrudMethods) {
      methods.set(pending.methodName, pending.metadata);
    }
    pendingCrudMethods = []; // Clear
    
    // Store metadata
    crudMetadata.set(target, methods);
    reachMetadata.set(target, level);
    
    return target;
  };
}

/**
 * Decorator for CRUD operations (Stage 3 format).
 * 
 * Usage:
 *   @crud('create')
 *   addBookmark() { ... }
 */
export function crud(
  operation: CrudOperation,
  options?: Omit<CrudMetadata, 'operation'>
): (_target: any, context: ClassMethodDecoratorContext) => any {
  return function(_target: any, context: ClassMethodDecoratorContext) {
    // Can't access class here (context.class is undefined in tsx)
    // Store temporarily - @reach decorator will collect
    pendingCrudMethods.push({
      methodName: String(context.name),
      metadata: { operation, ...options }
    });
    
    // Return original method unchanged
    return _target;
  };
}

/**
 * Get reach level for a Management class.
 */
export function getReach(target: Function): 'Private' | 'Local' | 'Global' | undefined {
  return reachMetadata.get(target);
}

/**
 * Get CRUD metadata for a Management class.
 */
export function getCrudMethods(target: Function): Map<string, CrudMetadata> | undefined {
  return crudMetadata.get(target);
}

/**
 * Base class for Management Imprints.
 * Not meant to be instantiated - purely for generation metadata.
 */
export abstract class Management {
  // Marker class - used for typechecking only
}
