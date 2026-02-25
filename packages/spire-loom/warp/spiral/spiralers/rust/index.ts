export * from './android.js';

import { Spiraler, SpiralRing } from '../../pattern.js';
import { RustAndroidSpiraler } from './android.js';

/**
 * Rust Spiraler.
 *
 * Wraps a RustCore and provides Rust-specific spiral methods.
 * Created via `loom.spiral.rust()` which creates the RustCore automatically.
 */
export class RustSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Android platform layer.
   *
   * Returns a RustAndroidSpiraler for configuring Android-specific generation.
   */
  get android() {
    return new RustAndroidSpiraler(this.innerRing);
  }

  /**
   * Desktop platform layer.
   *
   * Spirals out for desktop platform code.
   */
  desktop() {
    return this.spiralOut('desktop', {});
  }
}
