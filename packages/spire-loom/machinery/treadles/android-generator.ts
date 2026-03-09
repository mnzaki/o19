/**
 * Android Generator - Clean Declarative Version
 *
 * Generates Android foreground service code from spiral patterns.
 * Uses the declarative API with automatic language enhancement.
 *
 * Matrix match: (RustAndroidSpiraler, RustCore) → Android bridge
 *
 * > *"The treadle is glue; the helpers are the craft."*
 */

import { RustAndroidSpiraler } from '../../warp/spiral/spiralers/rust/android.js';
import { RustCore, SpiralOut } from '../../warp/spiral/index.js';
import { buildCrateNaming } from '../stringing.js';
import { hookup } from '../sley/index.js';
import { declareTreadle, generateFromTreadle } from './index.js';

// ============================================================================
// Treadle Definition
// ============================================================================

export const androidServiceTreadle = declareTreadle({
  // When does this run?
  matches: [{ current: 'RustAndroidSpiraler.foregroundService', previous: 'RustCore' }],

  // Extra validation
  validate: (current, previous) => {
    const spiraler = (current.ring as any).spiraler;
    if (!(spiraler instanceof RustAndroidSpiraler)) return false;
    if (!(previous.ring instanceof RustCore)) {
      throw new Error('RustAndroidSpiraler must wrap RustCore');
    }
    return true;
  },

  // Method filtering
  methods: {
    filter: 'platform',
    pipeline: []
  },

  // Template data
  data: (_context, current, previous) => {
    if (!(current.ring instanceof SpiralOut)) {
      throw new Error('Expected SpiralOut');
    }
    const android = current.ring.spiraler as RustAndroidSpiraler;
    const core = previous.ring as RustCore;
    const metadata = core.getMetadata();

    const naming = buildServiceNaming(metadata.packageName, android.getNameAffix());
    const paths = buildAndroidPackageData(
      metadata.packageName,
      android.getGradleNamespace(metadata.packageName)
    );

    // Build crate naming for Rust code generation
    const crateNaming = buildCrateNaming(metadata.crateName);

    return {
      // Package structure
      ...paths,
      coreName: metadata.packageName,
      coreNamePascal: naming.serviceName.replace(/Service$/, ''),
      coreCrateName: metadata.crateName,
      crateNaming,
      // Backwards compatibility
      coreCrateRustId: crateNaming.rustIdentifier,

      // Service naming
      nameAffix: naming.nameAffix,
      pascalAffix: naming.pascalAffix,
      serviceName: naming.serviceName,
      interfaceName: naming.interfaceName,

      // Service configuration
      logTag: naming.logTag,
      channelId: naming.channelId,
      channelName: naming.channelName,
      channelDescription: `Background service for ${metadata.packageName}`,
      notificationTitle: `${metadata.packageName} Service`,
      notificationText: 'Running in background',

      // Native library
      nativeLibName: 'android',
      homeDirName: `.${metadata.packageName}`,

      // AIDL imports
      imports: [`${paths.packageName}.IEventCallback`],

      // Store current ring for hookup
      _currentRing: current.ring
    };
  },

  // Output files - language auto-detected from template extensions
  outputs: [
    {
      template: 'android/service.kt.mejs',
      path: 'android/java/{packagePath}/service/{serviceName}.kt'
    },
    // AIDL language auto-detected from .aidl extension
    {
      template: 'android/aidl_interface.aidl.mejs',
      path: 'android/aidl/{packagePath}/{interfaceName}.aidl'
    },
    // Rust JNI bridge
    {
      template: 'android/jni_bridge.jni.rs.mejs',
      path: 'src/lib.rs'
    }
  ],

  // Package integration
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) {
      await hookup.executeAndroidHookup(context, files, {
        workspaceRoot: context.workspaceRoot ?? process.cwd(),
        packageDir: context.packageDir,
        coreName: data.coreName as string,
        coreNamePascal: data.coreNamePascal as string,
        packageName: data.packageName as string,
        packagePath: data.packagePath as string,
        serviceName: data.serviceName as string,
        interfaceName: data.interfaceName as string,
        currentRing: data._currentRing
      });
    }
  }
});

// ============================================================================
// Exports
// ============================================================================

export type AndroidGenerationOptions = {
  outputDir: string;
  coreCrateName: string;
  packageName: string;
  serviceName: string;
};

export const generateAndroidService = generateFromTreadle(androidServiceTreadle);

// ============================================================================
// Helpers (moved from helpers.ts - TODO: consolidate)
// ============================================================================

function buildServiceNaming(packageName: string, nameAffix: string) {
  const pascalAffix = nameAffix
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  return {
    nameAffix,
    pascalAffix,
    serviceName: `${pascalAffix}Service`,
    interfaceName: `I${pascalAffix}Service`,
    logTag: `${packageName}.${nameAffix}`,
    channelId: `${packageName}.${nameAffix}.channel`,
    channelName: `${pascalAffix} Service`
  };
}

function buildAndroidPackageData(packageName: string, gradleNamespace?: string) {
  // Use gradle namespace if available, otherwise convert package name
  const namespace = gradleNamespace || `com.${packageName.replace(/-/g, '_')}`;
  const packagePath = namespace.replace(/\./g, '/');

  return {
    packageName: namespace,
    packagePath
  };
}
