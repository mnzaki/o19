/**
 * Workspace Discovery
 *
 * "The reed finds the workspace in the wild."
 *
 * Detects workspace type and locates loom/WARP.ts configuration.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { WorkspaceInfo } from '../machinery/loom.js';
import { CoreRing } from '../warp/index.js';

export function getWorkspaceInfoFromPath(p: string): Partial<WorkspaceInfo> {
  // Check if this is a package directory (has Cargo.toml or package.json)
  // AND is NOT a workspace root (no [workspace] in Cargo.toml)
  const cargoToml = path.join(p, 'Cargo.toml');
  const hasCargoToml = fs.existsSync(cargoToml);
  const packageJson = path.join(p, 'package.json');
  const hasPackageJson = fs.existsSync(packageJson);
  let isPnpmWorkspace = false,
    isCargoWorkspace = false;
  let name: string | undefined;

  if (hasCargoToml || hasPackageJson) {
    // Check if this is actually a workspace root
    const cargoTomlContent = fs.readFileSync(cargoToml, 'utf-8');
    isCargoWorkspace = hasCargoToml && cargoTomlContent.includes('[workspace]');
    isPnpmWorkspace = fs.existsSync(path.join(p, 'pnpm-workspace.yaml'));

    if (hasCargoToml) {
      const nameMatch = cargoTomlContent.match(/^name\s*=\s*"([^"]+)"/m);
      if (nameMatch) name = nameMatch[1];
    }

    if (!name && hasPackageJson) {
      const pkgJson = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      name = pkgJson.name;
    }
  }

  // No parent workspace found - standalone package
  const loomPath = path.join(p, 'loom');
  const warpPath = path.join(loomPath, 'WARP.ts');
  return {
    name,
    type: isCargoWorkspace || isPnpmWorkspace ? 'workspace' : 'package',
    root: p,
    loomDir: fs.existsSync(loomPath) ? loomPath : undefined,
    warpPath: fs.existsSync(warpPath) ? warpPath : undefined
  };
}

/**
 * Load WARP.ts module dynamically.
 *
 * Also sets the `.name` property on all Layer instances to their export name,
 * ensuring consistent metadata derivation across Rust and TypeScript layers.
 *
 * For RustCore instances, also sets the crateName and packageName options
 * based on the export name, ensuring proper crate naming in generated code.
 *
 * Note: If a layer/core already has a custom .name or options set in WARP.ts,
 * they are preserved.
 *
 * @param warpPath - Path to WARP.ts
 * @param workspaceRoot - Optional workspace root for consistent module resolution
 */
export async function loadWarp(
  warpPath: string,
  workspaceRoot?: string
): Promise<Record<string, any>> {
  const { pathToFileURL } = await import('node:url');
  const warpUrl = pathToFileURL(warpPath).href;

  // If workspaceRoot is provided, temporarily change cwd for consistent module resolution
  // This ensures imports from WARP.ts resolve the same regardless of where spire-loom runs
  const originalCwd = process.cwd();
  if (workspaceRoot) {
    process.chdir(workspaceRoot);
  }

  let warp: Record<string, any>;
  try {
    warp = await import(warpUrl);
  } finally {
    // Always restore original cwd
    if (workspaceRoot) {
      process.chdir(originalCwd);
    }
  }

  // Track which CoreRing instances have been configured to avoid overwriting
  // when multiple spiralers wrap the same core (e.g., foundframe and android)
  const configuredCores = new Set();

  for (const [exportName, value] of Object.entries(warp)) {
    let core: CoreRing<any, any, any>;
    // For a CoreRing directly exported, set crateName/packageName from export name
    if (value instanceof CoreRing) {
      // Configure CoreRing instances that are directly exported
      // (not wrapped in SpiralOut) - these are the primary cores
      core = value;
    } else if (value.inner instanceof CoreRing && !value.spiraler) {
      // (wrapped in SpiralOut)
      core = value.inner;
    } else {
      continue;
    }

    if (!configuredCores.has(core)) {
      configuredCores.add(core);
      core.options.crateName ??= exportName;
      core.options.packageName ??= exportName;
    }
  }

  return warp;
}

/**
 * Get suggested package filter from workspace info.
 *
export function getSuggestedPackageFilter(info: WorkspaceInfo): string | undefined {
  if (info.type === 'package' && info.currentPackage) {
    // Use last segment of package name (e.g., "o19-foundframe" -> "foundframe")
    return info.currentPackage.split('-').pop() || info.currentPackage;
  }
  return undefined;
}
*/
