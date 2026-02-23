/**
 * Management Imprint Types - Stage 3 Decorators
 */

import type { CrudMetadata } from './crud.js';
import { flushPendingCrudMethods } from './crud.js';

export type { CrudMetadata } from './crud.js';
export type { CrudOperation } from './crud.js';

/**
 * Storage for decorator metadata using WeakMaps.
 * This works with Stage 3 decorators.
 */
const reachMetadata = new WeakMap<Function, 'Private' | 'Local' | 'Global'>();
const crudMetadata = new WeakMap<Function, Map<string, CrudMetadata>>();

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
 * Storage for all method tags using WeakMap.
 */
const methodTags = new WeakMap<Function, Map<string, string[]>>();

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

export abstract class Layer {}

export abstract class ExternalLayer extends Layer {}

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
}

/**
 * Link a Management to an ExternalLayer field.
 * Attaches minimal metadata; processing happens in heddles.
 *
 * Usage:
 *   @loom.link(foundframe.inner.core.thestream)
 */
export function link<L extends ExternalLayer>(linkTarget: L | (() => L)) {
  return <T extends typeof Management>(
    target: T,
    context: ClassDecoratorContext<T>
  ): T => {
    // Store the link target (function or value) for resolution at weave time
    (target as any)[LINK_TARGET] = linkTarget;
    return target;
  };
}

/**
 * Get link metadata from a Management class.
 * Returns undefined if not linked.
 */
export function getLinkTarget(
  mgmtClass: typeof Management
): LinkMetadata | undefined {
  return (mgmtClass as any)[LINK_TARGET];
}
