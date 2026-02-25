/**
 * Workspace Discovery
 *
 * "The reed finds the workspace in the wild."
 *
 * Detects workspace type and locates loom/WARP.ts configuration.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WorkspaceInfo {
  /** Type of workspace detected */
  type: 'workspace' | 'package' | 'unknown';
  
  /** Root directory of the workspace */
  root: string;
  
  /** Path to loom/WARP.ts if found */
  warpPath?: string;
  
  /** Current package name if in a package subdirectory */
  currentPackage?: string;
}

/**
 * Detect workspace type and locate loom/WARP.ts.
 *
 * Checks for:
 * - pnpm-workspace.yaml (pnpm workspace)
 * - Cargo.toml with [workspace] (Cargo workspace)
 * - loom/ directory with WARP.ts
 *
 * If in a package subdirectory, walks up to find parent workspace.
 */
export function detectWorkspace(cwd: string = process.cwd()): WorkspaceInfo {
  const hasPnpmWorkspace = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
  const hasCargoWorkspace = fs.existsSync(path.join(cwd, 'Cargo.toml')) && 
    fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8').includes('[workspace]');
  const hasLoomDir = fs.existsSync(path.join(cwd, 'loom'));
  
  if (hasPnpmWorkspace || hasCargoWorkspace || hasLoomDir) {
    const loomPath = path.join(cwd, 'loom', 'WARP.ts');
    if (fs.existsSync(loomPath)) {
      return { type: 'workspace', root: cwd, warpPath: loomPath };
    }
    return { type: 'workspace', root: cwd };
  }
  
  const hasCargoToml = fs.existsSync(path.join(cwd, 'Cargo.toml'));
  const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
  
  if (hasCargoToml || hasPackageJson) {
    let packageName: string | undefined;
    
    if (hasCargoToml) {
      const cargoContent = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
      const nameMatch = cargoContent.match(/^name\s*=\s*"([^"]+)"/m);
      if (nameMatch) packageName = nameMatch[1];
    }
    
    if (!packageName && hasPackageJson) {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
      packageName = pkgJson.name;
    }
    
    // Walk up to find parent workspace
    let current = cwd;
    while (current !== path.dirname(current)) {
      current = path.dirname(current);
      const loomPath = path.join(current, 'loom', 'WARP.ts');
      if (fs.existsSync(loomPath)) {
        return { 
          type: 'package', 
          root: current, 
          warpPath: loomPath,
          currentPackage: packageName 
        };
      }
    }
    return { type: 'package', root: cwd, currentPackage: packageName };
  }
  
  return { type: 'unknown', root: cwd };
}

import { Layer } from '../../warp/layers.js';

/**
 * Load WARP.ts module dynamically.
 * 
 * Also sets the `.name` property on all Layer instances to their export name,
 * ensuring consistent metadata derivation across Rust and TypeScript layers.
 * 
 * Note: If a layer already has a custom .name set in WARP.ts, it is preserved.
 */
export async function loadWarp(warpPath: string): Promise<Record<string, any>> {
  const { pathToFileURL } = await import('node:url');
  const warpUrl = pathToFileURL(warpPath).href;
  const warp = await import(warpUrl);
  
  // Set .name on all Layer instances to their export name
  // BUT only if not already explicitly set (allows WARP.ts to override)
  for (const [exportName, value] of Object.entries(warp)) {
    if (value instanceof Layer) {
      // Only set if .name is undefined (not explicitly set in WARP.ts)
      if (value.name === undefined) {
        value.name = exportName;
      }
    }
  }
  
  return warp;
}

/**
 * Get suggested package filter from workspace info.
 */
export function getSuggestedPackageFilter(info: WorkspaceInfo): string | undefined {
  if (info.type === 'package' && info.currentPackage) {
    // Use last segment of package name (e.g., "o19-foundframe" -> "foundframe")
    return info.currentPackage.split('-').pop() || info.currentPackage;
  }
  return undefined;
}
