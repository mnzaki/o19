/**
 * Pattern Matcher (Heddles)
 *
 * The heddles raise and lower warp threads to create patterns.
 * In our loom, they match spiral patterns against the generator matrix
 * to determine what code to generate.
 */

import { SpiralRing, SpiralOut, SpiralMux, Spiraler, MuxSpiraler } from '../../warp/index.js';
import { CoreRing } from '../../warp/spiral/index.js';
import type { ManagementMetadata } from '../reed/index.js';

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
 * Generator context passed to generators.
 */
export interface GeneratorContext {
  /** The weaving plan with all metadata */
  plan: WeavingPlan;
  /** Workspace root directory */
  workspaceRoot: string;
  /** Output directory for generated code */
  outputDir?: string;
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

/**
 * The Generator Matrix: [CurrentType, PreviousType] → Generator
 *
 * This matrix defines what to generate based on the transition
 * from one ring type to another.
 */
export class GeneratorMatrix extends Map<string, GeneratorFunction> {
  /**
   * Set a generator for a type pair.
   *
   * @param currentType - The outer ring type (e.g., 'AndroidSpiraler')
   * @param previousType - The inner ring type (e.g., 'RustCore')
   * @param generator - The generator function
   */
  setPair(currentType: string, previousType: string, generator: GeneratorFunction): this {
    const key = `${currentType}→${previousType}`;
    return this.set(key, generator);
  }

  /**
   * Get a generator for a type pair.
   */
  getPair(currentType: string, previousType: string): GeneratorFunction | undefined {
    const key = `${currentType}→${previousType}`;
    return this.get(key);
  }
}

/**
 * The default generator matrix.
 *
 * Entries are added as we implement generators.
 */
export const DEFAULT_MATRIX = new GeneratorMatrix();

// Example entries (to be implemented):
// DEFAULT_MATRIX.setPair('AndroidSpiraler', 'RustCore', generateAndroidBridge);
// DEFAULT_MATRIX.setPair('TauriSpiraler', 'AndroidSpiraler', generateTauriAndroid);
// DEFAULT_MATRIX.setPair('TauriSpiraler', 'RustCore', generateTauriDesktop);
// DEFAULT_MATRIX.setPair('DDDTypescriptSpiraler', 'TauriSpiraler', generateDDDLayers);

/**
 * The Heddles - builds the weaving plan from a WARP.ts module.
 */
export class Heddles {
  private matrix: GeneratorMatrix;
  /** Tracks the primary export name for each ring (the first export that defined it) */
  private ringExportNames: WeakMap<SpiralRing, string> = new WeakMap();

  constructor(matrix: GeneratorMatrix = DEFAULT_MATRIX) {
    this.matrix = matrix;
  }

  /**
   * Build a weaving plan from the WARP.ts module.
   *
   * @param warp - The exported rings from WARP.ts
   * @param managements - Management Imprints collected from loom/
   * @returns A plan with edges, nodes, managements, and generation tasks
   */
  buildPlan(warp: Record<string, SpiralRing>, managements: ManagementMetadata[] = []): WeavingPlan {
    const edges: SpiralEdge[] = [];
    const nodesByType = new Map<string, SpiralNode[]>();
    const tasks: GenerationTask[] = [];

    // Track seen ring pairs to deduplicate tasks (using WeakMap for object identity)
    const seenRingPairs = new WeakMap<SpiralRing, Set<SpiralRing>>();

    // Traverse each exported ring
    for (const [exportName, ring] of Object.entries(warp)) {
      this.traverse(ring, null, 0, exportName, (node) => {
        // Record node by type
        const typeName = node.typeName;
        if (!nodesByType.has(typeName)) {
          nodesByType.set(typeName, []);
        }
        nodesByType.get(typeName)!.push(node);

        // If we have a parent, record the edge and check for generation
        if (node.parent) {
          const edge: SpiralEdge = {
            from: node.parent.ring,
            to: node.ring,
            relationship: this.detectRelationship(node.ring, node.parent.ring),
            exportName
          };
          edges.push(edge);

          // Match against matrix
          // The edge direction is parent -> child (outer -> inner)
          // Matrix expects (current, previous) where current wraps previous
          // So current = parent (outer), previous = node (inner)
          const currentType = node.parent.typeName;
          const previousType = typeName;

          // DEBUG
          if (process.env.DEBUG_MATRIX) {
            console.log(`[MATRIX] Trying: ${currentType} -> ${previousType}`);
          }

          // Deduplicate using WeakMap for object identity
          if (!seenRingPairs.has(node.parent.ring)) {
            seenRingPairs.set(node.parent.ring, new Set());
          }
          const innerSet = seenRingPairs.get(node.parent.ring)!;
          if (innerSet.has(node.ring)) {
            return; // Skip duplicate
          }

          const generator = this.matrix.getPair(currentType, previousType);
          if (generator) {
            innerSet.add(node.ring);
            tasks.push({
              match: [currentType, previousType],
              current: node.parent, // outer ring (e.g., AndroidSpiraler)
              previous: node, // inner ring (e.g., RustCore)
              exportName
            });
          }
        }
      });
    }

    // Mark plan as complete - now safe to traverse
    return { edges, nodesByType, managements, tasks, _isComplete: true };
  }

