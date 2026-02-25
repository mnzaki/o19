/**
 * Heddles Traversal
 *
 * Ring traversal utilities for building the weaving plan.
 */

import {
  SpiralRing,
  SpiralOut,
  SpiralMux,
  Spiraler,
  MuxSpiraler,
} from '../../warp/index.js';
import { CoreRing } from '../../warp/spiral/index.js';
import type { SpiralNode } from './types.js';
import type { Layer } from '../../warp/layers.js';

/**
 * Ring traversal state passed to visitor callback.
 */
export interface TraversalState {
  /** Export name assigned during traversal */
  exportName: string;
  /** Tracks export names assigned to rings */
  ringExportNames: WeakMap<SpiralRing, string>;
}

/**
 * Visitor function called for each node during traversal.
 */
export type NodeVisitor = (node: SpiralNode) => void;

/**
 * Get the effective type name for a ring.
 * For SpiralOut that wraps a Spiraler directly (inner is Spiraler),
 * returns the spiraler's type name.
 * This allows matrix matching against 'RustAndroidSpiraler' instead of 'SpiralOut'.
 *
 * NOTE: We only check ring.inner, not properties. SpiralOuts that have
 * spiraler properties but don't wrap them directly (like foundframe which
 * has .android but wraps RustCore) should return 'SpiralOut'.
 */
export function getEffectiveTypeName(ring: SpiralRing): string {
  if (ring instanceof CoreRing) {
    return ring.constructor.name;
  }

  // If it's a SpiralOut, check if it wraps a Spiraler directly
  if (ring instanceof SpiralOut) {
    if (ring.spiraler) {
      return `${ring.spiraler.constructor.name}.${ring.treadleTag}`;
    } else {
      return ring.inner.name;
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

  // we have to always have a type name
  console.error('Do not understand', ring);
  throw new Error('Internal Error');
}

/**
 * Find a SpiralNode for a given ring from the nodesByType map.
 */
export function findNodeForRing(
  nodesByType: Map<string, SpiralNode[]>,
  ring: SpiralRing
): SpiralNode | undefined {
  for (const nodes of nodesByType.values()) {
    for (const node of nodes) {
      if (node.ring === ring) {
        return node;
      }
    }
  }
  return undefined;
}

/**
 * Recursively collect layers from a ring and its inner rings.
 */
export function collectLayersFromRing(ring: SpiralRing, layers: Set<Layer>): void {
  if ((ring as any).tieup) {
    // This is a Layer with potential tieups
    layers.add(ring as unknown as Layer);
  }

  // Recurse into inner rings
  if (ring instanceof SpiralOut && ring.inner) {
    collectLayersFromRing(ring.inner, layers);
  } else if (ring instanceof Spiraler && ring.innerRing) {
    collectLayersFromRing(ring.innerRing, layers);
  } else if (ring instanceof MuxSpiraler) {
    for (const inner of ring.innerRings) {
      collectLayersFromRing(inner, layers);
    }
  } else if (ring instanceof SpiralMux) {
    for (const inner of ring.innerRings) {
      collectLayersFromRing(inner, layers);
    }
  }

  // Also check properties for SpiralOut/SpiralMux
  if (ring instanceof SpiralOut || ring instanceof SpiralMux) {
    for (const value of Object.values(ring)) {
      if (value instanceof SpiralRing) {
        collectLayersFromRing(value, layers);
      }
    }
  }
}

/**
 * Collect all unique layers from the warp.
 */
export function collectAllLayers(warp: Record<string, SpiralRing>): Set<Layer> {
  const layers = new Set<Layer>();

  for (const ring of Object.values(warp)) {
    if (ring instanceof SpiralRing) {
      collectLayersFromRing(ring, layers);
    }
  }

  return layers;
}

/**
 * Detect the relationship between two rings.
 */
export function detectRelationship(
  current: SpiralRing,
  previous: SpiralRing
): 'wraps' | 'aggregates' | 'adapts' | 'binds' {
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
export function findRoots(nodesByType: Map<string, SpiralNode[]>): SpiralNode[] {
  const allNodes = Array.from(nodesByType.values()).flat();
  return allNodes.filter((n) => n.parent === null);
}

/**
 * Find the path from a node to its root.
 */
export function getPathToRoot(node: SpiralNode): SpiralNode[] {
  const path: SpiralNode[] = [node];
  let current = node;
  while (current.parent) {
    path.unshift(current.parent);
    current = current.parent;
  }
  return path;
}
