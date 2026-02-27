/**
 * Foundframe Package WARP - The canonical definition
 *
 * This is the source of truth for the foundframe core. The workspace WARP
 * imports from here. This ensures the package owns its own definition and
 * treadles are properly attached.
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
// CORE SPIRAL with db-binding treadle
// ============================================================================

export const foundframe = loom.spiral(Foundframe).tieup({
  treadles: [
    {
      treadle: dbBindingTreadle,
      warpData: {}
    }
  ]
});
