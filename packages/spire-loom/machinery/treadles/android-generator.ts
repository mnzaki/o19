/**
 * Android Generator - Declarative Version
 *
 * Generates Android foreground service code from spiral patterns.
 * Uses the declarative API for cleaner, more maintainable code.
 *
 * Matrix match: (RustAndroidSpiraler, RustCore) → Android bridge
 *
 * > *"The treadle is glue; the helpers are the craft."*
 */

import { RustAndroidSpiraler } from '../../warp/spiral/spiralers/rust/android.js';
import { RustCore, SpiralOut } from '../../warp/spiral/index.js';
import { addManagementPrefix } from '../sley/index.js';
import {
  toSnakeCase,
  buildServiceNaming,
  buildAndroidPackageData,
  toRawMethod,
  buildMethodLink,
  extractManagementFromBindPoint
} from '../treadle-kit/index.js';
import { executeAndroidHookup, type AndroidHookupData } from '../shuttle/hookup-manager.js';
import { defineTreadle, generateFromTreadle } from './index.js';
import type { GeneratorContext } from '../heddles/index.js';
import type { MgmtMethod } from '../sley/index.js';
import type { RawMethod } from '../bobbin/index.js';

// ============================================================================
// Treadle Definition
// ============================================================================

export const androidServiceTreadle = defineTreadle({
  // When does this run?
  matches: [{ current: 'RustAndroidSpiraler.foregroundService', previous: 'RustCore' }],

  // Extra validation
  validate: (current, previous) => {
    // current.ring is a SpiralOut, the spiraler is stored in .spiraler
    const spiraler = (current.ring as any).spiraler;
    if (!(spiraler instanceof RustAndroidSpiraler)) return false;
    if (!(previous.ring instanceof RustCore)) {
      throw new Error('RustAndroidSpiraler must wrap RustCore');
    }
    return true;
  },

  // Method filtering and transformation
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },

  // Add link metadata for JNI routing
  transformMethods: (methods, context): RawMethod[] => {
    const linkMap = new Map(context.plan.managements.map((m) => [m.name, buildMethodLink(m)]));
    const mgmtNames = context.plan.managements.map((m) => m.name);

    return methods.map((method) => {
      const mgmtName = extractManagementFromBindPoint(method.name, mgmtNames);
      return {
        ...method,
        link: mgmtName ? linkMap.get(mgmtName) : undefined
      };
    });
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

    return {
      // Package structure
      ...paths,
      coreName: metadata.packageName,
      coreNamePascal: naming.serviceName.replace(/Service$/, ''),
      coreCrateName: metadata.crateName,

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

  // Output files
  // Note: paths are relative to the package directory (packageDir is prepended by weaver)
  outputs: [
    {
      template: 'android/service.kt.ejs',
      path: 'spire/android/java/{packagePath}/service/{serviceName}.kt',
      language: 'kotlin'
    },
    // AIDL disabled - using binder_ndk directly instead
    // See discussion: binder_ndk requires Android 12+, AIDL not needed
    // {
    //   template: 'android/aidl_interface.aidl.ejs',
    //   path: 'spire/android/aidl/{packagePath}/{interfaceName}.aidl',
    //   language: 'aidl',
    // },
    {
      template: 'android/jni_bridge.jni.rs.ejs',
      path: 'spire/src/lib.rs',
      language: 'rust_jni'
    }
  ],

  // Package integration
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) {
      await executeAndroidHookup(context, files, {
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
