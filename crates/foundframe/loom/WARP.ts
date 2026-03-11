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

export class TheStream extends rust.Struct {}

export class DeviceManager extends rust.Struct {}

export class Foundframe extends rust.Struct {
  @rust.Mutex
  @rust.Option
  thestream = new TheStream();

  @rust.Mutex
  @rust.Option
  device_manager = new DeviceManager();
}

// ============================================================================
// CORE SPIRAL with db-binding treadle
// ============================================================================

export const foundframe = loom.spiral(Foundframe).tieup({
  treadles: [
    {
      treadle: dbBindingTreadle,
      config: {}
    }
  ]
});
