import { Spiraler, SpiralRing } from '../../pattern.js';
import { DDDTypescriptSpiraler } from './ddd/typescript.js';
import { DDDTauriAppSpiraler } from './ddd/tauri_app.js';
export { DDDTypescriptSpiraler, DDDTauriAppSpiraler };

/**
 * TypeScript Spiraler.
 * 
 * Wraps a TsCore and provides TypeScript-specific spiral methods.
 * Created via `loom.spiral.typescript()` which creates the TsCore automatically.
 */
export class TypescriptSpiraler extends Spiraler {
  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Prisma layer - generates Prisma schema and client code.
   * 
   * Spirals out to create the Prisma package structure.
   */
  prisma() {
    return this.spiralOut('prisma', {});
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
    return this.spiralOut('ddd', {
      typescript: new DDDTypescriptSpiraler(this),
      tauri: new DDDTauriAppSpiraler(this)
    });
  }

  /**
   * Create a TypeScript app (generic, not Tauri-specific).
   */
  app() {
    return this.spiralOut('app', {});
  }
}
