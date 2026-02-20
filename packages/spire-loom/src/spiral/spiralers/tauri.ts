import { MuxSpiraler, SpiralRing, spiralOut } from '../pattern.js';
import { TypescriptSpiraler } from './typescript.js';

/**
 * TauriSpiraler extends MuxSpiraler because Tauri aggregates
 * multiple platform rings (Android, iOS, Desktop) into a plugin.
 */
export class TauriSpiraler extends MuxSpiraler {
  constructor(
    public innerRings: SpiralRing[] // TODO: type for Android, Desktop, iOS rings
  ) {
    super(innerRings);
  }

  /**
   * Create a Tauri plugin that aggregates platform rings.
   * Generates platform trait + commands with platform routing.
   */
  plugin() {
    return spiralOut(this, {
      typescript: new TypescriptSpiraler(this)
    });
  }

  /**
   * Generate commands directly into an app (not as plugin).
   * TODO: Implement for apps that want commands without plugin abstraction.
   */
  commands() {
    throw new Error('Direct commands not yet implemented. Use .plugin() for now.');
  }
}
