/**
 * Android Generator
 *
 * Generates Android foreground service code from spiral patterns.
 * 
 * Matrix match: (AndroidSpiraler, RustCore) → Android bridge
 */

import * as path from 'node:path';
import { ensureXmlBlock } from '../shuttle/xml-block-manager.js';
import { configureAndroidGradle } from '../shuttle/android-gradle-integration.js';
import type { SpiralNode, GeneratedFile, GeneratorContext } from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import { AndroidSpiraler } from '../../warp/spiral/spiralers/android.js';
import { RustCore } from '../../warp/spiral/core.js';
import { filterByReach, type ManagementMetadata } from '../reed/index.js';
import { generateCode, generateBatch, type RawMethod } from '../bobbin/index.js';

export interface AndroidGenerationOptions {
  /** Output directory for the generated crate */
  outputDir: string;
  /** Core crate name (e.g., "o19-foundframe") */
  coreCrateName: string;
  /** Android package name (e.g., "ty.circulari.o19") */
  packageName: string;
  /** Service name (e.g., "FoundframeRadicleService") */
  serviceName: string;
  /** Management methods to include */
  methods?: Array<{
    name: string;
    returnType: string;
    params: Array<{ name: string; type: string }>;
    description?: string;
  }>;
}

/**
 * Generate Android foreground service files.
 * 
 * This is called when the matrix matches (AndroidSpiraler, RustCore).
 * It generates:
 * - Kotlin service class
 * - AIDL interface (for reference)
 * - Rust JNI bridge
 * 
 * The bobbin handles all type transformations based on output file extensions.
 */
