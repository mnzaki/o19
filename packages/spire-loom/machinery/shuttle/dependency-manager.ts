/**
 * Dependency Management Tools
 *
 * Tools for adding dependencies to package manifests.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readJson, writeJson } from './file-system-operations.js';

// ============================================================================
// Cargo Dependencies
// ============================================================================

/**
 * Ensure a dependency is present in Cargo.toml.
 */
export function ensureCargoDependencyAdded(
  cratePath: string,
  name: string,
  versionOrConfig: string | { version?: string; path?: string; features?: string[]; optional?: boolean }
): boolean {
  const cargoTomlPath = path.join(cratePath, 'Cargo.toml');
  if (!fs.existsSync(cargoTomlPath)) {
    throw new Error(`No Cargo.toml found at ${cratePath}`);
  }
  
  const content = fs.readFileSync(cargoTomlPath, 'utf-8');
  
  // Check if already present
  const depRegex = new RegExp(`^${name}\\s*=`, 'm');
  if (depRegex.test(content)) {
    return false; // Already present
  }
  
  // Find [dependencies] section
  const depSectionIndex = content.search(/^\[dependencies\]$/m);
  if (depSectionIndex === -1) {
    // Add [dependencies] section at end
    const depEntry = formatCargoDependency(name, versionOrConfig);
    fs.writeFileSync(cargoTomlPath, content + `\n[dependencies]\n${depEntry}\n`, 'utf-8');
    return true;
  }
  
  // Insert after [dependencies] line
  const before = content.slice(0, depSectionIndex + '[dependencies]'.length);
  const after = content.slice(depSectionIndex + '[dependencies]'.length);
  const depEntry = formatCargoDependency(name, versionOrConfig);
  
  fs.writeFileSync(cargoTomlPath, `${before}\n${depEntry}${after}`, 'utf-8');
  return true;
}

function formatCargoDependency(
  name: string,
  config: string | { version?: string; path?: string; features?: string[]; optional?: boolean }
): string {
  if (typeof config === 'string') {
    return `${name} = "${config}"`;
  }
  
  const parts: string[] = [];
  if (config.version) parts.push(`version = "${config.version}"`);
  if (config.path) parts.push(`path = "${config.path}"`);
  if (config.features) parts.push(`features = [${config.features.map(f => `"${f}"`).join(', ')}]`);
  if (config.optional) parts.push('optional = true');
  
  return `${name} = { ${parts.join(', ')} }`;
}

// ============================================================================
// NPM Dependencies
// ============================================================================

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
    return false; // Already present
  }
  
  pkg[depType][name] = version;
  writeJson(packageJsonPath, pkg);
  return true;
}

// ============================================================================
// Workspace Dependency Resolution
// ============================================================================

/**
 * Check if a dependency is available in the workspace.
 */
export function findWorkspacePackage(
  workspaceRoot: string,
  packageName: string
): { path: string; version: string } | null {
  // Check pnpm workspace
  const pnpmYamlPath = path.join(workspaceRoot, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmYamlPath)) {
    const content = fs.readFileSync(pnpmYamlPath, 'utf-8');
    const pkgMatch = content.match(/packages:\s*\n((?:\s*-\s*['"]?[^'"\n]+['"]?\n?)+)/);
    if (pkgMatch) {
      const patterns = pkgMatch[1]
        .split('\n')
        .map((l: string) => l.match(/-\s*['"]?([^'"]+)['"]?/)?.[1])
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
    }
  }
  
  // Check Cargo workspace
  const cargoTomlPath = path.join(workspaceRoot, 'Cargo.toml');
  if (fs.existsSync(cargoTomlPath)) {
    const content = fs.readFileSync(cargoTomlPath, 'utf-8');
    const membersMatch = content.match(/members\s*=\s*\[([^\]]+)\]/);
    if (membersMatch) {
      const members = membersMatch[1]
        .split(',')
        .map((m: string) => m.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      
      for (const member of members) {
        const cratePath = path.join(workspaceRoot, member);
        const memberCargoPath = path.join(cratePath, 'Cargo.toml');
        if (fs.existsSync(memberCargoPath)) {
          const memberContent = fs.readFileSync(memberCargoPath, 'utf-8');
          const nameMatch = memberContent.match(/name\s*=\s*"([^"]+)"/);
          const versionMatch = memberContent.match(/version\s*=\s*"([^"]+)"/);
          if (nameMatch?.[1] === packageName) {
            return { 
              path: cratePath, 
              version: versionMatch?.[1] ?? '0.1.0' 
            };
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
  
  // Check if fromPackage is Rust or Node
  const fromCargoPath = path.join(fromPackage, 'Cargo.toml');
  const fromPackageJsonPath = path.join(fromPackage, 'package.json');
  
  if (fs.existsSync(fromCargoPath)) {
    // Rust dependency
    const relPath = path.relative(fromPackage, targetInfo.path).replace(/\\/g, '/');
    return ensureCargoDependencyAdded(fromPackage, toPackage, { path: relPath });
  } else if (fs.existsSync(fromPackageJsonPath)) {
    // Node dependency
    // For workspace packages, use "workspace:*" protocol
    return ensureNpmDependencyAdded(fromPackage, toPackage, 'workspace:*');
  }
  
  throw new Error(`Unknown package type at ${fromPackage}`);
}
