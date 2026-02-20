import { Spiraler, SpiralRing, spiralOut } from '../pattern.js';

/**
 * DDDTauriAppSpiraler - Creates a Tauri app with DDD-aware binding.
 *
 * This spiraler knows how to bind a Tauri app to DDD Port implementations.
 * It supports adaptor overrides - alternative implementations that take
   * precedence for specific operations (e.g., read replicas, caching layers).
 */
export class DDDTauriAppSpiraler extends Spiraler {
  /** Binding configuration set when app() is called */
  bindingConfig?: { adaptorOverrides: SpiralRing[] };

  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Create a Tauri application with DDD adaptor binding.
   *
   * @param config - Application configuration
   * @param config.adaptorOverrides - SpiralRings to prioritize when looking
   *   for bind-points. These are checked first before falling back to the
   *   default DDD layer implementations.
   *
   * Usage:
   *   const drizzle = front.typescript.drizzle_adaptors({ filter: ['read'] })
   *   const myTauriApp = front.tauri.app({ adaptorOverrides: [drizzle] })
   *
   * Bind-point resolution:
   *   1. Check adaptorOverrides for matching operation
   *   2. Fall back to DDD layer (front) implementations
   *   3. Auto-generate DDD adaptors from tauri plugin if needed
   */
  app(config?: { adaptorOverrides?: SpiralRing[] }) {
    // Store binding configuration on this spiraler instance
    this.bindingConfig = {
      adaptorOverrides: config?.adaptorOverrides ?? []
    };

    // Return the app ring
    return spiralOut(this, {});
  }
}
