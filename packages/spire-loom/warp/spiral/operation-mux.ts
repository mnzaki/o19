/**
 * OperationMux - CRUD Operation Router
 *
 * "Route by what you do, not where you are."
 *
 * An OperationMux routes CRUD operations to different spiral rings:
 * - READ operations → Drizzle/SQLite (fast queries)
 * - WRITE operations → Tauri/TheStream (PKB persistence)
 *
 * This enables the hybrid architecture:
 *   PKB (git) = Source of truth
 *   SQLite = Fast query index
 *   TheStream = Orchestrates sync
 */

import { SpiralRing, SpiralOut, spiralOut } from './pattern.js';
import type { Spiralers } from './pattern.js';
import type { CrudOperation } from '../crud.js';

/**
 * Operation routing configuration.
 * Maps CRUD operations to specific rings.
 */
export interface OperationRouting {
  /** Ring for read operations (getById, list, queries) */
  read?: SpiralRing;
  /** Ring for write operations (create, update, delete) */
  write?: SpiralRing;
  /** Custom routing for specific operations */
  custom?: Map<CrudOperation, SpiralRing>;
}

/**
 * OperationMux - Routes CRUD operations to different rings.
 *
 * Unlike SpiralMux (which multiplexes by platform), OperationMux
 * routes by operation type to enable read/write splitting.
 *
 * @example
 * ```typescript
 * const drizzle = front.typescript.drizzle_adaptors({ filter: ['read'] });
 * const tauriWrite = front.typescript.tauri_adaptors({ filter: ['write'] });
 *
 * const front = loom.operationMux({
 *   read: drizzle,
 *   write: tauriWrite
 * });
 * ```
 */
export class OperationMux<O extends Partial<Spiralers> = Spiralers> extends SpiralRing {
  constructor(
    /** The operation routing configuration */
    public routing: OperationRouting,
    /** Spiralers for this mux */
    spiralers: O
  ) {
    super();
    Object.assign(this, spiralers);
  }

  /**
   * Get the ring for a specific CRUD operation.
   */
  getRingForOperation(operation: CrudOperation): SpiralRing | undefined {
    // Check custom routing first
    if (this.routing.custom?.has(operation)) {
      return this.routing.custom.get(operation);
    }

    // Fall back to read/write categorization
    switch (operation) {
      case 'read':
      case 'list':
        return this.routing.read;
      case 'create':
      case 'update':
      case 'delete':
        return this.routing.write;
      default:
        return undefined;
    }
  }

  /**
   * Get all inner rings (for iteration/traversal).
   */
  getInnerRings(): SpiralRing[] {
    const rings: SpiralRing[] = [];
    if (this.routing.read) rings.push(this.routing.read);
    if (this.routing.write) rings.push(this.routing.write);
    if (this.routing.custom) {
      rings.push(...this.routing.custom.values());
    }
    return [...new Set(rings)]; // Deduplicate
  }
}

export type OperationMuxType<O extends Partial<Spiralers> = Spiralers> = OperationMux<O> & O;

/**
 * Create an OperationMux from routing configuration.
 *
 * @example
 * ```typescript
 * // Hybrid read/write split
 * const front = loom.operationMux({
 *   read: drizzleRing,    // → SQLite queries
 *   write: tauriRing      // → Tauri → TheStream → PKB
 * });
 * ```
 */
export function operationMux<O extends Partial<Spiralers> = Spiralers>(
  routing: OperationRouting,
  spiralers?: O
): OperationMuxType<O> {
  return new OperationMux(routing, spiralers ?? {} as O) as unknown as OperationMuxType<O>;
}

/**
 * Convenience: Create a hybrid adaptor that splits read/write.
 *
 * This is the common case for foundframe:
 * - Reads go to Drizzle (SQLite)
 * - Writes go to Tauri (TheStream → PKB)
 */
export function hybridAdaptor(
  readAdaptor: SpiralRing,
  writeAdaptor: SpiralRing
): OperationMuxType<{}> {
  return operationMux({
    read: readAdaptor,
    write: writeAdaptor
  });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a ring is an OperationMux.
 */
export function isOperationMux(ring: unknown): ring is OperationMux {
  return ring instanceof OperationMux;
}

/**
 * Get operation routing from a ring if it's an OperationMux.
 */
export function getOperationRouting(ring: SpiralRing): OperationRouting | undefined {
  if (isOperationMux(ring)) {
    return ring.routing;
  }
  return undefined;
}
