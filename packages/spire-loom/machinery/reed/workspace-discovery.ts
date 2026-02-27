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
  // Check if this is a package directory (has Cargo.toml or package.json)
  // AND is NOT a workspace root (no [workspace] in Cargo.toml)
  const hasCargoToml = fs.existsSync(path.join(cwd, 'Cargo.toml'));
  const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
  
  if (hasCargoToml || hasPackageJson) {
    // Check if this is actually a workspace root
    const isCargoWorkspace = hasCargoToml && 
      fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8').includes('[workspace]');
    const isPnpmWorkspace = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
    
    // If it's not a workspace root, treat as package
    if (!isCargoWorkspace && !isPnpmWorkspace) {
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
        const parentHasLoom = fs.existsSync(path.join(current, 'loom', 'WARP.ts'));
        const parentHasPnpm = fs.existsSync(path.join(current, 'pnpm-workspace.yaml'));
        const parentHasCargoWorkspace = fs.existsSync(path.join(current, 'Cargo.toml')) &&
          fs.readFileSync(path.join(current, 'Cargo.toml'), 'utf-8').includes('[workspace]');
        
        if (parentHasLoom || parentHasPnpm || parentHasCargoWorkspace) {
          const loomPath = path.join(current, 'loom', 'WARP.ts');
          return { 
            type: 'package', 
            root: current, 
            warpPath: fs.existsSync(loomPath) ? loomPath : undefined,
            currentPackage: packageName 
          };
        }
      }
      
      // No parent workspace found - standalone package
      const loomPath = path.join(cwd, 'loom', 'WARP.ts');
      return { 
        type: 'package', 
        root: cwd, 
        warpPath: fs.existsSync(loomPath) ? loomPath : undefined,
        currentPackage: packageName 
      };
    }
  }
  
  // Check if this is a workspace root
  const hasPnpmWorkspace = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
  const hasCargoWorkspace = hasCargoToml && 
    fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8').includes('[workspace]');
  const hasLoomDir = fs.existsSync(path.join(cwd, 'loom'));
  
  if (hasPnpmWorkspace || hasCargoWorkspace || hasLoomDir) {
    const loomPath = path.join(cwd, 'loom', 'WARP.ts');
    if (fs.existsSync(loomPath)) {
      return { type: 'workspace', root: cwd, warpPath: loomPath };
    }
    return { type: 'workspace', root: cwd };
  }
  
  return { type: 'unknown', root: cwd };
}

import { Layer } from '../../warp/layers.js';
import { RustCore } from '../../warp/spiral/rust.js';

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
export async function loadWarp(warpPath: string, workspaceRoot?: string): Promise<Record<string, any>> {
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
  
  // Track which RustCore instances have been configured to avoid overwriting
  // when multiple spiralers wrap the same core (e.g., foundframe and android)
  const configuredCores = new Set();
  
  // First pass: Configure RustCore instances that are directly exported
  // (not wrapped in SpiralOut) - these are the primary cores
  for (const [exportName, value] of Object.entries(warp)) {
    // For RustCore directly exported, set crateName/packageName from export name
    // Use constructor name check to avoid module duplication issues with instanceof
    if (value?.constructor?.name === 'RustCore') {
      const core = value;
      if (!configuredCores.has(core)) {
        configuredCores.add(core);
        // Only set if not already explicitly configured
        // Use 'o19-' prefix convention for crate names (e.g., 'foundframe' -> 'o19-foundframe')
        if (!(core as any).options.crateName) {
          (core as any).options.crateName = exportName.startsWith('o19-') ? exportName : 'o19-' + exportName;
        }
        if (!(core as any).options.packageName) {
          (core as any).options.packageName = exportName;
        }
      }
    }
  }
  
  // Second pass: Configure SpiralOut rings that directly wrap a RustCore
  // These are the primary spiral exports (e.g., foundframe, not android)
  // Only configure if the core hasn't been configured yet
  for (const [exportName, value] of Object.entries(warp)) {
    // For SpiralOut directly wrapping a RustCore (not via a spiraler)
    // This is indicated by the lack of a 'spiraler' property
    if ((value as any)?.inner?.constructor?.name === 'RustCore' && !(value as any).spiraler) {
      const core = (value as any).inner;
      if (!configuredCores.has(core)) {
        configuredCores.add(core);
        // Use 'o19-' prefix convention for crate names (e.g., 'foundframe' -> 'o19-foundframe')
        if (!(core as any).options.crateName) {
          (core as any).options.crateName = exportName.startsWith('o19-') ? exportName : 'o19-' + exportName;
        }
        if (!(core as any).options.packageName) {
          (core as any).options.packageName = exportName;
        }
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
