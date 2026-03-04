/**
 * Management Imprint Types - Stage 3 Decorators
 */

import type { CrudMetadata } from './crud.js';
import { flushPendingCrudMethods } from './crud.js';

/** Stage 3 class decorator type */
type ClassDecorator = <T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
) => T;

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
    /** Maps Management classes to their Entity classes */
    entities: WeakMap<Function, EntityMetadata[]>;
  };
}

// Initialize global registry if this is the first module instance
if (!globalThis[GLOBAL_KEY]) {
  globalThis[GLOBAL_KEY] = {
    reach: new WeakMap<Function, 'Private' | 'Local' | 'Global'>(),
    crud: new WeakMap<Function, Map<string, CrudMetadata>>(),
    tags: new WeakMap<Function, Map<string, string[]>>(),
    entities: new WeakMap<Function, EntityMetadata[]>()
  };
}

// Export the shared WeakMaps - all module instances use these
const reachMetadata = globalThis[GLOBAL_KEY].reach;
const crudMetadata = globalThis[GLOBAL_KEY].crud;
const methodTags = globalThis[GLOBAL_KEY].tags;
const entityMetadata = globalThis[GLOBAL_KEY].entities;

// ============================================================================
// Entity Management System
// ============================================================================

/**
 * Options for the @Management.Entity decorator.
 */
export interface EntityOptions {
  /** Custom table/collection name (defaults to entity class name) */
  tableName?: string;
  /** Whether this entity is read-only (no create/update/delete) */
  readOnly?: boolean;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Field metadata for entity code generation.
 */
export interface EntityFieldMetadata {
  /** Property name (camelCase) */
  name: string;
  /** TypeScript type (source of truth) */
  tsType: string;
  /** SQL column name (snake_case) */
  columnName: string;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether this is the primary key */
  isPrimary: boolean;
  /** Whether this is an auto-managed created timestamp */
  isCreatedAt: boolean;
  /** Whether this is an auto-managed updated timestamp */
  isUpdatedAt: boolean;
  /** Whether to include in INSERT statements */
  forInsert: boolean;
  /** Whether to include in UPDATE statements */
  forUpdate: boolean;
}

/**
 * Metadata for an Entity associated with a Management.
 */
export interface EntityMetadata {
  /** The entity class constructor */
  entityClass: new (...args: any[]) => any;
  /** The entity class name */
  name: string;
  /** Management class this entity belongs to */
  managementName: string;
  /** Management class name without 'Mgmt' */
  serviceName: string;
  /** Entity name all lower case */
  lower: string;
  /** Optional metadata attached by decorator */
  options?: EntityOptions;
  /** Field metadata for code generation */
  fields?: EntityFieldMetadata[];
}

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
 * Get all Entity classes associated with a Management class.
 */
export function getEntities(target: typeof Management): EntityMetadata[] | undefined {
  return entityMetadata.get(target);
}

// ============================================================================
// Entity Registration Helper
// ============================================================================

// Symbol for storing pending entity registrations
const PENDING_ENTITIES = Symbol('loom:pendingEntities');

/**
 * Register an entity class with a Management class.
 * This is called by the Management.Entity decorator.
 *
 * Uses delayed binding: stores on a global list and resolves when getEntities is called.
 */
function registerEntity<T extends new (...args: any[]) => T>(
  mgmtClass: typeof Management | undefined,
  entityClass: T,
  context: ClassDecoratorContext,
  options: EntityOptions
): T {
  const entityName = entityClass.name;

  if (!mgmtClass) {
    throw new Error(
      `@Entity decorator called without Management context. ` +
        `Make sure the Management class is imported before the Entity. ` +
        `Entity: ${entityName}`
    );
  }

  const metadata: EntityMetadata = {
    entityClass,
    name: entityName,
    managementName: mgmtClass.name,
    serviceName: mgmtClass.name.slice(0, -'Mgmt'.length),
    lower: entityName.toLowerCase(),
    options
  };

  // Associate with this Management class
  const existing = entityMetadata.get(mgmtClass) ?? [];
  existing.push(metadata);
  entityMetadata.set(mgmtClass, existing);

  return entityClass;
}

/**
 * Base class for Management Imprints.
 * Not meant to be instantiated - purely for generation metadata.
 *
 * Provides static Entity decorator for associating entity classes.
 *
 * Usage:
 *   @BookmarkMgmt.Entity
 *   export class Bookmark { ... }
 *
 *   @BookmarkMgmt.Entity({ tableName: 'bookmarks', readOnly: false })
 *   export class Bookmark { ... }
 */
export abstract class Management {
  /**
   * Entity decorator - associates an entity class with this Management.
   *
   * Bare usage:
   *   @BookmarkMgmt.Entity
   *   export class Bookmark { ... }
   *
   * With options (use the options method):
   *   @BookmarkMgmt.Entity.options({ tableName: 'custom_bookmarks' })
   *   export class Bookmark { ... }
   */
  static Entity(this: typeof Management): ClassDecorator {
    const mgmtClass = this;
    if (!mgmtClass) {
      throw new Error(
        `@Entity decorator 'this' is undefined. ` +
          `Make sure to call as @MgmtClass.Entity() not @Entity. `
      );
    }
    return function <T extends new (...args: any[]) => any>(
      target: T,
      context: ClassDecoratorContext<T>
    ): T {
      return registerEntity(mgmtClass, target, context, {});
    };
  }

  /**
   * Create an Entity decorator with options.
   * Usage:
   *   @BookmarkMgmt.Entity.options({ tableName: 'bookmarks', readOnly: true })
   *   export class Bookmark { ... }
   */
  static EntityOptions(this: typeof Management, options: EntityOptions): ClassDecorator {
    const mgmtClass = this;
    if (!mgmtClass) {
      throw new Error(
        `@EntityOptions decorator 'this' is undefined. ` +
          `Make sure to call as @MgmtClass.EntityOptions({...}) not @EntityOptions. `
      );
    }
    return function <T extends new (...args: any[]) => any>(
      target: T,
      context: ClassDecoratorContext<T>
    ): T {
      return registerEntity(mgmtClass, target, context, options);
    };
  }
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
export function getLinkTarget<T extends typeof Management>(mgmtClass: T): LinkMetadata | undefined {
  return (mgmtClass as any)[LINK_TARGET];
}
