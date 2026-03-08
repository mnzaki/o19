/**
 * Heddles Plan Builder
 *
 * Builds the weaving plan from a WARP.ts module.
 */

import { SpiralRing, SpiralOut, SpiralMux, Spiraler, MuxSpiraler } from '../warp/index.js';
import { CoreRing } from '../warp/spiral/index.js';
import { SurfaceRing } from '../warp/spiral/surface.js';
import {
  collectAllTieups,
  addTieup,
  getLazyTieups,
  clearLazyTieups,
  type LazyTieup
} from '../warp/tieups.js';
import {
  generateFromTreadle,
  type TreadleDefinition
} from '../machinery/treadle-kit/declarative.js';
import { GeneratorMatrix, DEFAULT_MATRIX } from './matrix.js';
import {
  getEffectiveTypeName,
  detectRelationship,
  collectAllLayers,
  findNodeForRing
} from '../machinery/heddles/traversal.js';
import { ensureMetadata } from '../warp/metadata.js';
import { loadWarp } from './workspace-discovery.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { WeavingPlan } from './plan.js';
import type { LanguageMethod } from '../machinery/reed/language/method.js';
import type { BoundQuery } from '../machinery/sley/query.js';
import type { Shed } from '../machinery/loom.js';

export class PatternMatcher {
  private matrix: GeneratorMatrix;
  /** Tracks the primary export name for each ring (the first one assigned) */
  private ringExportNames: WeakMap<SpiralRing, string> = new WeakMap();

  constructor(matrix: GeneratorMatrix = DEFAULT_MATRIX) {
    this.matrix = matrix;
  }

  matchPair(current: string, previous: string) {
    return this.matrix.getPair(current, previous);
  }

  /**
   * Build a weaving plan from the WARP.ts module.
   *
   * @param warp - The exported rings from WARP.ts
   * @param managements - Management Imprints collected from loom/
   * @param workspaceRoot - Optional workspace root for WARP override checking
   * @returns A plan with edges, nodes, managements, and generation tasks
   */
  async buildPlan(
    warp: Record<string, SpiralRing>,
    workspaceRoot?: string
  ): Promise<Omit<WeavingPlan, 'managements'>> {
    const edges: SpiralEdge[] = [];
    const nodesByType = new Map<string, SpiralNode[]>();
    const tasks: GenerationTask[] = [];

    // Track seen ring pairs to deduplicate tasks
    const seenRingPairs = new WeakMap<SpiralRing, Set<SpiralRing>>();

    // Registry for lazy tieups: exportName -> LazyTieup[]
    const lazyTieupRegistry = new Map<string, LazyTieup[]>();

    // Create a mutable copy of warp (ESM modules are read-only)
    const mutableWarp = { ...warp };

    // ==========================================================================
    // Phase 0: Ensure metadata and collect lazy tieups from main WARP
    // ==========================================================================

    for (const [exportName, ring] of Object.entries(mutableWarp)) {
      if (!(ring instanceof SpiralRing)) continue;

      ensureMetadata(ring, exportName);

      // Collect lazy tieups from main WARP
      const lazyTieups = getLazyTieups(ring);
      if (lazyTieups.length > 0) {
        lazyTieupRegistry.set(exportName, [...lazyTieups]);
      }
    }

    // ==========================================================================
    // Phase 1: Auto-load package WARPs and merge lazy tieups
    // ==========================================================================

    if (workspaceRoot) {
      for (const [exportName, ring] of Object.entries(mutableWarp)) {
        if (!(ring instanceof SpiralRing)) continue;

        const packagePath = (ring as any).metadata?.packagePath;
        if (!packagePath) continue;

        const packageWarpPath = path.join(workspaceRoot, packagePath, 'loom', 'WARP.ts');
        if (!fs.existsSync(packageWarpPath)) continue;

        try {
          const packageWarp = await loadWarp(packageWarpPath, workspaceRoot);
          const packageRing = packageWarp[exportName];

          if (packageRing instanceof SpiralRing) {
            // Ensure metadata on package ring
            ensureMetadata(packageRing, exportName);

            // Collect lazy tieups from package WARP
            const packageLazyTieups = getLazyTieups(packageRing);

            // Merge: main tieups first, then package tieups
            const existingTieups = lazyTieupRegistry.get(exportName) || [];
            const mergedTieups = [...existingTieups, ...packageLazyTieups];
            lazyTieupRegistry.set(exportName, mergedTieups);

            // Use package ring as the base
            mutableWarp[exportName] = packageRing;
          }
        } catch (error) {
          // Log error for debugging but continue - package WARP is optional
          if (process.env.DEBUG_PACKAGE_WARP) {
            console.error(`[DEBUG] Failed to load package WARP from ${packageWarpPath}:`, error);
          }
        }
      }
    }

    // ==========================================================================
    // Phase 2: Apply merged lazy tieups to resolved rings
    // ==========================================================================

    for (const [exportName, ring] of Object.entries(mutableWarp)) {
      if (!(ring instanceof SpiralRing)) continue;

      const tieups = lazyTieupRegistry.get(exportName) || [];

      for (const tieup of tieups) {
        addTieup(ring, tieup.source, { treadles: tieup.treadles });
      }

      clearLazyTieups(ring);
    }

    // ==========================================================================
    // Phase 3: Traverse resolved rings and build generation tasks
    // ==========================================================================
    for (const [exportName, ring] of Object.entries(mutableWarp)) {
      if (!(ring instanceof SpiralRing)) continue;

      this.traverse(ring, null, 0, exportName, (node) => {
        const typeName = node.typeName;
        if (!nodesByType.has(typeName)) {
          nodesByType.set(typeName, []);
        }
        nodesByType.get(typeName)!.push(node);

        if (node.parent) {
          const edge: SpiralEdge = {
            from: node.parent.ring,
            to: node.ring,
            relationship: detectRelationship(node.ring, node.parent.ring),
            exportName
          };
          edges.push(edge);

          const currentType = node.parent.typeName;
          const previousType = typeName;

          if (!seenRingPairs.has(node.parent.ring)) {
            seenRingPairs.set(node.parent.ring, new Set());
          }
          const innerSet = seenRingPairs.get(node.parent.ring)!;
          if (innerSet.has(node.ring)) {
            return;
          }

          const generator = this.matrix.getPair(currentType, previousType);
          if (generator) {
            innerSet.add(node.ring);
            tasks.push({
              match: [currentType, previousType],
              current: node.parent,
              previous: node,
              exportName
            });
          }
        }
      });
    }

    // ==========================================================================
    // Phase 4: Collect tieup tasks from all layers
    // ==========================================================================
    const allLayers = collectAllLayers(mutableWarp);
    const tieups = collectAllTieups(allLayers);

    for (const tieup of tieups) {
      const targetNode = findNodeForRing(nodesByType, tieup.target);
      const sourceNode = findNodeForRing(nodesByType, tieup.source);

      if (!targetNode || !sourceNode) continue;

      for (const entry of tieup.config.treadles) {
        const treadle = entry.treadle;
        const config = entry.config;

        let generator: TreadleTrodder;
        if (this.isTreadleDefinition(treadle)) {
          generator = generateFromTreadle(treadle);
        } else {
          generator = treadle as TreadleTrodder;
        }

        tasks.push({
          match: [targetNode.typeName, sourceNode.typeName],
          current: targetNode,
          previous: sourceNode,
          exportName: targetNode.exportName ?? 'unknown',
          generator,
          config: config
        });
      }
    }

    return { edges, nodesByType, tasks, _isComplete: true };
  }

