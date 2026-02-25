/**
 * Heddles Types
 *
 * Core type definitions for the pattern matching and weaving plan.
 */

import type { SpiralRing } from '../../warp/index.js';
import type { ManagementMetadata, MethodMetadata } from '../reed/index.js';
import type { RawMethod } from '../bobbin/index.js';
import type { MethodQueryAPI } from '../sley/query.js';

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
 * A task to generate code.
 */
export interface GenerationTask {
  /** Matrix match: [CurrentType, PreviousType] */
  match: [string, string];
  /** The current (outer) node */
  current: SpiralNode;
  /** The previous (inner) node */
  previous: SpiralNode;
  /** Export name from WARP.ts (the spiraler's export) */
  exportName: string;
  /** 
   * Optional generator function.
   * If provided, bypasses matrix lookup (used for tieup tasks).
   */
  generator?: GeneratorFunction;
  /**
   * Optional config data from tieup (warpData).
   * Passed to generator context.config when executing.
   */
  config?: Record<string, unknown>;
}

/**
 * The weaving plan - intermediate representation.
 *
 * ⚠️ IMPORTANT: Do not traverse nodesByType during the heddles phase!
 * The plan is only fully populated after buildPlan() completes.
 * Accessing nodesByType during traversal (e.g., from within a visitor)
 * will result in incomplete data. Generators should access the plan
 * during the weaving phase when it is complete.
 */
export interface WeavingPlan {
  /** All edges in the spiral graph */
  edges: SpiralEdge[];
  /**
   * All nodes grouped by type.
   * ⚠️ Only valid after buildPlan() completes. Do not access during heddles traversal!
   */
  nodesByType: Map<string, SpiralNode[]>;
  /** Management Imprints collected from loom/ */
  managements: ManagementMetadata[];
  /** Generation tasks derived from matrix matching */
  tasks: GenerationTask[];
  /**
   * Set to true when the plan is fully built and safe to traverse.
   * Used internally to guard against premature access.
   */
  _isComplete: boolean;
}

/**
 * Guard function to ensure the weaving plan is complete before traversal.
 * Throws if the plan is accessed during the heddles phase.
 */
export function ensurePlanComplete(plan: WeavingPlan, operation: string): void {
  if (!plan._isComplete) {
    throw new Error(
      `Cannot ${operation}: WeavingPlan is not complete. ` +
        `Do not traverse plan.nodesByType during the heddles phase. ` +
        `Access the plan only during the weaving/generation phase.`
    );
  }
}

/**
 * Method helpers available in generator context.
 * Provides convenient access to filtered and grouped management methods.
 */
export interface MethodHelpers {
  /** All collected methods (after pipeline transformation) */
  all: RawMethod[];
  
  /** Group methods by management name */
  byManagement(): Map<string, RawMethod[]>;
  /** Group methods by CRUD operation */
  byCrud(): Map<string, RawMethod[]>;
  /** Get methods with specific tag */
  withTag(tag: string): RawMethod[];
  /** Get methods with specific CRUD operation */
  withCrud(op: string): RawMethod[];
  
  /** Iterate all methods */
  forEach(cb: (method: RawMethod) => void): void;
  /** Iterate filtered methods */
  filteredForEach(filter: (method: RawMethod) => boolean, cb: (method: RawMethod) => void): void;
  
  /** All create methods */
  get creates(): RawMethod[];
  /** All read methods */
  get reads(): RawMethod[];
  /** All update methods */
  get updates(): RawMethod[];
  /** All delete methods */
  get deletes(): RawMethod[];
  /** All list methods */
  get lists(): RawMethod[];
}

/**
 * Generator context passed to generators.
 */
export interface GeneratorContext {
  /** The weaving plan with all metadata */
  plan: WeavingPlan;
  /** Workspace root directory */
  workspaceRoot: string;
  /** Output directory for generated code */
  outputDir?: string;
  /** Package path relative to workspace (e.g., 'crates/foundframe-android') */
  packagePath: string;
  /** Full package directory path */
  packageDir: string;
  /** Method collection helpers (populated by treadle-kit) - CLASSIC API */
  methods?: MethodHelpers;
  
  /** 
   * Query builder API (populated by treadle-kit) - NEW API.
   * Chainable queries: context.query?.methods.crud('create').tag('auth').all
   */
  query?: MethodQueryAPI<RawMethod>;
  
  /** 
   * Configuration data from tieup (warpData).
   * Available when treadle is invoked via .tieup()
   */
  config?: Record<string, unknown>;
}

/**
 * Generator function type.
 */
export type GeneratorFunction = (
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
) => Promise<GeneratedFile[]>;

/**
 * A generated file specification.
 */
export interface GeneratedFile {
  /** Output path */
  path: string;
  /** File content */
  content: string;
}
