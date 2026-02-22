/**
 * Declarative Treadle API - Migration Example for o19 Kimi
 *
 * This file shows how to rewrite android-generator.ts using the declarative API.
 * Keep this as reference when doing the actual rewrite!
 *
 * > *"The spiral conserves as it transforms."*
 */

// ============================================================================
// BEFORE: Hand-written android-generator.ts (346 lines)
// ============================================================================

/*
import * as path from 'node:path';
import { ensureXmlBlock } from '../shuttle/xml-block-manager.js';
import { configureAndroidGradle } from '../shuttle/android-gradle-integration.js';
import type { SpiralNode, GeneratedFile, GeneratorContext } from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import { AndroidSpiraler } from '../../warp/spiral/spiralers/android.js';
import { RustCore } from '../../warp/spiral/index.js';
import { filterByReach, type ManagementMetadata } from '../reed/index.js';
import {
  MethodPipeline,
  addManagementPrefix,
  fromSourceMethods,
  toSnakeCase,
  type MgmtMethod
} from '../sley/index.js';
import { generateCode, type RawMethod } from '../bobbin/index.js';

export async function generateAndroidService(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> {
  // Validation
  if (!(current.ring instanceof AndroidSpiraler)) return [];
  if (!(previous.ring instanceof RustCore)) throw new Error('Expected RustCore');

  // Method collection (40 lines)
  const rawMethods = collectManagementMethods(plan?.managements ?? []);

  // Generate files using generateCode() calls
  // ... 100+ lines of template configuration

  // Hookup
  ensureXmlBlock(manifestPath, { ... });
  configureAndroidGradle(gradlePath, { ... });

  return files;
}

// Plus 100+ lines of helper functions...
*/

// ============================================================================
// AFTER: Declarative android-generator.ts (~80 lines)
// ============================================================================

import { defineTreadle, generateFromTreadle } from './declarative-api.js';
import { addManagementPrefix } from '../sley/index.js';
import { AndroidSpiraler } from '../../warp/spiral/spiralers/android.js';
import { RustCore } from '../../warp/spiral/index.js';
import { ensureXmlBlock } from '../shuttle/xml-block-manager.js';
import { configureAndroidGradle } from '../shuttle/android-gradle-integration.js';
import * as path from 'node:path';
import type { GeneratorContext } from '../heddles/index.js';

/**
 * Android Service Treadle - Declarative Definition
 *
 * This replaces the 346-line hand-written generator with a declarative
 * configuration that's easier to read, test, and maintain.
 */