export async function generateAndroidService(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const plan = context?.plan;
  const workspaceRoot = context?.workspaceRoot ?? process.cwd();
  
  // Validate node types (be lenient for deduplicated tasks)
  if (!(current.ring instanceof AndroidSpiraler)) {
    if (process.env.DEBUG_MATRIX) {
      console.log(`[ANDROID] Skipping: current ring is ${current.ring.constructor.name}, not AndroidSpiraler`);
    }
    return [];
  }
  if (!(previous.ring instanceof RustCore)) {
    throw new Error('Expected RustCore as previous node');
  }
  
  const core = previous.ring as RustCore;
  const android = current.ring as AndroidSpiraler;
  const metadata = core.getMetadata();
  
  // Build names and paths
  const nameAffix = android.getNameAffix();
  const pascalAffix = nameAffix ? pascalCase(nameAffix) : '';
  const gradleNamespace = android.getGradleNamespace(metadata.packageName);
  const packageDir = `o19/crates/${metadata.packageName}-android`;
  const coreNamePascal = pascalCase(metadata.packageName);
  
  const interfaceName = pascalAffix 
    ? `I${coreNamePascal}${pascalAffix}`
    : `I${coreNamePascal}`;
  
  const serviceClassName = pascalAffix
    ? `${coreNamePascal}${pascalAffix}Service`
    : `${coreNamePascal}Service`;
  
  // Collect raw Management methods (bobbin will transform by language)
  const rawMethods = collectManagementMethods(plan?.managements ?? []);
  
  // Path components for package structure
  const packagePath = gradleNamespace.replace(/\./g, '/');
  
  // ==========================================================================
  // Generate all files using bobbin's unified API
  // Language is auto-detected from output extensions
  // ==========================================================================
  
  const generationTasks = [
    // Kotlin service
    generateCode({
      template: 'android/service.kt.ejs',
      outputPath: path.join(packageDir, 'spire', 'android', 'java', packagePath, 'service', `${serviceClassName}.kt`),
      data: {
        packageName: gradleNamespace,
        serviceName: serviceClassName,
        logTag: serviceClassName.toUpperCase().replace(/\s/g, '_'),
        channelId: serviceClassName.toLowerCase().replace(/\s/g, '_'),
        channelName: serviceClassName,
        channelDescription: `Background service for ${metadata.packageName}`,
        notificationTitle: `${metadata.packageName} Service`,
        notificationText: 'Running in background',
        nativeLibName: 'android',
        homeDirName: `.${metadata.packageName}`,
      },
      methods: rawMethods,
    }),
    
    // AIDL interface
    generateCode({
      template: 'android/aidl_interface.aidl.ejs',
      outputPath: path.join(packageDir, 'spire', 'android', 'aidl', packagePath, `${interfaceName}.aidl`),
      data: {
        interfaceName,
        packageName: gradleNamespace,
        coreName: metadata.packageName,
        imports: [`${gradleNamespace}.IEventCallback`],
      },
      methods: rawMethods,
    }),
    
    // Rust JNI bridge
    generateCode({
      template: 'android/jni_bridge.jni.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'lib.rs'),
      data: {
        serviceName: serviceClassName,
        coreCrateName: metadata.crateName ?? 'o19-foundframe',
        packageName: gradleNamespace,
        coreName: metadata.packageName,
        jniPackagePath: gradleNamespace.replace(/\./g, '_'),
      },
      methods: rawMethods,
    }),
  ];
  
  const generatedFiles = await Promise.all(generationTasks);
  files.push(...generatedFiles);
  
  // IEventCallback AIDL (static template - no methods transformation needed)
  const callbackContent = `// IEventCallback.aidl
// Callback interface for ${metadata.packageName} events

package ${gradleNamespace};

interface IEventCallback {
    // Event is a JSON string representing ${coreNamePascal}Event
    oneway void onEvent(String eventJson);
}`;
  
  files.push({
    path: path.join(packageDir, 'spire', 'android', 'aidl', packagePath, 'IEventCallback.aidl'),
    content: callbackContent,
  });
  
  // ==========================================================================
  // Hook up AndroidManifest.xml entries
  // ==========================================================================
  
  const resolvedPackageDir = path.join(workspaceRoot, '..', packageDir);
  const manifestPath = path.join(resolvedPackageDir, 'android', 'AndroidManifest.xml');
  const bindPermissionName = `${gradleNamespace}.BIND_${coreNamePascal.toUpperCase()}_RADICLE`;
  
  ensureXmlBlock(manifestPath, {
    ForegroundServicePermission: {
      content: `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />`,
      parent: 'permissions'
    },
    ForegroundServiceDataSyncPermission: {
      content: `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />`,
      parent: 'permissions'
    },
    BindRadiclePermission: {
      content: `<permission
        android:name="${bindPermissionName}"
        android:label="Bind to ${coreNamePascal} Radicle Service"
        android:protectionLevel="signature|normal" />
    <uses-permission android:name="${bindPermissionName}" />`,
      parent: 'permissions'
    },
    RadicleService: {
      content: `<service
            android:name=".service.${serviceClassName}"
            android:process=":foundframe"
            android:exported="true"
            android:permission="${bindPermissionName}"
            android:foregroundServiceType="dataSync"
            android:enabled="true">
            <intent-filter>
                <action android:name="${gradleNamespace}.${interfaceName}" />
            </intent-filter>
        </service>`,
      parent: 'application'
    }
  });
  
  // ==========================================================================
  // Hook up Gradle build configuration
  // ==========================================================================
  
  const gradlePath = path.join(resolvedPackageDir, 'build.gradle');
  
  // Compute task name: buildRust{CoreName}
  const rustCore = previous.ring;
  let coreName = 'Unknown';
  
  if (context?.plan) {
    ensurePlanComplete(context.plan, 'compute Gradle task name');
  }
  
  const spiralOutNodes = context?.plan.nodesByType.get('SpiralOut') ?? [];
  for (const node of spiralOutNodes) {
    const spiralOut = node.ring as any;
    if (spiralOut.inner === rustCore && node.exportName) {
      coreName = node.exportName.charAt(0).toUpperCase() + node.exportName.slice(1);
      break;
    }
  }
  
  const taskName = `buildRust${coreName}`;
  
  configureAndroidGradle(gradlePath, {
    spireDir: './spire',
    hasCargoToml: true,
    taskName,
  });
  
  return files;
}

// ============================================================================
// Helpers
// ============================================================================

function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

/**
 * Collect raw Management methods without type mapping.
 * 
 * The bobbin's code-generator will apply language-specific transformations
 * based on the output file extension.
 */
function collectManagementMethods(
  managements: ManagementMetadata[]
): RawMethod[] {
  if (managements.length === 0) {
    return [];
  }

  // Filter for Android platform (Local + Global reach)
  const platformManagements = filterByReach(managements, 'platform');
  
  const methods: RawMethod[] = [];

  for (const mgmt of platformManagements) {
    for (const method of mgmt.methods) {
      methods.push({
        name: method.name,
        returnType: method.returnType,
        isCollection: method.isCollection ?? false,
        params: method.params.map(p => ({
          name: p.name,
          type: p.type,
          optional: p.optional,
        })),
        description: `${mgmt.name}.${method.name}`,
      });
    }
  }

  return methods;
}
