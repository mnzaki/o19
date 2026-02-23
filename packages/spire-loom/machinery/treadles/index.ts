/**
 * Treadles - Generation Phases 👣
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
 *
 * ## New Structure
 *
 * This module now re-exports from `machinery/treadle-kit/*` for the foundational
 * layer, while keeping specific generator implementations here.
 *
 * ```
 * machinery/
 * ├── treadle-kit/          ← Foundation layer (kit, declarative, discovery)
 * │   ├── index.ts
 * │   ├── core.ts
 * │   ├── declarative.ts
 * │   ├── discovery.ts
 * │   └── platform-wrapper.ts
 * └── treadles/             ← Generator implementations
 *     ├── index.ts          ← This file: exports + specific generators
 *     ├── android-generator.ts   ← gen-android-service
 *     └── tauri-generator.ts     ← gen-tauri-plugin
 * ```
 *
 * > *"The weaver dances, and the loom sings."*
 */

// ============================================================================
// Re-export Foundation Layer from treadle-kit
// ============================================================================

export {
  // Core kit
  createTreadleKit,
  type TreadleKit,
  type MethodConfig,
  type ServiceNaming,
  type AndroidPackageData,
  // Utilities
  pascalCase,
  camelCase,
  toSnakeCase,
  toRawMethod,
  buildMethodLink,
  extractManagementFromBindPoint,
  buildServiceNaming,
  buildAndroidPackageData,
} from '../treadle-kit/index.js';

// Declarative API
export {
  defineTreadle,
  generateFromTreadle,
  type TreadleDefinition,
  type MatchPattern,
  type OutputSpec,
  type HookupConfig,
} from '../treadle-kit/declarative.js';

// Discovery
export {
  discoverTreadles,
  createDefaultMatrix,
  createMatrixWithDiscovery,
  collectSpiralerContributions,
  type DiscoveredTreadle,
  type SpiralerContribution,
} from '../treadle-kit/discovery.js';

// Platform Wrapper Abstraction
export {
  definePlatformWrapperTreadle,
  buildAndroidServiceNaming,
  buildTauriPluginNaming,
  type PlatformWrapperConfig,
  type PlatformWrapperTreadle,
  type PlatformConfig,
  type WrapperNaming,
  type PlatformOutput,
  type PlatformHookup,
} from '../treadle-kit/platform-wrapper.js';

// Shuttle utilities (re-exported for convenience)
export {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData,
} from '../shuttle/hookup-manager.js';

// Bobbin Android utilities
export {
  generateEventCallbackAidl,
  writeEventCallbackAidl,
  type EventCallbackConfig,
} from '../bobbin/android.js';

// ============================================================================
// Built-in Generator Implementations
// ============================================================================

export { generateAndroidService, type AndroidGenerationOptions } from './android-generator.js';
export { generateTauriPlugin, type TauriGenerationOptions } from './tauri-generator.js';
