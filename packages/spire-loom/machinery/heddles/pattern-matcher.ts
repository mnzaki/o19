/**
 * Pattern Matcher (Heddles)
 *
 * The heddles raise and lower warp threads to create patterns.
 * In our loom, they match spiral patterns against the generator matrix
 * to determine what code to generate.
 */

import { SpiralRing, SpiralOut, SpiralMux } from '../../warp/index.js';
import { CoreRing } from '../../warp/index.js';
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
  /** Export name from WARP.ts */
  exportName: string;
}

/**
 * The weaving plan - intermediate representation.
 */
export interface WeavingPlan {
  /** All edges in the spiral graph */
  edges: SpiralEdge[];
  /** All nodes grouped by type */
  nodesByType: Map<string, SpiralNode[]>;
  /** Management Imprints collected from loom/ */
  managements: ManagementMetadata[];
  /** Generation tasks derived from matrix matching */
  tasks: GenerationTask[];
}

/**
 * Generator function type.
 */
export type GeneratorFunction = (
  current: SpiralNode,
  previous: SpiralNode
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
  setPair(
    currentType: string,
    previousType: string,
    generator: GeneratorFunction
  ): this {
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
  buildPlan(
    warp: Record<string, SpiralRing>,
    managements: ManagementMetadata[] = []
  ): WeavingPlan {
    const edges: SpiralEdge[] = [];
    const nodesByType = new Map<string, SpiralNode[]>();
    const tasks: GenerationTask[] = [];

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
            exportName,
          };
          edges.push(edge);

          // Match against matrix
          const generator = this.matrix.getPair(typeName, node.parent.typeName);
          if (generator) {
            tasks.push({
              match: [typeName, node.parent.typeName],
              current: node,
              previous: node.parent,
              exportName,
            });
          }
        }
      });
    }

    return { edges, nodesByType, managements, tasks };
  }

  /**
   * Traverse the spiral tree, calling the visitor for each node.
   */
  private traverse(
    ring: SpiralRing,
    parent: SpiralNode | null,
    depth: number,
    exportName: string,
    visitor: (node: SpiralNode) => void
  ): void {
    const node: SpiralNode = {
      ring,
      typeName: ring.constructor.name,
      parent,
      depth,
      exportName,
    };

    visitor(node);

    // Recurse into inner ring(s)
    if (ring instanceof SpiralOut) {
      // Single inner ring
      if (ring.inner) {
        this.traverse(ring.inner, node, depth + 1, exportName, visitor);
      }

      // Also traverse any spiraler properties attached to the SpiralOut
      for (const [key, value] of Object.entries(ring)) {
        if (key !== 'inner' && value instanceof SpiralRing) {
          this.traverse(value, node, depth + 1, exportName, visitor);
        }
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
   * Detect the relationship between two rings.
   */
  private detectRelationship(current: SpiralRing, previous: SpiralRing): SpiralEdge['relationship'] {
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
    return allNodes.filter(n => n.parent === null);
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
