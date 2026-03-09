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
import { RustCore, SpiralOut, SpiralRing } from '../../warp/spiral/index.js';
import { buildCrateNaming, buildAndroidPackageData } from '../stringing.js';
import { declareTreadle } from './index.js';
import type { AndroidManifestHookup, GradleHookup } from '../sley/hookups/types.js';
import type { GeneratorContext } from '../../weaver/plan-builder.js';

// ============================================================================
// Treadle Definition
// ============================================================================

export const generateAndroidService = declareTreadle({
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
      imports: [`${paths.packageName}.IEventCallback`]
    };
  },

  // Output files - generated into spire/ directory
  // Language is auto-detected from template file extensions
  newFiles: [
    {
      template: 'android/service.kt.mejs',
      path: 'android/java/{packagePath}/service/{serviceName}.kt'
    },
    // AIDL interface - auto-detected as AIDL language from .aidl extension
    {
      template: 'android/aidl_interface.aidl.mejs',
      path: 'android/aidl/{packagePath}/{interfaceName}.aidl'
    },
    // AIDL callback - also an output (generated file)
    {
      template: 'android/aidl_callback.aidl.mejs',
      path: 'android/aidl/{packagePath}/IEventCallback.aidl'
    },
    // Rust JNI bridge - auto-detected as Rust from .rs extension
    {
      template: 'android/jni_bridge.jni.rs.mejs',
      path: 'src/lib.rs'
    }
  ],

  // Hookups - modifications to existing external files
  hookups: (ctx: GeneratorContext) => {
    if (!(ctx.currentRing instanceof SpiralOut)) {
      return [];
    }
    const android = ctx.currentRing.spiraler as RustAndroidSpiraler;
    const core = ctx.previousRing as RustCore;
    const metadata = core.getMetadata();
    const naming = buildServiceNaming(metadata.packageName, android.getNameAffix());
    const paths = buildAndroidPackageData(
      metadata.packageName,
      android.getGradleNamespace(metadata.packageName)
    );

    const bindPermissionName = `${paths.packageName}.BIND_${naming.pascalAffix.toUpperCase()}_SERVICE`;

    return [
      // AndroidManifest.xml - modify existing file
      {
        path: 'src/main/AndroidManifest.xml',
        permissions: [
          { name: 'android.permission.FOREGROUND_SERVICE' },
          { name: 'android.permission.FOREGROUND_SERVICE_DATA_SYNC' }
        ],
        permissionDefinitions: [
          {
            name: bindPermissionName,
            label: `Bind to ${naming.pascalAffix} Service`,
            protectionLevel: 'signature|normal'
          }
        ],
        services: [
          {
            name: `.service.${naming.serviceName}`,
            process: `:${metadata.packageName}`,
            exported: true,
            permission: bindPermissionName,
            foregroundServiceType: 'dataSync'
          }
        ]
      },
      // Gradle build file - modify existing file
      {
        path: 'build.gradle.kts',
        plugins: [
          { id: 'com.android.application' },
          { id: 'org.mozilla.rust-android-gradle.rust-android' }
        ],
        android: {
          sourceSets: {
            main: {
              aidl: { srcDirs: ['spire/android/aidl'] }
            }
          }
        },
        spireTask: {
          name: `buildRust${naming.pascalAffix}`,
          targetDirectory: `../${metadata.crateName}`,
          profile: 'release'
        }
      }
    ];
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

// ============================================================================
// Helpers
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


