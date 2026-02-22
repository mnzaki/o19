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
  
  // Tauri: (TauriSpiraler, AndroidSpiraler) → Tauri Android platform
  // Tauri: (TauriSpiraler, DesktopSpiraler) → Tauri Desktop platform
  // The TauriSpiraler muxes multiple platform rings, creating edges to each.
  // We generate platform-specific adapter code for each edge.
  matrix.setPair('TauriSpiraler', 'AndroidSpiraler', generateTauriPlugin);
  matrix.setPair('TauriSpiraler', 'DesktopSpiraler', generateTauriPlugin);
  
  // TODO: Add more generators
  // matrix.setPair('DDDTypescriptSpiraler', 'TauriSpiraler', generateDDDLayers);
  // matrix.setPair('DrizzleAdaptorSpiraler', 'DDDTypescriptSpiraler', generateDrizzleSchema);
  
  return matrix;
}

// ============================================================================
// Declarative API
// ============================================================================

/**
 * Define treadles declaratively instead of writing generator functions.
 *
 * @example
 * ```typescript
 * import { defineTreadle } from '@o19/spire-loom/machinery/treadles';
 * import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';
 *
 * const myTreadle = defineTreadle({
 *   matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
 *   methods: {
 *     filter: 'platform',
 *     pipeline: [addManagementPrefix]
 *   },
 *   outputs: [
 *     {
 *       template: 'my-platform/service.ts.ejs',
 *       path: '{packageDir}/spire/service.ts',
 *       language: 'typescript'
 *     }
 *   ]
 * });
 *
 * matrix.setPair('MySpiraler', 'RustCore', generateFromTreadle(myTreadle));
 * ```
 */
export {
  defineTreadle,
  generateFromTreadle,
  type TreadleDefinition,
  type MatchPattern,
  type MethodConfig,
  type OutputSpec,
  type HookupConfig,
} from './declarative-api.js';
