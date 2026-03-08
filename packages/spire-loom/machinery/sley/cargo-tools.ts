/**
 * Cargo Tools Manager
 *
 * Utilities for checking and installing Cargo tools.
 */

import { execSync } from 'node:child_process';

/**
 * Check if a cargo tool is installed.
 * 
 * @param toolName Name of the tool (e.g., 'cargo-ndk')
 * @returns true if installed, false otherwise
 */
export function isCargoToolInstalled(toolName: string): boolean {
  try {
    // Try to run the tool with --version
    execSync(`${toolName} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the version of an installed cargo tool.
 * 
 * @param toolName Name of the tool (e.g., 'cargo-ndk')
 * @returns Version string or null if not installed
 */
export function getCargoToolVersion(toolName: string): string | null {
  try {
    const output = execSync(`${toolName} --version`, { encoding: 'utf-8', stdio: 'pipe' });
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Install a cargo tool via cargo install.
 * 
 * @param toolName Name of the tool (e.g., 'cargo-ndk')
 * @param options Installation options
 * @returns true if installed/updated, false on failure
 * 
 * @example
 * ensureCargoToolInstalled('cargo-ndk');
 * ensureCargoToolInstalled('cbindgen', { version: '0.26.0' });
 */
export function ensureCargoToolInstalled(
  toolName: string,
  options: { version?: string; force?: boolean } = {}
): boolean {
  const isInstalled = isCargoToolInstalled(toolName);
  
  if (isInstalled && !options.force) {
    console.log(`  ${toolName} is already installed (${getCargoToolVersion(toolName)})`);
    return false;
  }
  
  const installSpec = options.version 
    ? `${toolName}@${options.version}` 
    : toolName;
  
  console.log(`  Installing ${installSpec}...`);
  
  try {
    const forceFlag = options.force ? ' --force' : '';
    execSync(`cargo install ${installSpec}${forceFlag}`, { 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    console.log(`  ✓ ${toolName} installed successfully`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to install ${toolName}`);
    throw new Error(`Failed to install ${toolName}: ${error}`);
  }
}

/**
 * Ensure cargo-ndk is installed for Android builds.
 * 
 * cargo-ndk is required for building Rust code for Android targets.
 * 
 * @returns true if installed/updated, false if already present
 */
export function ensureCargoNdkInstalled(): boolean {
  return ensureCargoToolInstalled('cargo-ndk');
}

/**
 * Ensure cbindgen is installed for C header generation.
 * 
 * @returns true if installed/updated, false if already present
 */
export function ensureCbindgenInstalled(): boolean {
  return ensureCargoToolInstalled('cbindgen');
}

/**
 * Check prerequisites for Android builds.
 * 
 * Verifies that required tools are installed for building Rust for Android.
 * 
 * @returns Object with check results
 */
export function checkAndroidPrerequisites(): {
  cargoNdk: boolean;
  androidNdk: boolean;
  androidNdkPath?: string;
} {
  const result = {
    cargoNdk: isCargoToolInstalled('cargo-ndk'),
    androidNdk: false,
    androidNdkPath: undefined as string | undefined,
  };
  
  // Check for ANDROID_NDK_HOME or ANDROID_NDK_ROOT
  const ndkHome = process.env.ANDROID_NDK_HOME || process.env.ANDROID_NDK_ROOT;
  if (ndkHome) {
    result.androidNdk = true;
    result.androidNdkPath = ndkHome;
  }
  
  return result;
}

/**
 * Print Android build prerequisites status.
 */
export function printAndroidPrerequisites(): void {
  const prereqs = checkAndroidPrerequisites();
  
  console.log('Android Build Prerequisites:');
  console.log(`  cargo-ndk: ${prereqs.cargoNdk ? '✓' : '✗'} ${getCargoToolVersion('cargo-ndk') || ''}`);
  console.log(`  Android NDK: ${prereqs.androidNdk ? '✓' : '✗'} ${prereqs.androidNdkPath || ''}`);
  
  if (!prereqs.cargoNdk) {
    console.log('\n  To install cargo-ndk:');
    console.log('    cargo install cargo-ndk');
  }
  
  if (!prereqs.androidNdk) {
    console.log('\n  To set up Android NDK:');
    console.log('    sdkmanager "ndk;27.0.12077973"');
    console.log('    export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.0.12077973');
  }
}
