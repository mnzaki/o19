import { Spiraler, SpiralRing } from '../../../pattern.js';
import type { CrudFilter } from '../../../../crud.js';

/**
 * DDDTypescriptSpiraler - Domain-Driven Design TypeScript layer.
 *
 * This spiraler represents the DDD layer which includes:
 * - Domain types (entities, value objects)
 * - Port interfaces (abstract contracts for persistence)
 *
 * From this layer, we can spiral out to generate adaptor implementations.
 */
export class DDDTypescriptSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Generate Drizzle ORM adaptor implementations of DDD Ports.
   *
   * This spirals out from the DDD layer to create concrete Drizzle ORM
   * implementations of the Port interfaces defined in this layer.
   *
   * @param options - Configuration for the adaptor generation
   * @param options.filter - Which CRUD operations to implement:
   *   - 'all': All CRUD operations (default)
   *   - 'read': Only read operations (read, list)
   *   - 'write': Only write operations (create, update, delete)
   *   - ['create', 'read']: Specific operations to implement
   *
   * Usage:
   *   // Generate all adaptors
   *   front.typescript.drizzle_adaptors()
   *
   *   // Generate read-only adaptors (for read replicas, caching layers)
   *   front.typescript.drizzle_adaptors({ filter: 'read' })
   *
   *   // Generate only specific operations
   *   front.typescript.drizzle_adaptors({ filter: ['create', 'read'] })
   */
  drizzle_adaptors(options?: { filter?: CrudFilter }) {
    const filter = options?.filter ?? 'all';

    // The adaptor implementation ring
    // This generates Drizzle ORM implementations of the Ports
    return this.spiralOut('drizzle_adaptors', {
      drizzle: new DrizzleAdaptorSpiraler(this.innerRing, filter)
    });
  }
}

/**
 * DrizzleAdaptorSpiraler - Generates Drizzle ORM implementations.
 *
 * This spiraler creates the concrete adaptor implementations that
 * bridge the DDD Port interfaces to Drizzle ORM operations.
 */
export class DrizzleAdaptorSpiraler extends Spiraler {
  constructor(
    innerRing: SpiralRing,
    public filter: CrudFilter
  ) {
    super(innerRing);
  }

  /**
   * Generate the Drizzle schema from domain entities.
   */
  schema() {
    return this.spiralOut('schema', {});
  }
}
