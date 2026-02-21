/**
 * Package.json Manager
 *
 * Idempotent modification of package.json files for spire integration.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readJson, writeJson } from './file-system-operations.js';

export interface NpmDependencyOptions {
  dev?: boolean;
  peer?: boolean;
  optional?: boolean;
  version?: string;
}

/**
 * Ensure a dependency is present in package.json.
 */
export function ensureNpmDependencyAdded(
  packagePath: string,
  name: string,
  version = '^1.0.0',
  options: NpmDependencyOptions = {}
): boolean {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const pkg = readJson<Record<string, Record<string, string>>>(packageJsonPath, {});
  
  const depType = options.dev ? 'devDependencies' : options.peer ? 'peerDependencies' : 'dependencies';
  
  if (!pkg[depType]) {
    pkg[depType] = {};
  }
  
  if (pkg[depType][name]) {
    return false;
  }
  
  pkg[depType][name] = version;
  writeJson(packageJsonPath, pkg);
  return true;
}

/**
 * Check if a dependency is available in the pnpm workspace.
 */
export function findWorkspacePackage(
  workspaceRoot: string,
  packageName: string
): { path: string; version: string } | null {
  const pnpmYamlPath = path.join(workspaceRoot, 'pnpm-workspace.yaml');
  if (!fs.existsSync(pnpmYamlPath)) {
    return null;
  }
  
  const content = fs.readFileSync(pnpmYamlPath, 'utf-8');
  const pkgMatch = content.match(/packages:\s*\n((?:\s*-\s*['"]?[^'"\n]+['"]?\n?)+)/);
  
  if (!pkgMatch) return null;
  
  const patterns = pkgMatch[1]
    .split('\n')
    .map((l: string) => l.match(/-\s*['"]?([^'"]+)['"]/)?.[1])
    .filter((p: string | undefined): p is string => !!p);
  
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const dir = path.join(workspaceRoot, pattern.slice(0, -2));
      if (fs.existsSync(dir)) {
        for (const entry of fs.readdirSync(dir)) {
          const pkgPath = path.join(dir, entry);
          const pkgJsonPath = path.join(pkgPath, 'package.json');
          if (fs.existsSync(pkgJsonPath)) {
            const pkg = readJson<{ name: string; version: string }>(pkgJsonPath, { name: '', version: '' });
            if (pkg.name === packageName) {
              return { path: pkgPath, version: pkg.version };
            }
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Add a workspace dependency using local path.
 */
export function addWorkspaceDependency(
  fromPackage: string,
  toPackage: string,
  workspaceRoot: string
): boolean {
  const targetInfo = findWorkspacePackage(workspaceRoot, toPackage);
  if (!targetInfo) {
    throw new Error(`Workspace package not found: ${toPackage}`);
  }
  
  // For workspace packages, use "workspace:*" protocol
  return ensureNpmDependencyAdded(fromPackage, toPackage, 'workspace:*');
}
