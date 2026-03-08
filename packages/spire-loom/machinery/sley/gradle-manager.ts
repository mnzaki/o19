/**
 * Gradle Manager
 *
 * Tools for manipulating Gradle build files (build.gradle, build.gradle.kts).
 * Uses the generic marker utilities for all block operations.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureDir } from './file-system-operations.js';
import { registerFile, registerBlock } from './block-registry.js';
import {
  createGradleMarkers,
  ensureBlock,
  removeBlock,
  hasBlock,
  escapeMarkerForRegex
} from './markers.js';
import { ensureCargoNdkInstalled } from '../sley/cargo-tools.js';

// Gradle block pattern for registry
const GRADLE_BLOCK_PATTERN = /\/\/ SPIRE-LOOM:BLOCK:([\w-]+)/;

/**
 * Ensure a Gradle block is present in a build file (idempotent).
 * Uses the generic ensureBlock from markers.ts.
 */
export function ensureGradleBlock(
  filePath: string,
  blockId: string,
  blockContent: string,
  options: { after?: string; before?: string } = {}
): boolean {
  ensureDir(path.dirname(filePath));

  // Register this file for global cleanup
  registerFile(filePath, GRADLE_BLOCK_PATTERN, (_file, _id, content) => {
    const markers = createGradleMarkers('block', blockId);
    const result = removeBlock(content, markers);
    return result.modified ? result.content : null;
  });

  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  const markers = createGradleMarkers('block', blockId);

  // Check if already exists with same content
  if (hasBlock(content, markers)) {
    const blockRegex = new RegExp(
      `${escapeMarkerForRegex(markers.start)}([\\s\\S]*?)${escapeMarkerForRegex(markers.end)}`
    );
    const match = content.match(blockRegex);
    if (match && match[1].trim() === blockContent.trim()) {
      registerBlock(filePath, blockId);
      return false; // No change
    }
  }

  // Use generic ensureBlock
  const result = ensureBlock(content, markers, blockContent, {
    insertAfter: options.after,
    insertBefore: options.before
  });

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf-8');
    registerBlock(filePath, blockId);
    return true;
  }

  registerBlock(filePath, blockId);
  return false;
}

/**
 * Ensure a Gradle block is removed from a build file.
 * Uses the generic removeBlock from markers.ts.
 */
export function ensureGradleBlockRemoved(filePath: string, blockId: string): boolean {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf-8');
  const markers = createGradleMarkers('block', blockId);

  const result = removeBlock(content, markers);

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf-8');
    return true;
  }

  return false;
}

/**
 * Ensure a source set configuration is present in build.gradle.
 *
 * Uses `srcDir` (singular) to ADD to existing source directories
 * instead of `srcDirs = [...]` which would REPLACE them.
 */
export function ensureGradleSourceSet(
  filePath: string,
  name: string,
  config: {
    java?: string[];
    kotlin?: string[];
    res?: string[];
    aidl?: string[];
    jniLibs?: string[];
    assets?: string[];
    manifest?: string;
  }
): boolean {
  ensureDir(path.dirname(filePath));

  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  // Filter out empty configs
  const hasConfig = Object.values(config).some(
    (v) => v && (Array.isArray(v) ? v.length > 0 : true)
  );
  if (!hasConfig) return false;

  // Build the source set content lines
  const lines: string[] = [];

  if (config.java?.length) {
    for (const dir of config.java) lines.push(`            java.srcDir '${dir}'`);
  }
  if (config.kotlin?.length) {
    for (const dir of config.kotlin) lines.push(`            kotlin.srcDir '${dir}'`);
  }
  if (config.res?.length) {
    for (const dir of config.res) lines.push(`            res.srcDir '${dir}'`);
  }
  if (config.aidl?.length) {
    for (const dir of config.aidl) lines.push(`            aidl.srcDir '${dir}'`);
  }
  if (config.jniLibs?.length) {
    for (const dir of config.jniLibs) lines.push(`            jniLibs.srcDir '${dir}'`);
  }
  if (config.assets?.length) {
    for (const dir of config.assets) lines.push(`            assets.srcDir '${dir}'`);
  }
  if (config.manifest) {
    lines.push(`            manifest.srcFile '${config.manifest}'`);
  }

  if (lines.length === 0) return false;

  // Create markers for this source set
  const markerId = `SourceSetAppend_${name}`;
  const markers = createGradleMarkers('sourceset', markerId);

  // Build the full source set block
  const blockContent = `android {
    sourceSets {
        ${name} {
${lines.join('\n')}
        }
    }
}`;

  // Use generic ensureBlock
  const result = ensureBlock(content, markers, blockContent);

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf-8');
    return true;
  }

  return false;
}

