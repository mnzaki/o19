/**
 * Sley Operation Router 🪡
 *
 * "Thread the operations through the correct rings."
 *
 * This module integrates OperationMux with the sley (binding resolution)
 * to route CRUD operations to their appropriate adaptors.
 */

import type { CrudOperation } from '../../warp/crud.js';
import type { SpiralRing } from '../../warp/spiral/pattern.js';
import {
  OperationMux,
  type OperationRouting,
  getOperationRouting,
} from '../../warp/spiral/operation-mux.js';

/**
 * Route a CRUD operation to the appropriate ring.
 *
 * @param operation - The CRUD operation type
 * @param ring - The ring (potentially an OperationMux)
 * @returns The ring that should handle this operation
 *
 * @example
 * ```typescript
 * const ring = routeOperation('read', front);
 * // If front is an OperationMux with read: drizzleRing,
 * // returns drizzleRing
 * ```
 */
export function routeOperation(
  operation: CrudOperation,
  ring: SpiralRing
): SpiralRing {
  const routing = getOperationRouting(ring);

  if (!routing) {
    // No routing - return the ring itself
    return ring;
  }

  // Check custom routing first
  if (routing.custom?.has(operation)) {
    return routing.custom.get(operation)!;
  }

  // Categorize by read/write
  switch (operation) {
    case 'read':
    case 'list':
      if (routing.read) return routing.read;
      break;
    case 'create':
    case 'update':
    case 'delete':
      if (routing.write) return routing.write;
      break;
  }

  // Fallback: return the original ring
  return ring;
}

/**
 * Route multiple operations, grouping by target ring.
 *
 * @param operations - List of operations to route
 * @param ring - The ring (potentially an OperationMux)
 * @returns Map of target rings to their assigned operations
 *
 * @example
 * ```typescript
 * const grouped = routeOperations(
 *   ['create', 'read', 'update', 'delete'],
 *   front
 * );
 * // Returns:
 * // Map {
 * //   drizzleRing => ['read'],
 * //   tauriRing => ['create', 'update', 'delete']
 * // }
 * ```
 */
export function routeOperations(
  operations: CrudOperation[],
  ring: SpiralRing
): Map<SpiralRing, CrudOperation[]> {
  const grouped = new Map<SpiralRing, CrudOperation[]>();

  for (const op of operations) {
    const targetRing = routeOperation(op, ring);
    const existing = grouped.get(targetRing) || [];
    existing.push(op);
    grouped.set(targetRing, existing);
  }

  return grouped;
}

/**
 * Get routing information for code generation.
 *
 * Returns a description of how operations are routed,
 * suitable for generating composite adaptors.
 */
export interface RoutingInfo {
  /** The operation */
  operation: CrudOperation;
  /** Target ring for this operation */
  targetRing: SpiralRing;
  /** Whether this goes through a mux */
  isRouted: boolean;
  /** Category: 'read' | 'write' | 'custom' */
  category: 'read' | 'write' | 'custom' | 'direct';
}

/**
 * Analyze routing for all CRUD operations.
 *
 * @param ring - The ring to analyze
 * @returns Routing information for each operation
 */
export function analyzeRouting(ring: SpiralRing): RoutingInfo[] {
  const operations: CrudOperation[] = ['create', 'read', 'update', 'delete', 'list'];
  const routing = getOperationRouting(ring);

  return operations.map((op) => {
    const targetRing = routeOperation(op, ring);
    const isRouted = routing !== undefined;

    let category: RoutingInfo['category'] = 'direct';
    if (routing) {
      if (routing.custom?.has(op)) {
        category = 'custom';
      } else if (op === 'read' || op === 'list') {
        category = routing.read ? 'read' : 'direct';
      } else {
        category = routing.write ? 'write' : 'direct';
      }
    }

    return {
      operation: op,
      targetRing,
      isRouted,
      category,
    };
  });
}

/**
 * Check if a ring uses hybrid routing (different rings for read/write).
 */
export function isHybridRouting(ring: SpiralRing): boolean {
  const routing = getOperationRouting(ring);
  if (!routing) return false;

  return !!(routing.read && routing.write && routing.read !== routing.write);
}

/**
 * Get the read adaptor from a hybrid ring.
 */
export function getReadAdaptor(ring: SpiralRing): SpiralRing | undefined {
  const routing = getOperationRouting(ring);
  return routing?.read;
}

/**
 * Get the write adaptor from a hybrid ring.
 */
export function getWriteAdaptor(ring: SpiralRing): SpiralRing | undefined {
  const routing = getOperationRouting(ring);
  return routing?.write;
}

// ============================================================================
// Code Generation Helpers
// ============================================================================

/**
 * Generate import statements for a composite adaptor.
 *
 * @param ring - The OperationMux ring
 * @returns Import specifiers for the generated code
 */
export function generateCompositeImports(ring: SpiralRing): {
  readAdaptor?: string;
  writeAdaptor?: string;
} {
  const routing = getOperationRouting(ring);
  if (!routing) return {};

  // TODO: These would come from the actual adaptor generation
  // For now, return placeholder names
  return {
    readAdaptor: routing.read ? 'DrizzleAdaptor' : undefined,
    writeAdaptor: routing.write ? 'TauriAdaptor' : undefined,
  };
}

/**
 * Generate the method body for a composite operation.
 *
 * @param operation - The CRUD operation
 * @param ring - The OperationMux ring
 * @returns Code snippet for the method implementation
 */
export function generateCompositeMethod(
  operation: CrudOperation,
  ring: SpiralRing
): string {
  const targetRing = routeOperation(operation, ring);
  const routing = getOperationRouting(ring);

  if (!routing) {
    // Direct call - no mux
    return `return this.adaptor.${operation}(...args);`;
  }

  const isRead = operation === 'read' || operation === 'list';
  const adaptorName = isRead ? 'this.readAdaptor' : 'this.writeAdaptor';

  return `return ${adaptorName}.${operation}(...args);`;
}