  private traverse(
    ring: SpiralRing,
    parent: SpiralNode | null,
    depth: number,
    traversalExportName: string,
    visitor: (node: SpiralNode) => void
  ): void {
    const typeName = getEffectiveTypeName(ring);
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

    if (ring instanceof SpiralOut) {
      if (ring.inner) {
        const existingExport = this.ringExportNames.get(ring.inner);
        const innerExportName =
          existingExport && ring.inner instanceof CoreRing ? existingExport : exportName;
        this.traverse(ring.inner, node, depth + 1, innerExportName, visitor);
      }

      for (const [key, value] of Object.entries(ring)) {
        if (key !== 'inner' && value instanceof SpiralRing) {
          if (value instanceof Spiraler && value.innerRing === ring) {
            continue;
          }
          this.traverse(value, node, depth + 1, exportName, visitor);
        }
      }
    } else if (ring instanceof Spiraler) {
      if (ring.innerRing) {
        const innerExportName = this.ringExportNames.get(ring.innerRing) ?? exportName;
        this.traverse(ring.innerRing, node, depth + 1, innerExportName, visitor);
      }
    } else if (ring instanceof MuxSpiraler) {
      for (const inner of ring.innerRings) {
        this.traverse(inner, node, depth + 1, exportName, visitor);
      }
    } else if (ring instanceof SpiralMux) {
      for (const inner of ring.innerRings) {
        this.traverse(inner, node, depth + 1, exportName, visitor);
      }

      for (const [key, value] of Object.entries(ring)) {
        if (key !== 'innerRings' && value instanceof SpiralRing) {
          this.traverse(value, node, depth + 1, exportName, visitor);
        }
      }
    } else if (ring instanceof SurfaceRing) {
      if (ring.inner) {
        this.traverse(ring.inner, node, depth + 1, exportName, visitor);
      }
    }
  }

  private isTreadleDefinition(value: unknown): value is TreadleDefinition {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const v = value as Record<string, unknown>;
    const hasMatches = 'matches' in v && Array.isArray(v.matches);
    const hasMethods = 'methods' in v && typeof v.methods === 'object' && v.methods !== null;
    const hasOutputs = 'outputs' in v && Array.isArray(v.outputs);
    return hasMatches || (hasMethods && hasOutputs);
  }
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
 * A trodder that, when it finds (current, previous) match, trods a treadle with
 * the context
 */
export type TreadleTrodder = (
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
  generator?: TreadleTrodder;
  /**
   * Optional config data from tieup (config).
   * Passed to generator context.config when executing.
   */
  config?: Record<string, unknown>;
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
  /** Method collection helpers (populated by treadle-kit) */
  shed: Shed;
  /**
   * Entity collection helpers (populated by treadle-kit).
   * Provides access to entities associated with managements.
   */
  //entities: BoundQuery<LanguageEntity>;
  /**
   * Configuration data from tieup (config).
   * Available when treadle is invoked via .tieup()
   */
  config?: Record<string, unknown>;
}
