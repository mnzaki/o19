/**
 * Treadle Kit 🧰
 *
 * The foundation layer for building treadles. Provides utilities, abstractions,
 * and declarative APIs for code generation.
 *
 * ## Architecture
 *
 * ```
 * machinery/treadle-kit/
 * ├── index.ts        ← Main exports (you are here)
 * ├── core.ts         ← TreadleKit implementation (createTreadleKit)
 * ├── declarative.ts  ← Declarative API (defineTreadle, generateFromTreadle)
 * ├── discovery.ts    ← Treadle discovery (discoverTreadles, createMatrixWithDiscovery)
 * └── platform-wrapper.ts  ← High-level abstraction (definePlatformWrapperTreadle)
 * ```
 *
 * ## Usage Patterns
 *
 * ### 1. Imperative (using the kit directly)
 * ```typescript
 * import { createTreadleKit } from '@o19/spire-loom/machinery/treadle-kit';
 *
 * export async function myGenerator(current, previous, context) {
 *   const kit = createTreadleKit(context);
 *   const methods = kit.collectMethods({ filter: 'platform', pipeline: [] });
 *   // ... generate files
 * }
 * ```
 *
 * ### 2. Declarative (defineTreadle)
 * ```typescript
 * import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
 *
 * const myTreadle = defineTreadle({
 *   matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
 *   methods: { filter: 'platform', pipeline: [] },
 *   outputs: [{ template: '...', path: '...', language: 'typescript' }]
 * });
 *
 * matrix.setPair('MySpiraler', 'RustCore', generateFromTreadle(myTreadle));
 * ```
 *
 * ### 3. Platform Wrapper (definePlatformWrapperTreadle)
 * ```typescript
 * import { definePlatformWrapperTreadle } from '@o19/spire-loom/machinery/treadle-kit';
 *
 * const myWrapper = definePlatformWrapperTreadle({
 *   platform: { name: 'MyPlatform', spiraler: 'MySpiraler' },
 *   wrapperType: 'service',
 *   methods: { filter: 'platform', pipeline: [] },
 *   naming: (core, affix) => ({ wrapperName: `${core}Service` }),
 *   outputs: [{ template: '...', file: '...', language: 'typescript' }],
 *   hookup: 'rust-crate'
 * });
 * ```
 *
 * > *"The kit holds the tools; the treadle dances the pattern."*
 */

// ============================================================================
// Core Kit
// ============================================================================

export {
  // Main factory
  createTreadleKit,
  // Types
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
  buildAndroidPackageData
} from './core.js';

// ============================================================================
// Declarative API
// ============================================================================

export {
  // Definition
  defineTreadle,
  // Generation
  generateFromTreadle,
  // Types
  type TreadleDefinition,
  type MatchPattern,
  type MethodConfig as DeclarativeMethodConfig,
  type OutputSpec,
  type OutputSpecOrFn,
  type PatchSpec,
  type PatchSpecOrFn,
  type HookupConfig
} from './declarative.js';

// ============================================================================
// Discovery
// ============================================================================

export {
  // Discovery
  discoverTreadles,
  collectSpiralerContributions,
  buildMatrixFromTreadles,
  // Matrix creation
  createMatrix,
  // Legacy (deprecated)
  createDefaultMatrix,
  createMatrixWithDiscovery,
  // Types
  type DiscoveredTreadle,
  type SpiralerContribution
} from './discovery.js';

// ============================================================================
// Platform Wrapper Abstraction
// ============================================================================

export {
  // Helpers
  buildAndroidServiceNaming,
  buildTauriPluginNaming,
  // Types
  type PlatformWrapperConfig,
  type PlatformWrapperTreadle,
  type PlatformConfig,
  type WrapperNaming,
  type PlatformOutput,
  type PlatformHookup
} from './platform-wrapper.js';

// ============================================================================
// Re-exports from Shuttle (for convenience)
// ============================================================================

export {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData
} from '../shuttle/hookup-manager.js';

// ============================================================================
// Re-exports from Bobbin (Android utilities)
// ============================================================================

export {
  generateEventCallbackAidl,
  writeEventCallbackAidl,
  type EventCallbackConfig
} from '../bobbin/android.js';