export const androidServiceTreadle = defineTreadle({
  // ==========================================================================
  // 1. Match Pattern: When does this treadle run?
  // ==========================================================================
  matches: [{ current: 'AndroidSpiraler', previous: 'RustCore' }],

  // ==========================================================================
  // 2. Validation: Custom checks beyond the match pattern
  // ==========================================================================
  validate: (current, previous) => {
    // We can still use instanceof for extra safety
    if (!(current.ring instanceof AndroidSpiraler)) {
      return false;
    }
    if (!(previous.ring instanceof RustCore)) {
      throw new Error('AndroidSpiraler must wrap RustCore');
    }
    return true;
  },

  // ==========================================================================
  // 3. Methods: Filter and transform
  // ==========================================================================
  methods: {
    // Filter by reach: 'core' | 'platform' | 'front'
    // Android services need 'platform' (Local reach + Global reach)
    filter: 'platform',

    // Pipeline transformations - import these directly from sley
    pipeline: [addManagementPrefix()],
  },

  // ==========================================================================
  // 4. Data: Template variables beyond methods
  // ==========================================================================
  data: (context, current, previous) => {
    const android = current.ring as AndroidSpiraler;
    const core = previous.ring as RustCore;
    const metadata = core.getMetadata();

    const nameAffix = android.getNameAffix();
    const pascalAffix = nameAffix
      ? nameAffix.charAt(0).toUpperCase() + nameAffix.slice(1)
      : '';
    const coreNamePascal =
      metadata.packageName.charAt(0).toUpperCase() + metadata.packageName.slice(1);

    return {
      // Package structure
      packageDir: `o19/crates/${metadata.packageName}-android`,
      packageName: android.getGradleNamespace(metadata.packageName),
      coreName: metadata.packageName,
      coreNamePascal,
      crateName: metadata.crateName,

      // Service naming
      nameAffix,
      pascalAffix,
      serviceName: pascalAffix
        ? `${coreNamePascal}${pascalAffix}Service`
        : `${coreNamePascal}Service`,
      interfaceName: pascalAffix ? `I${coreNamePascal}${pascalAffix}` : `I${coreNamePascal}`,

      // Service configuration
      logTag: pascalAffix
        ? `${coreNamePascal}${pascalAffix}Service`.toUpperCase().replace(/\s/g, '_')
        : `${coreNamePascal}Service`.toUpperCase().replace(/\s/g, '_'),
      channelId: pascalAffix
        ? `${coreNamePascal}${pascalAffix}Service`.toLowerCase().replace(/\s/g, '_')
        : `${coreNamePascal}Service`.toLowerCase().replace(/\s/g, '_'),
      channelName: pascalAffix ? `${coreNamePascal}${pascalAffix}Service` : `${coreNamePascal}Service`,
      channelDescription: `Background service for ${metadata.packageName}`,
      notificationTitle: `${metadata.packageName} Service`,
      notificationText: 'Running in background',

      // Native library
      nativeLibName: 'android',
      homeDirName: `.${metadata.packageName}`,

      // Computed paths
      packagePath: android.getGradleNamespace(metadata.packageName).replace(/\./g, '/'),
      jniPackagePath: android.getGradleNamespace(metadata.packageName).replace(/\./g, '_'),
    };
  },

  // ==========================================================================
  // 5. Outputs: What files to generate
  // ==========================================================================
  outputs: [
    // Kotlin service class
    {
      template: 'android/service.kt.ejs',
      path: '{packageDir}/spire/android/java/{packagePath}/service/{serviceName}.kt',
      language: 'kotlin',
    },

    // AIDL interface
    {
      template: 'android/aidl_interface.aidl.ejs',
      path: '{packageDir}/spire/android/aidl/{packagePath}/{interfaceName}.aidl',
      language: 'aidl',
    },

    // Rust JNI bridge
    {
      template: 'android/jni_bridge.jni.rs.ejs',
      path: '{packageDir}/spire/src/lib.rs',
      language: 'rust_jni',
    },
  ],

  // ==========================================================================
  // 6. Hookup: Integrate with the package
  // ==========================================================================
  hookup: {
    type: 'custom',
    async customHookup(context, files, data) {
      const workspaceRoot = context.workspaceRoot;
      const packageDir = data.packageDir as string;
      const coreNamePascal = data.coreNamePascal as string;
      const gradleNamespace = data.packageName as string;
      const serviceName = data.serviceName as string;
      const interfaceName = data.interfaceName as string;

      const resolvedPackageDir = path.join(workspaceRoot, '..', packageDir);

      // AndroidManifest.xml entries
      const manifestPath = path.join(resolvedPackageDir, 'android', 'AndroidManifest.xml');
      const bindPermissionName = `${gradleNamespace}.BIND_${coreNamePascal.toUpperCase()}_RADICLE`;

      ensureXmlBlock(manifestPath, {
        ForegroundServicePermission: {
          content: `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />`,
          parent: 'permissions',
        },
        ForegroundServiceDataSyncPermission: {
          content: `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />`,
          parent: 'permissions',
        },
        BindRadiclePermission: {
          content: `<permission
            android:name="${bindPermissionName}"
            android:label="Bind to ${coreNamePascal} Radicle Service"
            android:protectionLevel="signature|normal" />
          <uses-permission android:name="${bindPermissionName}" />`,
          parent: 'permissions',
        },
        RadicleService: {
          content: `<service
                android:name=".service.${serviceName}"
                android:process=":foundframe"
                android:exported="true"
                android:permission="${bindPermissionName}"
                android:foregroundServiceType="dataSync"
                android:enabled="true">
                <intent-filter>
                    <action android:name="${gradleNamespace}.${interfaceName}" />
                </intent-filter>
            </service>`,
          parent: 'application',
        },
      });

      // Gradle configuration
      const gradlePath = path.join(resolvedPackageDir, 'build.gradle');

      // Compute task name from plan
      let coreName = 'Unknown';
      const spiralOutNodes = context.plan.nodesByType.get('SpiralOut') ?? [];
      for (const node of spiralOutNodes) {
        const spiralOut = node.ring as any;
        const rustCore = (data as any).coreRing;
        if (spiralOut.inner === rustCore && node.exportName) {
          coreName = node.exportName.charAt(0).toUpperCase() + node.exportName.slice(1);
          break;
        }
      }

      configureAndroidGradle(gradlePath, {
        spireDir: './spire',
        hasCargoToml: true,
        taskName: `buildRust${coreName}`,
      });
    },
  },
});

