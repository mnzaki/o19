/**
 * Foundframe Core - The source of truth for core structures
 *
 * This module imports all entity definitions so their decorators run
 * and register with the loom's entity system.
 */

import loom, { rust } from '@o19/spire-loom';
import { dbBindingTreadle } from './treadles/dbbindings.js';

// ============================================================================
// CORE STRUCTURES
// ============================================================================

@rust.Struct
export class TheStream {}

@rust.Struct
export class DeviceManager {}

@rust.Struct({ useResult: true })
export class Foundframe {
  @rust.Mutex
  @rust.Option
  thestream = TheStream;

  @rust.Mutex
  @rust.Option
  device_manager = DeviceManager;
}

// ============================================================================
// CORE SPIRAL
// ============================================================================

/**
 * The Core - foundframe (Rust)
 * Package: foundframe
 * Path: o19/crates/foundframe
 *
 * The center that holds. Pure domain logic.
 */
export const foundframe = loom.spiral(Foundframe).tieup({
  treadles: [
    {
      treadle: dbBindingTreadle,
      warpData: {
        // Entities are now auto-discovered via context.entities
        operations: ['create', 'read', 'update', 'delete', 'list']
      }
    }
  ]
});
