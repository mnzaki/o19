/**
 * Hookup Manager
 *
 * High-level integration utilities for spire-generated code.
 * 
 * This module provides:
 * - Rust crate module hookup (adding spire module declaration)
 * - Re-exports from specialized managers
 * 
 * For framework-specific hookups, use:
 * - tauri-manager.ts for Tauri plugins
 * - cargo-toml-manager.ts for Cargo.toml modifications
 * - gradle-manager.ts for Gradle build files
 * - xml-block-manager.ts for XML files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Hookup generated Rust code into a Cargo crate.
 * Creates/modifies lib.rs to include the generated spire module using #[path].
 * 
 * This creates a module declaration like:
 *   #[path = "../spire/src/lib.rs"]
 *   pub mod spire;
 * 
 * Which allows the spire/ directory to live as a sibling to src/.
 */
export function hookupRustCrate(cratePath: string, spireModuleName: string = 'spire'): boolean {
  const srcDir = path.join(cratePath, 'src');
  const libRsPath = path.join(srcDir, 'lib.rs');
  const mainRsPath = path.join(srcDir, 'main.rs');
  
  const entryPath = fs.existsSync(libRsPath) ? libRsPath : mainRsPath;
  
  if (!fs.existsSync(entryPath)) {
    throw new Error(`No lib.rs or main.rs found in ${srcDir}`);
  }
  
  const spireModPattern = new RegExp(`pub\\s+mod\\s+${spireModuleName}\\s*;`);
  const content = fs.readFileSync(entryPath, 'utf-8');
  if (spireModPattern.test(content)) {
    return false;
  }
  
  const spireInclude = `#[path = "../spire/src/lib.rs"]\npub mod ${spireModuleName};`;
  fs.writeFileSync(entryPath, content + '\n' + spireInclude + '\n', 'utf-8');
  
  return true;
}

// Re-exports from specialized managers
export { hookupTauriPlugin, unhookTauriPlugin } from './tauri-manager.js';
export type { TauriHookupOptions, TauriHookupResult } from './tauri-manager.js';

// ============================================================================
// Android Hookup
// ============================================================================

import type { GeneratorContext } from '../heddles/index.js';
import type { GeneratedFile } from '../heddles/index.js';
import { ensureXmlBlock } from './xml-block-manager.js';
import { configureAndroidGradle } from './android-gradle-integration.js';
import { writeEventCallbackAidl } from '../bobbin/android.js';

export interface AndroidManifestConfig {
  coreName: string;
  coreNamePascal: string;
  packageName: string;
  serviceName: string;
  interfaceName: string;
}

/**
 * Configure AndroidManifest.xml with service declarations.
 */
export function configureAndroidManifest(
  resolvedPackageDir: string,
  config: AndroidManifestConfig
): void {
  const manifestPath = path.join(resolvedPackageDir, 'android', 'AndroidManifest.xml');
  const bindPermissionName = `${config.packageName}.BIND_${config.coreNamePascal.toUpperCase()}_RADICLE`;

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
        android:label="Bind to ${config.coreNamePascal} Radicle Service"
        android:protectionLevel="signature|normal" />
      <uses-permission android:name="${bindPermissionName}" />`,
      parent: 'permissions',
    },
    RadicleService: {
      content: `<service
            android:name=".service.${config.serviceName}"
            android:process=":foundframe"
            android:exported="true"
            android:permission="${bindPermissionName}"
            android:foregroundServiceType="dataSync"
            android:enabled="true">
            <intent-filter>
                <action android:name="${config.packageName}.${config.interfaceName}" />
            </intent-filter>
        </service>`,
      parent: 'application',
    },
  });
}

export interface GradleConfig {
  resolvedPackageDir: string;
  taskName: string;
}

/**
 * Configure Android Gradle build.
 */
export function configureGradleBuild(config: GradleConfig): void {
  const gradlePath = path.join(config.resolvedPackageDir, 'build.gradle');

  configureAndroidGradle(gradlePath, {
    spireDir: './spire',
    hasCargoToml: true,
    taskName: config.taskName,
  });
}

export interface AndroidHookupData {
  workspaceRoot: string;
  packageDir: string;
  coreName: string;
  coreNamePascal: string;
  packageName: string;
  packagePath: string;
  serviceName: string;
  interfaceName: string;
  currentRing: unknown;
}

/**
 * Find core name for Gradle task naming from plan.
 */
export function findCoreNameForTask(
  context: GeneratorContext,
  currentRing: unknown
): string {
  const spiralOutNodes = context.plan.nodesByType.get('SpiralOut') ?? [];

  for (const node of spiralOutNodes) {
    const spiralOut = node.ring as any;
    if (spiralOut.inner === currentRing && node.exportName) {
      return node.exportName.charAt(0).toUpperCase() + node.exportName.slice(1);
    }
  }

  return 'Unknown';
}

/**
 * Complete Android hookup - manifest, callback AIDL, and Gradle config.
 * This is the main entry point for Android treadle hookup.
 */
export async function executeAndroidHookup(
  context: GeneratorContext,
  files: GeneratedFile[],
  data: AndroidHookupData
): Promise<void> {
  const workspaceRoot = context.workspaceRoot ?? process.cwd();
  const resolvedPackageDir = path.join(workspaceRoot, '..', data.packageDir);

  // 1. AndroidManifest.xml
  configureAndroidManifest(resolvedPackageDir, {
    coreName: data.coreName,
    coreNamePascal: data.coreNamePascal,
    packageName: data.packageName,
    serviceName: data.serviceName,
    interfaceName: data.interfaceName,
  });

  // 2. IEventCallback AIDL
  writeEventCallbackAidl(resolvedPackageDir, files, {
    coreName: data.coreName,
    coreNamePascal: data.coreNamePascal,
    packageName: data.packageName,
    packagePath: data.packagePath,
  });

  // 3. Gradle configuration
  const coreName = findCoreNameForTask(context, data.currentRing);
  configureGradleBuild({
    resolvedPackageDir,
    taskName: `buildRust${coreName}`,
  });
}