/**
 * Clear the Gradle block registry (useful for testing).
 * @deprecated Use clearBlockRegistry from block-registry.js instead
 */
export function clearGradleBlockRegistry(): void {
  // No-op - global registry is used now
}

// ============================================================================
// Gradle Block Templates
// ============================================================================

export interface GradleBlockTemplates {
  rustBuildTask: string;
}

/**
 * Generate Rust build task block for build.gradle
 *
 * @param taskName - Base task name (e.g., 'buildRustFoundframe')
 * @param jniLibsOutput - Output directory for JNI libs
 */
export function getRustBuildBlock(taskName: string, jniLibsOutput: string): string {
  // Derive clean task name: buildRustFoundframe → cleanRustFoundframe
  const cleanTaskName = taskName.replace(/^build/, 'clean');

  return `
// Rust/Cargo integration
// Requires cargo-ndk: cargo install cargo-ndk
// NOTE: Generated code only compiles for Android targets, not host!

// Task to build Rust code using cargo-ndk
tasks.register('${taskName}', Exec) {
    group = 'build'
    description = 'Build Rust code for Android targets'

    doFirst {
        if (!System.getenv('ANDROID_NDK_HOME') && !System.getenv('ANDROID_NDK_ROOT')) {
            throw new GradleException(
                'ANDROID_NDK_HOME or ANDROID_NDK_ROOT not set!\\n' +
                'Install NDK: sdkmanager "ndk;27.0.12077973"\\n' +
                'Then set: export ANDROID_NDK_HOME=\\$ANDROID_HOME/ndk/27.0.12077973'
            )
        }
    }

    commandLine 'cargo', 'ndk',
        '-t', 'arm64-v8a',
        '-t', 'x86_64',
        '-o', '${jniLibsOutput}',
        'build', '--release'

    onlyIf {
        file('Cargo.toml').exists()
    }

    inputs.files(fileTree('src').include('**/*.rs'))
    inputs.file('Cargo.toml')
    outputs.dir('${jniLibsOutput}')
}

preBuild.dependsOn ${taskName}

tasks.register('${cleanTaskName}', Delete) {
    group = 'build'
    description = 'Clean Rust build artifacts'
    delete '${jniLibsOutput}'
}
clean.dependsOn ${cleanTaskName}
`;
}

// ============================================================================
// Android Gradle Integration
// ============================================================================

/**
 * Configure Gradle build for Android-Rust bridge.
 * Sets up source sets and Rust build tasks.
 */
export function configureAndroidGradle(
  gradlePath: string,
  options: {
    spireDir: string;
    hasCargoToml: boolean;
    taskName: string;
  }
): void {
  // Configure source sets for spire-generated code
  ensureGradleSourceSet(gradlePath, 'main', {
    java: [`${options.spireDir}/android/java`],
    aidl: [`${options.spireDir}/android/aidl`],
    jniLibs: [`${options.spireDir}/android/jniLibs`],
    manifest: `${options.spireDir}/android/AndroidManifest.xml`
  });

  // Add Rust build task
  addRustBuildTask(gradlePath, options);

  // Ensure cargo-ndk is installed (warning only)
  try {
    ensureCargoNdkInstalled();
  } catch {
    console.warn('  Warning: cargo-ndk not installed. Run: cargo install cargo-ndk');
  }
}

/**
 * Add Rust build task to build.gradle.
 */
function addRustBuildTask(
  gradlePath: string,
  options: { spireDir: string; hasCargoToml: boolean; taskName: string }
): void {
  const jniLibsOutput = `${options.spireDir}/android/jniLibs`;
  const blockContent = getRustBuildBlock(options.taskName, jniLibsOutput);

  // Use task-specific block ID for uniqueness (e.g., 'RustBuild:buildRustFoundframe')
  const blockId = `RustBuild:${options.taskName}`;
  ensureGradleBlock(gradlePath, blockId, blockContent);
}
