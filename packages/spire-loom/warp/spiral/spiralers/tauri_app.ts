import { Spiraler, SpiralRing, spiralOut } from '../pattern.js';

/**
 * TauriAppSpiraler - Creates a Tauri app that wraps the front layer.
 * Used by front.tauri.app() to create my-tauri-app.
 */
export class TauriAppSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Create a Tauri application package.
   */
  app() {
    return spiralOut(this, {});
  }
}