// ============================================================================
// Registration (in treadles/index.ts)
// ============================================================================

/*
import { generateFromTreadle } from './declarative-api.js';
import { androidServiceTreadle } from './android-generator.js';

export function createDefaultMatrix(): GeneratorMatrix {
  const matrix = new GeneratorMatrix();
  
  // Old way:
  // matrix.setPair('AndroidSpiraler', 'RustCore', generateAndroidService);
  
  // New way:
  matrix.setPair('AndroidSpiraler', 'RustCore', generateFromTreadle(androidServiceTreadle));
  
  // ... rest of matrix setup
  return matrix;
}
*/

// ============================================================================
// BONUS: Advanced Patterns
// ============================================================================

/**
 * Pattern 1: Conditional outputs based on platform
 */
export const conditionalTreadle = defineTreadle({
  matches: [{ current: 'TauriSpiraler', previous: 'AndroidSpiraler' }],
  methods: { filter: 'platform', pipeline: [addManagementPrefix()] },
  outputs: [
    // Always generate platform trait
    { template: 'tauri/platform.rs.ejs', path: '...', language: 'rust' },

    // Only generate Android-specific mobile code for Android platform
    {
      template: 'tauri/mobile/android.rs.ejs',
      path: '{packageDir}/spire/src/mobile/android.rs',
      language: 'rust',
      condition: (context) => {
        // Check if there's an AndroidSpiraler in the plan
        return context.plan.nodesByType.has('AndroidSpiraler');
      },
    },
  ],
});

/**
 * Pattern 2: Method transformation for special handling
 */
export const transformTreadle = defineTreadle({
  matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
  methods: { filter: 'platform', pipeline: [addManagementPrefix()] },

  // Custom method transformation after pipeline
  transformMethods: (methods, context) => {
    return methods.map((m) => {
      // Add snake_case implName for Rust
      const snakeName = m.name.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);

      return {
        ...m,
        implName: snakeName,
        // Add custom fields templates can use
        hasCustomHandling: m.name.startsWith('admin_'),
      };
    });
  },

  outputs: [{ template: 'my/service.rs.ejs', path: '...', language: 'rust' }],
});

/**
 * Pattern 3: Multiple match patterns
 */
export const multiPlatformTreadle = defineTreadle({
  // Same treadle handles multiple platform combinations
  matches: [
    { current: 'TauriSpiraler', previous: 'AndroidSpiraler' },
    { current: 'TauriSpiraler', previous: 'DesktopSpiraler' },
    { current: 'TauriSpiraler', previous: 'IOSSpiraler' },
  ],
  methods: { filter: 'front', pipeline: [addManagementPrefix()] },
  outputs: [
    {
      template: 'tauri/platform.rs.ejs',
      path: '{packageDir}/spire/src/platform.rs',
      language: 'rust',
    },
  ],
});

// Export the generator function for the matrix
export const generateAndroidService = generateFromTreadle(androidServiceTreadle);
