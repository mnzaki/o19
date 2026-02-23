/**
 * Treadle Kit - Platform Wrapper Abstraction 🔄
 *
 * Higher-level abstraction for treadles that wrap a Rust core with a platform-native interface.
 *
 * The platform wrapper pattern:
 * 1. Takes a RustCore (the inner ring)
 * 2. Wraps it with platform-specific code (Android Service, Tauri Plugin, etc.)
 * 3. Exposes core methods through platform idioms
 * 4. Handles platform-specific hookup (manifest, gradle, etc.)
 *
 * > *"Every platform speaks its own language, but the core remains the same."*
 *
 * @example
 * ```typescript
 * import { definePlatformWrapperTreadle } from '@o19/spire-loom/machinery/treadle-kit';
 * import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';
 *
 * export const genAndroidForegroundService = definePlatformWrapperTreadle({
 *   platform: {
 *     name: 'Android',
 *     spiraler: 'AndroidSpiraler',
 *   },
 *   wrapperType: 'foreground-service',
 *   methods: {
 *     filter: 'platform',
 *     pipeline: [addManagementPrefix()]
 *   },
 *   naming: (coreName, affix) => ({
 *     serviceName: `${coreName}${affix}Service`,
 *     interfaceName: `I${coreName}${affix}`,
 *   }),
 *   outputs: [
 *     { template: 'android/service.kt.ejs', file: 'service', language: 'kotlin' },
 *     { template: 'android/aidl_interface.aidl.ejs', file: 'aidl', language: 'aidl' },
 *     { template: 'android/jni_bridge.jni.rs.ejs', file: 'jni', language: 'rust_jni' },
 *   ],
 *   hookup: 'android-gradle'
 * });
 * ```
 */

import type { SpiralNode, GeneratorContext } from '../heddles/index.js';
import type { RawMethod } from '../bobbin/index.js';
import type { MgmtMethod } from '../sley/index.js';
import {
  defineTreadle,
  generateFromTreadle,
  type TreadleDefinition,
  type MethodConfig,
  type OutputSpec,
} from './declarative.js';
import {
  createTreadleKit,
  buildServiceNaming,
  type ServiceNaming,
} from './core.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Platform identifier.
 */
export interface PlatformConfig {
  /** The platform name (e.g., 'Android', 'Tauri', 'iOS') */
  name: string;
  /** The spiraler class name (e.g., 'AndroidSpiraler') */
  spiraler: string;
  /** Optional: The base package/crate naming convention */
  packageNaming?: (coreName: string) => string;
}

/**
 * Naming convention for the wrapper.
 */
export interface WrapperNaming {
  /** The main wrapper name (e.g., 'MyService', 'MyPlugin') */
  wrapperName: string;
  /** Interface/protocol name (e.g., 'IMyService') */
  interfaceName?: string;
  /** File/module name (e.g., 'my_service') */
  fileName?: string;
  /** Additional platform-specific names */
  [key: string]: string | undefined;
}

/**
 * Output file specification for platform wrappers.
 */
export interface PlatformOutput {
  /** Template path (relative to bobbin/) */
  template: string;
  /** Output file identifier (used in path resolution) */
  file: string;
  /** Language for formatting */
  language: OutputSpec['language'];
  /** Optional condition for conditional generation */
  condition?: (context: GeneratorContext) => boolean;
}

/**
 * Hookup strategy for platform integration.
 */
export type PlatformHookup =
  | 'android-gradle'
  | 'tauri-plugin'
  | 'rust-crate'
  | 'npm-package'
  | 'custom';

/**
 * Configuration for definePlatformWrapperTreadle.
 */
export interface PlatformWrapperConfig {
  /** Platform configuration */
  platform: PlatformConfig;
  /** Type of wrapper (e.g., 'foreground-service', 'plugin') */
  wrapperType: string;
  /** Method collection configuration */
  methods: MethodConfig;
  /**
   * Generate naming for the wrapper.
   * Called with the core name and optional name affix from the spiraler.
   */
  naming: (coreName: string, nameAffix: string | undefined) => WrapperNaming;
  /** Output file specifications */
  outputs: PlatformOutput[];
  /** Hookup strategy */
  hookup: PlatformHookup;
  /**
   * Optional: Transform methods before template rendering.
   * Useful for adding platform-specific metadata (e.g., JNI links).
   */
  transformMethods?: (methods: RawMethod[], context: GeneratorContext) => RawMethod[];
  /**
   * Optional: Additional template data beyond the standard set.
   */
  extraData?: (
    context: GeneratorContext,
    current: SpiralNode,
    previous: SpiralNode,
    naming: WrapperNaming
  ) => Record<string, unknown>;
  /**
   * Optional: Custom validation beyond type checking.
   */
  validate?: (current: SpiralNode, previous: SpiralNode) => boolean | void;
}

