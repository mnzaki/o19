// ============================================================================
// Management Imprint Types
// ============================================================================

/**
 * Decorator for Management reach.
 * @param level - 'Private' | 'Local' | 'Global'
 */
export function reach(level: 'Private' | 'Local' | 'Global'): ClassDecorator {
  return (target: any) => {
    // Metadata for generator
    target.prototype._reach = level;
    return target;
  };
}

/**
 * Base class for Management Imprints.
 * Not meant to be instantiated - purely for generation metadata.
 */
export abstract class Management {
  // Marker class - used for typechecking only
}

// Re-export CRUD decorator for convenience
export { crud } from './crud.js';
export type { CrudOperation, CrudFilter, CrudMetadata } from './crud.js';
