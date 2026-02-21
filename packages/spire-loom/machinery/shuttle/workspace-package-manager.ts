/**
 * Package Management Tools
 *
 * Tools for creating and managing TypeScript and Rust packages.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureDir, ensureFile, readJson, writeJson, fileContains } from './file-system-operations.js';

// ============================================================================
// TypeScript Package Tools
// ============================================================================

export interface TypeScriptPackageOptions {
  name: string;
  description?: string;
  type?: 'module' | 'commonjs';
  main?: string;
  types?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Ensure a TypeScript package exists at the given path.
 * Creates package.json, tsconfig.json if they don't exist.
 */
export function ensureTypeScriptPackageCreated(
  packagePath: string,
  options: TypeScriptPackageOptions
): void {
  ensureDir(packagePath);
  
  // Create package.json
  const packageJsonPath = path.join(packagePath, 'package.json');
  const existing = readJson<Record<string, unknown>>(packageJsonPath, {});
  const existingScripts = (existing.scripts ?? {}) as Record<string, string>;
  const existingDeps = (existing.dependencies ?? {}) as Record<string, string>;
  const existingDevDeps = (existing.devDependencies ?? {}) as Record<string, string>;
  const existingType = (existing.type ?? 'module') as string;
  
  const packageJson = {
    name: options.name,
    version: (existing.version ?? '0.0.1') as string,
    description: options.description ?? '',
    type: options.type ?? existingType,
    main: options.main ?? './dist/index.js',
    types: options.types ?? './dist/index.d.ts',
    scripts: {
      build: 'tsc',
      ...options.scripts,
      ...existingScripts,
    },
    dependencies: {
      ...options.dependencies,
      ...existingDeps,
    },
    devDependencies: {
      ...options.devDependencies,
      ...existingDevDeps,
    },
    ...options.extra,
    ...existing,
  };
  
  writeJson(packageJsonPath, packageJson);
  
  // Create tsconfig.json if not exists
  const tsconfigPath = path.join(packagePath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    const tsconfig = {
      extends: options.extra?.['tsconfigExtends'] ?? '@repo/typescript-config/base.json',
      compilerOptions: {
        rootDir: './src',
        outDir: './dist',
        ...((options.extra?.['tsconfigCompilerOptions'] as object) ?? {}),
      },
      include: ['src/**/*'],
    };
    writeJson(tsconfigPath, tsconfig);
  }
  
  // Create src directory with index.ts
  const srcDir = path.join(packagePath, 'src');
  ensureDir(srcDir);
  
  const indexPath = path.join(srcDir, 'index.ts');
  ensureFile(indexPath, `// ${options.name}\nexport {};\n`);
}

// ============================================================================
// Rust Crate Tools
// ============================================================================

export interface RustCrateOptions {
  name: string;
  description?: string;
  edition?: '2021' | '2024';
  crateType?: ('lib' | 'bin' | 'cdylib' | 'staticlib')[];
  dependencies?: Record<string, string | { version: string; features?: string[] }>;
  workspace?: boolean;
}

/**
 * Ensure a Rust crate exists at the given path.
 * Creates Cargo.toml, src/lib.rs or src/main.rs if they don't exist.
 */
export function ensureCargoCrateCreated(
  cratePath: string,
  options: RustCrateOptions
): void {
  ensureDir(cratePath);
  
  // Create Cargo.toml
  const cargoTomlPath = path.join(cratePath, 'Cargo.toml');
  let cargoToml: Record<string, unknown>;
  
  if (fs.existsSync(cargoTomlPath)) {
    // Parse existing Cargo.toml (simplified - doesn't preserve comments)
    const content = fs.readFileSync(cargoTomlPath, 'utf-8');
    cargoToml = parseToml(content);
  } else {
    cargoToml = {};
  }
  
  // Merge with defaults
  const merged = {
    package: {
      name: options.name,
      version: (cargoToml.package as Record<string, string>)?.version ?? '0.1.0',
      edition: options.edition ?? '2021',
      description: options.description ?? '',
      ...(cargoToml.package as object ?? {}),
    },
    lib: options.crateType?.includes('lib') ? { 'crate-type': options.crateType } : cargoToml.lib,
    bin: options.crateType?.includes('bin') ? [{ name: options.name, path: 'src/main.rs' }] : cargoToml.bin,
    dependencies: {
      ...options.dependencies,
      ...(cargoToml.dependencies as object ?? {}),
    },
    ...Object.fromEntries(Object.entries(cargoToml).filter(([k]) => !['package', 'lib', 'bin', 'dependencies'].includes(k))),
  };
  
  fs.writeFileSync(cargoTomlPath, stringifyToml(merged), 'utf-8');
  
  // Create src directory
  const srcDir = path.join(cratePath, 'src');
  ensureDir(srcDir);
  
  // Create lib.rs or main.rs
  const isLib = !options.crateType || options.crateType.includes('lib');
  const entryFile = isLib ? 'lib.rs' : 'main.rs';
  const entryPath = path.join(srcDir, entryFile);
  
  if (!fs.existsSync(entryPath)) {
    const content = isLib
      ? `//! ${options.description ?? options.name}\n\npub mod spiral;\n`
      : `//! ${options.description ?? options.name}\n\nfn main() {\n    println!("Hello from ${options.name}!");\n}\n`;
    fs.writeFileSync(entryPath, content, 'utf-8');
  }
}

