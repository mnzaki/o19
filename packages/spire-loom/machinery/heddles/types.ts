/**
 * Heddles Types
 *
 * Core type definitions for the pattern matching and weaving plan.
 */

import type { EntityMetadata, SpiralRing } from '../../warp/index.js';
import type { GeneratedFile, RawMethod } from '../bobbin/index.js';
import type { ComputedEntityHelpers } from '../treadle-kit/computed-entity-helpers.js';
import type { ManagementMetadata, MethodMetadata } from './management-collector.js';

/**
 * Enriched method metadata with computed values from heddles.
 * This extends the base MethodMetadata with values computed from ownership chain.
 */
export interface EnrichedMethodMetadata extends MethodMetadata {
  /**
   * Whether methods return Result<T, E> for error handling.
   * Computed from the linked struct's @rust.Struct({ useResult: true }) config.
   */
  useResult?: boolean;
  /**
   * Wrapper types for the linked field (e.g., ['Mutex', 'Option']).
   * Computed from the linked struct field's decorators.
   */
  wrappers?: string[];
  /**
   * The field name in the linked struct (e.g., 'thestream', 'device_manager').
   * Computed from the link target.
   */
  fieldName?: string;
}

/**
 * An edge in the spiral graph.
 */
export interface SpiralEdge {
  /** The parent/inner ring */
  from: SpiralRing;
  /** The child/outer ring */
  to: SpiralRing;
  /** Relationship type */
  relationship: 'wraps' | 'aggregates' | 'adapts' | 'binds';
  /** Export name from WARP.ts (if applicable) */
  exportName?: string;
}

/**
 * A node in the traversal, with path information.
 */
export interface SpiralNode {
  /** The ring instance */
  ring: SpiralRing;
  /** Type name (constructor.name) */
  typeName: string;
  /** Parent node (null for roots) */
  parent: SpiralNode | null;
  /** Depth in the tree */
  depth: number;
  /** Export name from WARP.ts */
  exportName?: string;
}

/**
 * Method helpers available in generator context.
 * Provides convenient access to filtered and grouped management methods.
 */
//export interface MethodHelpers {
//  /** All collected methods (after pipeline transformation) */
//  all: RawMethod[];
//
//  /** Group methods by management name with service metadata */
//  byManagement(): Map<string, ManagementMethods>;
//  /** Group methods by CRUD operation */
//  byCrud(): Map<string, RawMethod[]>;
//  /** Get methods with specific tag */
//  withTag(tag: string): RawMethod[];
//  /** Get methods with specific CRUD operation */
//  withCrud(op: string): RawMethod[];
//
//  /** Iterate all methods */
//  forEach(cb: (method: RawMethod) => void): void;
//  /** Iterate filtered methods */
//  filteredForEach(filter: (method: RawMethod) => boolean, cb: (method: RawMethod) => void): void;
//
//  /** All create methods */
//  get creates(): RawMethod[];
//  /** All read methods */
//  get reads(): RawMethod[];
//  /** All update methods */
//  get updates(): RawMethod[];
//  /** All delete methods */
//  get deletes(): RawMethod[];
//  /** All list methods */
//  get lists(): RawMethod[];
//}

/**
 * Entity with computed field helpers for template usage.
 */
export interface EntityWithFields extends EntityMetadata, ComputedEntityHelpers {}

/**
 * Entity helpers available in generator context.
 * Provides convenient access to filtered and grouped entities.
 */
//export interface EntityHelpers {
//  /** All collected entities */
//  all: EntityMetadata[];
//
//  /** Group entities by management name */
//  byManagement(): Map<string, EntityMetadata[]>;
//  /** Get entities with specific tag */
//  withTag(tag: string): EntityMetadata[];
//  /** Get read-only entities */
//  get readOnly(): EntityMetadata[];
//  /** Get read-write entities */
//  get readWrite(): EntityMetadata[];
//
//  /** Get entities with field metadata and computed helpers */
//  withFields(): EntityWithFields[];
//
//  /** Iterate all entities */
//  forEach(cb: (entity: EntityMetadata) => void): void;
//  /** Iterate filtered entities */
//  filteredForEach(
//    filter: (entity: EntityMetadata) => boolean,
//    cb: (entity: EntityMetadata) => void
//  ): void;
//}
