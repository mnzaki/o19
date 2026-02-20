import { Spiraler, SpiralRing, spiralOut } from '../pattern.js';
import { DDDTypescriptSpiraler } from './ddd_typescript.js';
import { DDDTauriAppSpiraler } from './ddd_tauri_app.js';

export class TypescriptSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Domain-Driven Design layer - generates TypeScript domain types
   * and Port interfaces from Management Imprints.
   *
   * Returns a SpiralOut with:
   * - `typescript`: DDDTypescriptSpiraler for spiraling out to adaptors
   * - `tauri`: DDDTauriAppSpiraler for creating Tauri apps with DDD binding
   */
  ddd() {
    return spiralOut(this, {
      typescript: new DDDTypescriptSpiraler(this),
      tauri: new DDDTauriAppSpiraler(this)
    });
  }

  /**
   * Create a TypeScript app (generic, not Tauri-specific).
   */
  app() {
    return spiralOut(this, {});
  }
}
