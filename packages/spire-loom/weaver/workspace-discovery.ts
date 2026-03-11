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
  let loomDir = path.join(p, 'loom');
  let warpPath = path.join(loomDir, 'WARP.ts');
  let loomFiles: string[] = [];

  if (fs.existsSync(loomDir)) {
    loomFiles = fs
      .readdirSync(loomDir)
      .filter((f) => f.match(/\.[tj]s$/))
      .map((f) => path.join(loomDir, f));
  } else {
    loomDir = '';
  }

  if (!fs.existsSync(warpPath)) {
    // Check if this is a workspace root
    warpPath = '';
  }

  return {
    name,
    type: isCargoWorkspace || isPnpmWorkspace ? 'workspace' : 'package',
    root: p,
    loomDir: loomDir || undefined,
    loomFiles,
    warpPath: warpPath || undefined
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
export function loadWarp(warp: Record<string, any>): Record<string, any> {
  // Track which CoreRing instances have been configured to avoid overwriting
  // when multiple spiralers wrap the same core (e.g., foundframe and android)
  const configuredCores = new Set();

  for (const [exportName, value] of Object.entries(warp)) {
    let core: CoreRing<any, any>;
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
export function loadWorkspace(cwd: string = process.cwd()): WorkspaceInfo | null {
  let ret = getWorkspaceInfoFromPath(cwd);

  if (ret.type == 'package') {
    // Walk up to find parent workspace
    let current = cwd;
    while (current !== path.dirname(current)) {
      current = path.dirname(current);
      const parent = getWorkspaceInfoFromPath(current);
      if (parent.type == 'workspace') {
        parent.currentPackage = ret.name;
        parent.type = 'package';
        ret = parent;
        break;
      }
    }
  }

  if (ret.name && ret.loomDir && ret.warpPath && ret.type !== 'unknown') {
    return ret as WorkspaceInfo;
  }

  return null;
}
