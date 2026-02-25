import { Spiraler, SpiralRing } from '../pattern.js';

/**
 * DesktopSpiraler - Direct calls to Core (no IPC).
 * Used for desktop platforms where the app and core run in the same process.
 */
export class DesktopSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Direct access to Core - no wrapping needed.
   * Desktop apps call foundframe directly.
   */
  direct() {
    return this.spiralOut('direct', {});
  }
}