// ============================================================================
// Workspace Tools
// ============================================================================

/**
 * Ensure a package is included in pnpm-workspace.yaml.
 */
export function ensurePnpmWorkspaceIncludes(
  workspaceRoot: string,
  packagePath: string
): boolean {
  const workspaceYamlPath = path.join(workspaceRoot, 'pnpm-workspace.yaml');
  
  if (!fs.existsSync(workspaceYamlPath)) {
    // Create new workspace.yaml
    writeYaml(workspaceYamlPath, {
      packages: [packagePath],
    });
    return true;
  }
  
  const content = fs.readFileSync(workspaceYamlPath, 'utf-8');
  const pattern = packagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  if (new RegExp(`- ['"]?${pattern}['"]?`).test(content)) {
    return false; // Already included
  }
  
  // Add to packages list
  const newContent = content.replace(
    /(packages:\s*\n)/,
    `$1  - '${packagePath}'\n`
  )
  fs.writeFileSync(workspaceYamlPath, newContent, 'utf-8');
  return true;
}

/**
 * Ensure a crate is included in Cargo workspace.
 */
export function ensureCargoWorkspaceIncludes(
  workspaceRoot: string,
  cratePath: string
): boolean {
  const cargoTomlPath = path.join(workspaceRoot, 'Cargo.toml');
  
  if (!fs.existsSync(cargoTomlPath)) {
    throw new Error(`No Cargo.toml found at workspace root: ${workspaceRoot}`);
  }
  
  const content = fs.readFileSync(cargoTomlPath, 'utf-8');
  const escapedPath = cratePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  if (new RegExp(`['"]${escapedPath}['"]`).test(content)) {
    return false; // Already included
  }
  
  // Parse and modify TOML
  let toml = parseToml(content);
  
  if (!toml.workspace) {
    toml.workspace = {};
  }
  if (!Array.isArray((toml.workspace as Record<string, string[]>).members)) {
    (toml.workspace as Record<string, string[]>).members = [];
  }
  
  (toml.workspace as Record<string, string[]>).members.push(cratePath);
  
  fs.writeFileSync(cargoTomlPath, stringifyToml(toml), 'utf-8');
  return true;
}

// ============================================================================
// TOML Helpers (simplified)
// ============================================================================

function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection: string | null = null;
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Section header
    if (trimmed.startsWith('[')) {
      const match = trimmed.match(/^\[(.+?)\]$/);
      if (match) {
        currentSection = match[1];
        if (!result[currentSection]) {
          result[currentSection] = {};
        }
      }
      continue;
    }
    
    // Key-value pair
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.slice(0, eqIndex).trim();
    let value: unknown = trimmed.slice(eqIndex + 1).trim();
    
    // Remove quotes and try to parse as array
    if (typeof value === 'string') {
      let strValue = value.replace(/^['"](.*)['"]$/, '$1');
      
      if (strValue.startsWith('[') && strValue.endsWith(']')) {
        try {
          value = JSON.parse(strValue.replace(/'/g, '"'));
        } catch {
          value = strValue;
        }
      } else {
        value = strValue;
      }
    }
    
    if (currentSection) {
      (result[currentSection] as Record<string, unknown>)[key] = value;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function stringifyToml(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`[${key}]`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`${k} = ${formatTomlValue(v)}`);
      }
      lines.push('');
    } else {
      lines.push(`${key} = ${formatTomlValue(value)}`);
    }
  }
  
  return lines.join('\n');
}

function formatTomlValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const items = value.map(formatTomlValue).join(', ');
    return `[${items}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k} = ${formatTomlValue(v)}`);
    return `{ ${entries.join(', ')} }`;
  }
  return String(value);
}

// ============================================================================
// YAML Helpers (simplified)
// ============================================================================

function writeYaml(filePath: string, data: Record<string, unknown>): void {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - '${item}'`);
      }
    } else {
      lines.push(`${key}: ${formatTomlValue(value)}`);
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}
