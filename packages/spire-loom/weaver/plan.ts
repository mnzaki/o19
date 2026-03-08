import type { ManagementMetadata } from '../warp/metadata.js';
import type { GenerationTask, SpiralEdge, SpiralNode } from './plan-builder.js';

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
