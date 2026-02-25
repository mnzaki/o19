/**
 * Management Imprint Types - Stage 3 Decorators
 */

import type { CrudMetadata } from './crud.js';
import { flushPendingCrudMethods } from './crud.js';

export type { CrudMetadata } from './crud.js';
export type { CrudOperation } from './crud.js';

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * GLOBAL METADATA REGISTRY
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * PROBLEM:
 *   When spire-loom is symlinked (e.g., in monorepos with workspace:* deps),
 *   Node.js may load the package through multiple paths:
 *   - /project/node_modules/@o19/spire-loom  (symlink)
 *   - /project/o19/packages/spire-loom       (real path)
 *   
 *   This causes MODULE DUPLICATION: the same module is loaded twice, creating
 *   separate WeakMap instances. Metadata stored by @loom.reach() in one instance
 *   is invisible to getReach() in the other.
 * 
 * SOLUTION:
 *   Use a global registry on globalThis. All module instances share the same
 *   WeakMaps, ensuring metadata is accessible regardless of import path.
 * 
 * ALTERNATIVES CONSIDERED:
 *   - Symbol.for(): Works for primitives, not WeakMaps
 *   - Proper module resolution: Difficult with tsx + symlinks
 *   - Build step: Would lose TypeScript source benefits
 * 
 * This pattern is safe because:
 *   - WeakMaps don't leak memory (keys are garbage collected)
 *   - globalThis is per-process, isolated between projects
 *   - The registry is lazily initialized
 */
const GLOBAL_KEY = '__SPIRE_LOOM_IMPRINT_METADATA__';

declare global {
  // eslint-disable-next-line no-var
  var __SPIRE_LOOM_IMPRINT_METADATA__: {
    /** Maps Management classes to their @reach level */
    reach: WeakMap<Function, 'Private' | 'Local' | 'Global'>;
    /** Maps Management classes to their @crud method metadata */
    crud: WeakMap<Function, Map<string, CrudMetadata>>;
    /** Maps Management classes to their method tags */
    tags: WeakMap<Function, Map<string, string[]>>;
  };
}

// Initialize global registry if this is the first module instance
if (!globalThis[GLOBAL_KEY]) {
  globalThis[GLOBAL_KEY] = {
    reach: new WeakMap<Function, 'Private' | 'Local' | 'Global'>(),
    crud: new WeakMap<Function, Map<string, CrudMetadata>>(),
    tags: new WeakMap<Function, Map<string, string[]>>(),
  };
}

// Export the shared WeakMaps - all module instances use these
const reachMetadata = globalThis[GLOBAL_KEY].reach;
const crudMetadata = globalThis[GLOBAL_KEY].crud;
const methodTags = globalThis[GLOBAL_KEY].tags;

/**
 * Decorator for Management reach (Stage 3 format).
 * @param level - 'Private' | 'Local' | 'Global'
 *
 * Usage:
 *   @reach('Global')
 *   class MyMgmt extends Management { ... }
 */
export function reach(level: 'Private' | 'Local' | 'Global') {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ): T {
    // Collect pending method metadata from crud decorators
    const methods = new Map<string, CrudMetadata>();
    const tags = new Map<string, string[]>(); // methodName -> tags

    for (const pending of flushPendingCrudMethods()) {
      methods.set(pending.methodName, pending.metadata);

      // Collect tags per method
      const methodTags = tags.get(pending.methodName) ?? [];
      methodTags.push(pending.tag);
      tags.set(pending.methodName, methodTags);
    }

    // Store metadata
    crudMetadata.set(target, methods);
    methodTags.set(target, tags);
    reachMetadata.set(target, level);

    return target;
  };
}

/**
 * Tag metadata for method classification.
 */
export interface TagMetadata {
  /** Tag name in namespace:format (e.g., 'crud:create', 'auth:required') */
  tag: string;
  /** Additional options for the tag */
  options?: Record<string, unknown>;
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
 * Get all tags for methods in a Management class.
 * Returns a map of methodName -> tags[]
 */
export function getMethodTags(target: Function): Map<string, string[]> | undefined {
  return methodTags.get(target);
}

/**
 * Base class for Management Imprints.
 * Not meant to be instantiated - purely for generation metadata.
 */
export abstract class Management {
  // Marker class - used for typechecking only
}

// Import and re-export Layer/Layering from layers.ts for backward compatibility
import { Layer, Layering, ExternalLayer } from './layers.js';
export { Layer, Layering, ExternalLayer };

// Symbol for link metadata (to avoid property collision)
export const LINK_TARGET = Symbol('loom:linkTarget');

/**
 * Minimal metadata stored by @loom.link decorator.
 * Heavy processing (resolving methods, mapping types) happens in heddles.
 */
export interface LinkMetadata {
  /** The target struct class (e.g., Foundframe) */
  structClass: typeof ExternalLayer;
  /** The field name within the struct (e.g., 'device_manager') */
  fieldName: string;
  /**
   * Whether methods return Result<T, E> for error handling.
   * Inherited from @rust.Struct({ useResult: true }) on the linked struct.
   */
  useResult?: boolean;
  /**
   * Wrapper types for the linked field (e.g., ['Mutex', 'Option']).
   * Used to generate proper field access code.
   */
  wrappers?: string[];
}

/**
 * Link a Management to an ExternalLayer field.
 * Attaches minimal metadata; processing happens in heddles.
 *
 * Usage:
 *   @loom.link(foundframe.inner.core.thestream)
 */
export function link<L extends ExternalLayer>(linkTarget: L | (() => L)) {
  return <T extends typeof Management>(target: T, context: ClassDecoratorContext<T>): T => {
    // Store the link target (function or value) for resolution at weave time
    (target as any)[LINK_TARGET] = linkTarget;
    return target;
  };
}

/**
 * Get link metadata from a Management class.
 * Returns undefined if not linked.
 */
export function getLinkTarget(mgmtClass: typeof Management): LinkMetadata | undefined {
  return (mgmtClass as any)[LINK_TARGET];
}
