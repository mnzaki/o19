/**
 * Cargo.toml Hookup Handler
 *
 * Applies Cargo.toml hookups declaratively.
 */

import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { CargoTomlHookup, HookupResult } from './types.js';
import { ensureCargoBlock } from '../cargo-toml-manager.js';

/**
 * Apply Cargo.toml hookup.
 */
export function applyCargoTomlHookup(
  filePath: string,
  spec: CargoTomlHookup,
  context: GeneratorContext
): HookupResult {
  const changes: string[] = [];
  
  // Handle dependencies
  if (spec.dependencies) {
    for (const [name, dep] of Object.entries(spec.dependencies)) {
      const content = formatDependency(dep);
      const changed = ensureCargoBlock(filePath, {
        tag: `dep_${name}`,
        content: `${name} = ${content}`,
        section: spec.workspace ? 'workspace.dependencies' : 'dependencies',
        replace: true,
      });
      if (changed) {
        changes.push(`Added dependency: ${name}`);
      }
    }
  }
  
  // Handle dev dependencies
  if (spec.devDependencies) {
    for (const [name, dep] of Object.entries(spec.devDependencies)) {
      const content = formatDependency(dep);
      const changed = ensureCargoBlock(filePath, {
        tag: `dev_dep_${name}`,
        content: `${name} = ${content}`,
        section: 'dev-dependencies',
        replace: true,
      });
      if (changed) {
        changes.push(`Added dev-dependency: ${name}`);
      }
    }
  }
  
  // Handle build dependencies
  if (spec.buildDependencies) {
    for (const [name, dep] of Object.entries(spec.buildDependencies)) {
      const content = formatDependency(dep);
      const changed = ensureCargoBlock(filePath, {
        tag: `build_dep_${name}`,
        content: `${name} = ${content}`,
        section: 'build-dependencies',
        replace: true,
      });
      if (changed) {
        changes.push(`Added build-dependency: ${name}`);
      }
    }
  }
  
  // Handle features
  if (spec.features) {
    for (const [featureName, deps] of Object.entries(spec.features)) {
      const content = `[${deps.map(d => `"${d}"`).join(', ')}]`;
      const changed = ensureCargoBlock(filePath, {
        tag: `feature_${featureName}`,
        content: `"${featureName}" = ${content}`,
        section: 'features',
        replace: true,
      });
      if (changed) {
        changes.push(`Added feature: ${featureName}`);
      }
    }
  }
  
  // Handle lib config
  if (spec.lib) {
    const libContent = formatLibConfig(spec.lib);
    const changed = ensureCargoBlock(filePath, {
      tag: 'lib_config',
      content: libContent,
      section: 'lib',
      replace: true,
    });
    if (changed) {
      changes.push('Updated [lib] configuration');
    }
  }
  
  return {
    path: filePath,
    type: 'cargo-toml',
    status: changes.length > 0 ? 'applied' : 'skipped',
    message: changes.length > 0 ? changes.join(', ') : 'No changes needed',
  };
}

/**
 * Format a dependency value for Cargo.toml.
 */
function formatDependency(dep: string | CargoTomlHookup['dependencies'][string]): string {
  if (typeof dep === 'string') {
    return `"${dep}"`;
  }
  
  // Inline table format for complex deps
  const parts: string[] = [];
  
  if (dep.version) parts.push(`version = "${dep.version}"`);
  if (dep.path) parts.push(`path = "${dep.path}"`);
  if (dep.git) parts.push(`git = "${dep.git}"`);
  if (dep.branch) parts.push(`branch = "${dep.branch}"`);
  if (dep.features) parts.push(`features = [${dep.features.map(f => `"${f}"`).join(', ')}]`);
  if (dep.optional) parts.push('optional = true');
  if (dep.defaultFeatures === false) parts.push('default-features = false');
  
  return `{ ${parts.join(', ')} }`;
}

/**
 * Format lib config for Cargo.toml.
 */
function formatLibConfig(lib: CargoTomlHookup['lib']): string {
  const parts: string[] = [];
  
  if (lib.name) parts.push(`name = "${lib.name}"`);
  if (lib.path) parts.push(`path = "${lib.path}"`);
  if (lib['crate-type']) {
    parts.push(`crate-type = [${lib['crate-type'].map(t => `"${t}"`).join(', ')}]`);
  }
  
  // Add any other config
  for (const [key, value] of Object.entries(lib)) {
    if (key === 'name' || key === 'path' || key === 'crate-type') continue;
    if (typeof value === 'string') {
      parts.push(`${key} = "${value}"`);
    } else if (Array.isArray(value)) {
      parts.push(`${key} = [${value.map(v => `"${v}"`).join(', ')}]`);
    }
  }
  
  return parts.join('\n');
}
