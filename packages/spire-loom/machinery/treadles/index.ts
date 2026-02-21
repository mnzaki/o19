/**
 * Treadles - Generation Phases
 *
 * The foot pedals that control the loom. Each pedal lifts a different
 * combination of heddles, creating different patterns.
 * 
 * In our machinery, the treadles are the high-level generators:
 * - Core generator (Rust traits)
 * - Platform generator (Android, Desktop)
 * - Tauri generator (Commands, permissions)
 * - DDD generator (TypeScript domain)
 * - Adaptor generator (Drizzle ORM)
 */

// Android generation
export { generateAndroidService, type AndroidGenerationOptions } from './android-generator.js';

// Tauri generation
export { generateTauriPlugin, type TauriGenerationOptions } from './tauri-generator.js';

// Generator matrix registration
import { GeneratorMatrix } from '../heddles/index.js';
import { generateAndroidService } from './android-generator.js';
import { generateTauriPlugin } from './tauri-generator.js';

/**
 * Create the default generator matrix with all treadles registered.
 */
export function createDefaultMatrix(): GeneratorMatrix {
  const matrix = new GeneratorMatrix();
  
  // Android: (AndroidSpiraler, RustCore) → Android bridge
  matrix.setPair('AndroidSpiraler', 'RustCore', generateAndroidService);
  
  // Tauri: (TauriSpiraler, SpiralMux) → Tauri plugin (muxing)
  // The SpiralMux aggregates platform rings (Android, Desktop, iOS)
  // Tauri routes to the appropriate platform at compile time
  matrix.setPair('TauriSpiraler', 'SpiralMux', generateTauriPlugin);
  
  // TODO: Add more generators
  // matrix.setPair('DDDTypescriptSpiraler', 'TauriSpiraler', generateDDDLayers);
  // matrix.setPair('DrizzleAdaptorSpiraler', 'DDDTypescriptSpiraler', generateDrizzleSchema);
  
  return matrix;
}
