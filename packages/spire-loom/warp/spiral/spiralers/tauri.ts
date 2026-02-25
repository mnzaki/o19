import { Spiraler, SpiralRing } from '../pattern.js';
import { TypescriptSpiraler } from './typescript/index.js';

/**
 * TauriSpiraler extends MuxSpiraler because Tauri aggregates
 * multiple platform rings (Android, iOS, Desktop) into a plugin.
 */
export class TauriSpiraler extends Spiraler {
  /** Configuration for CRUD adaptor generation */
  _config?: { ddd?: { adaptors?: { filterOut?: string[] } } };

  constructor(public innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Create a Tauri plugin that aggregates platform rings.
   * Generates platform trait + commands with platform routing.
   */
  plugin(config?: { ddd?: { adaptors?: { filterOut?: string[] } } }) {
    this._config = config;
    return this.spiralOut('plugin', {
      typescript: new TypescriptSpiraler(this.innerRing)
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
