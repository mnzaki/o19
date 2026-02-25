/**
 * Heddles Plan Builder
 *
 * Builds the weaving plan from a WARP.ts module.
 */

import { SpiralRing, SpiralOut, SpiralMux, Spiraler, MuxSpiraler } from '../../warp/index.js';
import { CoreRing } from '../../warp/spiral/index.js';
import type { ManagementMetadata } from '../reed/index.js';
import { collectAllTieups, type TieupTreadle } from '../../warp/tieups.js';
import { generateFromTreadle, type TreadleDefinition } from '../treadle-kit/declarative.js';
import type {
  SpiralEdge,
  SpiralNode,
  GenerationTask,
  WeavingPlan,
  GeneratorFunction,
} from './types.js';
import { GeneratorMatrix, DEFAULT_MATRIX } from './matrix.js';
import { enrichManagementMethods } from './enrichment.js';
import {
  getEffectiveTypeName,
  detectRelationship,
  collectAllLayers,
  findNodeForRing,
} from './traversal.js';
import { ensureMetadata } from './metadata.js';

/**
 * The Heddles - builds the weaving plan from a WARP.ts module.
 */
export class Heddles {
  private matrix: GeneratorMatrix;
  /** Tracks the primary export name for each ring (the first one assigned) */
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

    // HEDDLES: Enrich managements with computed metadata
    // This is where we compute useResult, wrappers, etc. from ownership chain
    const enrichedManagements = enrichManagementMethods(managements);

    // Track seen ring pairs to deduplicate tasks (using WeakMap for object identity)
    const seenRingPairs = new WeakMap<SpiralRing, Set<SpiralRing>>();

    // Traverse each exported ring
    for (const [exportName, ring] of Object.entries(warp)) {
      if (!(ring instanceof SpiralRing)) {
        continue;
      }

      // Ensure metadata is computed from export name
      ensureMetadata(ring, exportName);

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
            relationship: detectRelationship(node.ring, node.parent.ring),
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
              current: node.parent, // outer ring (e.g., RustAndroidSpiraler)
              previous: node, // inner ring (e.g., RustCore)
              exportName
            });
          }
        }
      });
    }

    // Collect tieup tasks from all layers
    // Tieup treadles are added directly to tasks, bypassing matrix matching
    const allLayers = collectAllLayers(warp);
    const tieups = collectAllTieups(allLayers);

    if (process.env.DEBUG_MATRIX) {
      console.log(`[HEDDLES] Collected ${tieups.length} tieup(s) from ${allLayers.size} layer(s)`);
    }

    for (const tieup of tieups) {
      const targetNode = findNodeForRing(nodesByType, tieup.target);
      const sourceNode = findNodeForRing(nodesByType, tieup.source);

      if (process.env.DEBUG_MATRIX) {
        console.log(`[HEDDLES] Processing tieup: source=${sourceNode?.exportName || 'NOT FOUND'}, target=${targetNode?.exportName || 'NOT FOUND'}`);
      }

      if (!targetNode || !sourceNode) continue;

      for (const entry of tieup.config.treadles) {
        const treadle = entry.treadle;
        const warpData = entry.warpData;

        if (process.env.DEBUG_MATRIX) {
          const isTdef = this.isTreadleDefinition(treadle);
          console.log(`[HEDDLES]   Treadle: isTreadleDefinition=${isTdef}, hasWarpData=${!!warpData}`);
        }

        // Get or create generator
        let generator: GeneratorFunction;
        if (this.isTreadleDefinition(treadle)) {
          generator = generateFromTreadle(treadle);
        } else {
          generator = treadle as GeneratorFunction;
        }

        // Create synthetic task with config (warpData) for tieup treadles
        tasks.push({
          match: [targetNode.typeName, sourceNode.typeName],
          current: targetNode,
          previous: sourceNode,
          exportName: targetNode.exportName ?? 'unknown',
          generator,  // Bypasses matrix lookup
          config: warpData  // Pass warpData to weaver
        });

        if (process.env.DEBUG_MATRIX) {
          console.log(`[HEDDLES]   Added tieup task: ${targetNode.typeName} -> ${sourceNode.typeName}`);
        }
      }
    }

    // Mark plan as complete - now safe to traverse
    // Use enriched managements (with computed useResult, wrappers, etc.)
    return { edges, nodesByType, managements: enrichedManagements, tasks, _isComplete: true };
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
    // Get the effective type name
    const typeName = getEffectiveTypeName(ring);

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
      if (ring.inner) {
        const existingExport = this.ringExportNames.get(ring.inner);
        // If already marked and it's a CoreRing, the existing is from a previous Core export
        // In that case, keep the existing. Otherwise use the current export name.
        const innerExportName =
          existingExport && ring.inner instanceof CoreRing ? existingExport : exportName;
        this.traverse(ring.inner, node, depth + 1, innerExportName, visitor);
      }

      // Also traverse any spiraler properties attached to the SpiralOut
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
   * Check if a value is a TreadleDefinition.
   */
  private isTreadleDefinition(value: unknown): value is TreadleDefinition {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const v = value as Record<string, unknown>;

    // Traditional matrix treadle has matches
    const hasMatches = 'matches' in v && Array.isArray(v.matches);

    // Tieup-style treadle has methods and outputs (no matches needed)
    const hasMethods = 'methods' in v && typeof v.methods === 'object' && v.methods !== null;
    const hasOutputs = 'outputs' in v && Array.isArray(v.outputs);

    return hasMatches || (hasMethods && hasOutputs);
  }
}

/**
 * Create a new Heddles instance with the default matrix.
 */
export function createHeddles(matrix?: GeneratorMatrix): Heddles {
  return new Heddles(matrix);
}