  /**
   * Traverse the spiral tree, calling the visitor for each node.
   *
   * Each ring keeps its PRIMARY export name (the first one assigned).
   * Subsequent traversals use the existing export name.
   */
  private traverse(
    ring: SpiralRing,
    parent: SpiralNode | null,
    depth: number,
    traversalExportName: string,
    visitor: (node: SpiralNode) => void
  ): void {
    // Get the effective type name - for SpiralOut with spiralers, use the spiraler's type
    const typeName = this.getEffectiveTypeName(ring);

    // Use existing export name if ring was already traversed, otherwise assign new one
    const exportName = this.ringExportNames.get(ring) ?? traversalExportName;
    if (!this.ringExportNames.has(ring)) {
      this.ringExportNames.set(ring, exportName);
    }

    const node: SpiralNode = {
      ring,
      typeName,
      parent,
      depth,
      exportName
    };

    visitor(node);

    // Recurse into inner ring(s)
    if (ring instanceof SpiralOut) {
      // Single inner ring - this is the "true" inner ring (typically a CoreRing)
      // This is a Core export (the root of the spiral), so use its export name
      // UNLESS the inner ring was already marked by a Core export (not a Spiraler)
      if (ring.inner) {
        const existingExport = this.ringExportNames.get(ring.inner);
        // If already marked and it's a CoreRing, the existing is from a previous Core export
        // In that case, keep the existing. Otherwise use the current export name.
        const innerExportName =
          existingExport && ring.inner instanceof CoreRing ? existingExport : exportName;
        this.traverse(ring.inner, node, depth + 1, innerExportName, visitor);
      }

      // Also traverse any spiraler properties attached to the SpiralOut
      // These are platform-specific wrappers (Android, Desktop, etc.)
      // They get their own export context (the current one)
      for (const [key, value] of Object.entries(ring)) {
        if (key !== 'inner' && value instanceof SpiralRing) {
          // Skip if this spiraler's innerRing points back to us (would create cycle)
          if (value instanceof Spiraler && value.innerRing === ring) {
            continue;
          }
          this.traverse(value, node, depth + 1, exportName, visitor);
        }
      }
    } else if (ring instanceof Spiraler) {
      // Spiraler wraps an inner ring (typically a CoreRing)
      // The inner ring's identity comes from its ORIGINAL Core export,
      // not from this platform Spiraler. Don't overwrite the exportName.
      if (ring.innerRing) {
        // Use existing export name if available, otherwise fall back to current
        const innerExportName = this.ringExportNames.get(ring.innerRing) ?? exportName;
        this.traverse(ring.innerRing, node, depth + 1, innerExportName, visitor);
      }
    } else if (ring instanceof MuxSpiraler) {
      // MuxSpiraler (like TauriSpiraler) aggregates multiple platform rings
      // Create edges from the mux spiraler to each inner ring for platform-specific generation
      for (const inner of ring.innerRings) {
        this.traverse(inner, node, depth + 1, exportName, visitor);
      }
    } else if (ring instanceof SpiralMux) {
      // Multiple inner rings
      for (const inner of ring.innerRings) {
        this.traverse(inner, node, depth + 1, exportName, visitor);
      }

      // Also traverse spiraler properties
      for (const [key, value] of Object.entries(ring)) {
        if (key !== 'innerRings' && value instanceof SpiralRing) {
          this.traverse(value, node, depth + 1, exportName, visitor);
        }
      }
    }
  }

  /**
   * Get the effective type name for a ring.
   * For SpiralOut that wraps a Spiraler directly (inner is Spiraler),
   * returns the spiraler's type name.
   * This allows matrix matching against 'AndroidSpiraler' instead of 'SpiralOut'.
   *
   * NOTE: We only check ring.inner, not properties. SpiralOuts that have
   * spiraler properties but don't wrap them directly (like foundframe which
   * has .android but wraps RustCore) should return 'SpiralOut'.
   */
  private getEffectiveTypeName(ring: SpiralRing): string {
    // If it's a SpiralOut, check if it wraps a Spiraler directly
    if (ring instanceof SpiralOut) {
      // Only if inner IS a Spiraler - not if it just HAS a spiraler property
      if (ring.inner instanceof Spiraler) {
        return ring.inner.constructor.name;
      }
    }

    // If it's a SpiralMux, use the mux's type or check for spiralers
    if (ring instanceof SpiralMux) {
      for (const [key, value] of Object.entries(ring)) {
        if (key !== 'innerRings' && value instanceof Spiraler) {
          return value.constructor.name;
        }
      }
    }

    // Default to the constructor name
    return ring.constructor.name;
  }

  /**
   * Detect the relationship between two rings.
   */
  private detectRelationship(
    current: SpiralRing,
    previous: SpiralRing
  ): SpiralEdge['relationship'] {
    if (current instanceof SpiralMux) {
      return 'aggregates';
    }
    if (previous instanceof CoreRing) {
      return 'wraps';
    }
    if (current.constructor.name.includes('Adaptor')) {
      return 'adapts';
    }
    return 'binds';
  }

  /**
   * Find all roots in the spiral graph.
   * Roots are nodes with no parent (exported directly from WARP.ts).
   */
  findRoots(plan: WeavingPlan): SpiralNode[] {
    const allNodes = Array.from(plan.nodesByType.values()).flat();
    return allNodes.filter((n) => n.parent === null);
  }

  /**
   * Find the path from a node to its root.
   */
  getPathToRoot(node: SpiralNode): SpiralNode[] {
    const path: SpiralNode[] = [node];
    let current = node;
    while (current.parent) {
      path.unshift(current.parent);
      current = current.parent;
    }
    return path;
  }
}

/**
 * Create a new Heddles instance with the default matrix.
 */
export function createHeddles(matrix?: GeneratorMatrix): Heddles {
  return new Heddles(matrix);
}
