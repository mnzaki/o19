/**
 * Android Gradle Integration
 *
 * Handles Gradle and Cargo integration for Android packages.
 * Part of the shuttle - carries configuration through the warp.
 */

import { ensureGradleBlock, ensureGradleSourceSet } from './gradle-manager.js';
import { ensureCargoNdkInstalled } from './cargo-tools.js';
import { getRustBuildBlock } from '../bobbin/gradle-blocks.js';

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
    manifest: `${options.spireDir}/android/AndroidManifest.xml`,
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
 * Fetches template from bobbin, weaves via shuttle.
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