/**
 * Platform wrapper treadle with extended metadata.
 */
export interface PlatformWrapperTreadle extends TreadleDefinition {
  /** Platform this wrapper targets */
  readonly platform: PlatformConfig;
  /** Type of wrapper */
  readonly wrapperType: string;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Define a platform wrapper treadle.
 *
 * This is a higher-level abstraction over `defineTreadle` specifically for
 * the common pattern of wrapping a RustCore with a platform-native interface.
 *
 * It handles:
 * - Standard match pattern ({Platform}Spiraler, RustCore)
 * - Method collection with filtering
 * - Naming convention resolution
 * - Output path generation
 * - Platform-specific hookup
 *
 * @param config - Platform wrapper configuration
 * @returns Treadle definition ready for use with generateFromTreadle
 */
export function definePlatformWrapperTreadle(
  config: PlatformWrapperConfig
): PlatformWrapperTreadle {
  // Build the base treadle definition
  const definition = defineTreadle({
    // Match: {Platform}Spiraler wrapping RustCore
    matches: [{ current: config.platform.spiraler, previous: 'RustCore' }],

    // Validation
    validate: (current, previous) => {
      // Run custom validation if provided
      if (config.validate) {
        const result = config.validate(current, previous);
        if (result === false) return false;
      }
      return true;
    },

    // Method collection
    methods: config.methods,

    // Method transformation
    transformMethods: config.transformMethods,

    // Data building
    data: (context, current, previous) => {
      const kit = createTreadleKit(context);

      // Get core metadata from previous ring (RustCore)
      const coreMetadata = (previous.ring as any).getMetadata?.() || {};
      const coreName = coreMetadata.packageName || 'unknown';

      // Get name affix from current ring (platform spiraler)
      const nameAffix = (current.ring as any).getNameAffix?.();

      // Generate wrapper naming
      const naming = config.naming(coreName, nameAffix);

      // Build standard data
      const standardData: Record<string, unknown> = {
        // Core info
        coreName,
        coreCrateName: coreMetadata.crateName || coreName,

        // Wrapper naming (spread first, then explicit for precedence)
        ...naming, // Spread any additional naming fields
        wrapperName: naming.wrapperName,
        interfaceName: naming.interfaceName,
        fileName: naming.fileName,

        // Name affix
        nameAffix: nameAffix || '',

        // Platform info
        platform: config.platform.name,
        platformLower: config.platform.name.toLowerCase(),

        // Store rings for hookup
        _currentRing: current.ring,
        _previousRing: previous.ring,
      };

      // Add extra data if provided
      if (config.extraData) {
        const extra = config.extraData(context, current, previous, naming);
        return { ...standardData, ...extra };
      }

      return standardData;
    },

    // Output files
    outputs: config.outputs.map((output) => ({
      template: output.template,
      // Path will be resolved by data fields
      path: output.file,
      language: output.language,
      condition: output.condition,
    })),

    // Hookup
    hookup: {
      type: config.hookup as any,
      customHookup: config.hookup === 'custom' ? undefined : undefined,
    },
  });

  // Return with platform metadata
  return Object.freeze({
    ...definition,
    platform: config.platform,
    wrapperType: config.wrapperType,
  });
}

// ============================================================================
// Convenience Builders
// ============================================================================

/**
 * Create naming for an Android-style foreground service.
 *
 * @param coreName - The core package name (e.g., 'foundframe')
 * @param affix - Optional name affix (e.g., 'radicle')
 * @returns Wrapper naming
 */
export function buildAndroidServiceNaming(
  coreName: string,
  affix?: string
): WrapperNaming {
  const naming = buildServiceNaming(coreName, affix);
  return {
    ...naming,
    wrapperName: naming.serviceName,
    interfaceName: naming.interfaceName,
    fileName: toSnakeCase(naming.serviceName),
  };
}

/**
 * Create naming for a Tauri-style plugin.
 *
 * @param coreName - The core package name (e.g., 'foundframe')
 * @param affix - Optional name affix
 * @returns Wrapper naming
 */
export function buildTauriPluginNaming(
  coreName: string,
  affix?: string
): WrapperNaming {
  const pascalCore = coreName.charAt(0).toUpperCase() + coreName.slice(1);
  const pascalAffix = affix ? affix.charAt(0).toUpperCase() + affix.slice(1) : '';

  return {
    wrapperName: pascalAffix ? `${pascalCore}${pascalAffix}Plugin` : `${pascalCore}Plugin`,
    interfaceName: pascalAffix ? `${pascalCore}${pascalAffix}Platform` : `${pascalCore}Platform`,
    fileName: toSnakeCase(coreName) + (affix ? `_${toSnakeCase(affix)}` : ''),
  };
}

// Helper
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// ============================================================================
// Export for Convenience
// ============================================================================

export { generateFromTreadle } from './declarative.js';
