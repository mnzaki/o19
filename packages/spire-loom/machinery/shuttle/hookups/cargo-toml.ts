/**
 * Cargo.toml Hookup 📦
 *
 * Hooks into Cargo.toml files to:
 * - Add/modify dependencies
 * - Add dev-dependencies and build-dependencies
 * - Add features
 * - Configure [lib] section
 * - Support workspace.dependencies
 *
 * > *"The manifest anchors the crate to the workspace."*
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { CargoTomlHookup, HookupResult, CargoDependencyValue, CargoDependency, HookupType } from './types.js';

// ============================================================================
// Types
// ============================================================================

interface ParsedToml {
  sections: Map<string, Map<string, string>>;
  rawLines: string[];
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Apply Cargo.toml hookup.
 *
 * Handles:
 * 1. Dependencies (regular, dev, build)
 * 2. Features
 * 3. [lib] configuration
 * 4. Workspace dependencies support
 */
export async function applyCargoTomlHookup(
  filePath: string,
  hookup: CargoTomlHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'cargo-toml' as HookupType,
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // 1. Apply dependencies
  if (hookup.dependencies && Object.keys(hookup.dependencies).length > 0) {
    const sectionName = hookup.workspace ? 'workspace.dependencies' : 'dependencies';
    const depChanges = applyDependencies(content, sectionName, hookup.dependencies);
    if (depChanges.modified) {
      content = depChanges.content;
      changes.push(`Added ${Object.keys(hookup.dependencies).length} dependencies to [${sectionName}]`);
    }
  }
  
  // 2. Apply dev-dependencies
  if (hookup.devDependencies && Object.keys(hookup.devDependencies).length > 0) {
    const depChanges = applyDependencies(content, 'dev-dependencies', hookup.devDependencies);
    if (depChanges.modified) {
      content = depChanges.content;
      changes.push(`Added ${Object.keys(hookup.devDependencies).length} dev-dependencies`);
    }
  }
  
  // 3. Apply build-dependencies
  if (hookup.buildDependencies && Object.keys(hookup.buildDependencies).length > 0) {
    const depChanges = applyDependencies(content, 'build-dependencies', hookup.buildDependencies);
    if (depChanges.modified) {
      content = depChanges.content;
      changes.push(`Added ${Object.keys(hookup.buildDependencies).length} build-dependencies`);
    }
  }
  
  // 4. Apply features
  if (hookup.features && Object.keys(hookup.features).length > 0) {
    const featChanges = applyFeatures(content, hookup.features);
    if (featChanges.modified) {
      content = featChanges.content;
      changes.push(`Added ${Object.keys(hookup.features).length} features`);
    }
  }
  
  // 5. Apply lib configuration
  if (hookup.lib) {
    const libChanges = applyLibConfig(content, hookup.lib);
    if (libChanges.modified) {
      content = libChanges.content;
      changes.push(`Updated [lib] configuration`);
    }
  }
  
  // Write if modified
  const modified = content !== originalContent;
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return {
    path: filePath,
    type: 'cargo-toml' as HookupType,
    status: modified ? 'applied' : 'skipped',
    message: modified 
      ? `Updated ${path.basename(filePath)}: ${changes.join('; ')}`
      : `No changes needed for ${path.basename(filePath)}`,
  };
}

// ============================================================================
// Dependency Handling
// ============================================================================

/**
 * Format a dependency value for TOML.
 */
function formatDependencyValue(name: string, value: CargoDependencyValue): string {
  if (typeof value === 'string') {
    // Simple version string
    return `${name} = "${value}"`;
  }
  
  // Complex dependency table
  const parts: string[] = [];
  parts.push(`[dependencies.${name}]`);
  
  if (value.version) {
    parts.push(`version = "${value.version}"`);
  }
  if (value.path) {
    parts.push(`path = "${value.path}"`);
  }
  if (value.git) {
    parts.push(`git = "${value.git}"`);
  }
  if (value.branch) {
    parts.push(`branch = "${value.branch}"`);
  }
  if (value.features && value.features.length > 0) {
    parts.push(`features = [${value.features.map(f => `"${f}"`).join(', ')}]`);
  }
  if (value.optional !== undefined) {
    parts.push(`optional = ${value.optional}`);
  }
  if (value.defaultFeatures !== undefined) {
    parts.push(`default-features = ${value.defaultFeatures}`);
  }
  
  return parts.join('\n');
}

/**
 * Check if a dependency already exists.
 */
function hasDependency(content: string, name: string): boolean {
  // Match "name = " or "[dependencies.name]" or "[workspace.dependencies.name]"
  const simpleRegex = new RegExp(`^${name}\\s*=`, 'm');
  const tableRegex = new RegExp(`\\[(workspace\\.)?dependencies\\.${name}\\]`, 'm');
  
  return simpleRegex.test(content) || tableRegex.test(content);
}

/**
 * Apply dependencies to a section.
 */
function applyDependencies(
  content: string,
  sectionName: string,
  dependencies: Record<string, CargoDependencyValue>
): { content: string; modified: boolean } {
  let modified = false;
  
  for (const [name, value] of Object.entries(dependencies)) {
    if (hasDependency(content, name)) {
      // Dependency already exists, skip
      continue;
    }
    
    const depLine = formatDependencyValue(name, value);
    
    // Find the section
    const sectionRegex = new RegExp(`^\\[${sectionName}\\]$`, 'm');
    const sectionMatch = content.match(sectionRegex);
    
    if (sectionMatch) {
      // Section exists, add after it
      const sectionStart = content.indexOf(sectionMatch[0]);
      const afterSection = content.slice(sectionStart + sectionMatch[0].length);
      
      // Find the next section or end of file
      const nextSectionMatch = afterSection.match(/^\[/m);
      
      if (nextSectionMatch && nextSectionMatch.index !== undefined) {
        // Insert before next section
        const insertPos = sectionStart + sectionMatch[0].length + nextSectionMatch.index;
        content = content.slice(0, insertPos) + depLine + '\n' + content.slice(insertPos);
      } else {
        // Insert at end
        content = content.trimEnd() + '\n' + depLine + '\n';
      }
    } else {
      // Section doesn't exist, create it
      content = content.trimEnd() + `\n\n[${sectionName}]\n` + depLine + '\n';
    }
    
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Features Handling
// ============================================================================

/**
 * Format a feature for TOML.
 */
function formatFeature(name: string, enables: string[]): string {
  const enablesStr = enables.map(e => `"${e}"`).join(', ');
  return `${name} = [${enablesStr}]`;
}

/**
 * Check if a feature already exists.
 */
function hasFeature(content: string, name: string): boolean {
  const regex = new RegExp(`^${name}\\s*=`, 'm');
  return regex.test(content);
}

/**
 * Apply features to [features] section.
 */
function applyFeatures(
  content: string,
  features: Record<string, string[]>
): { content: string; modified: boolean } {
  let modified = false;
  
  for (const [name, enables] of Object.entries(features)) {
    if (hasFeature(content, name)) {
      // Feature already exists, skip
      continue;
    }
    
    const featureLine = formatFeature(name, enables);
    
    // Find [features] section
    const sectionRegex = /^\[features\]$/m;
    const sectionMatch = content.match(sectionRegex);
    
    if (sectionMatch) {
      // Section exists, add after it
      const sectionStart = content.indexOf(sectionMatch[0]);
      const afterSection = content.slice(sectionStart + sectionMatch[0].length);
      
      // Find the next section or end of file
      const nextSectionMatch = afterSection.match(/^\[/m);
      
      if (nextSectionMatch && nextSectionMatch.index !== undefined) {
        // Insert before next section
        const insertPos = sectionStart + sectionMatch[0].length + nextSectionMatch.index;
        content = content.slice(0, insertPos) + featureLine + '\n' + content.slice(insertPos);
      } else {
        // Insert at end
        content = content.trimEnd() + '\n' + featureLine + '\n';
      }
    } else {
      // Section doesn't exist, create it
      content = content.trimEnd() + `\n\n[features]\n` + featureLine + '\n';
    }
    
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Lib Configuration
// ============================================================================

/**
 * Apply [lib] configuration.
 */
function applyLibConfig(
  content: string,
  lib: { 'crate-type'?: string[]; name?: string; path?: string; [key: string]: unknown }
): { content: string; modified: boolean } {
  let modified = false;
  
  // Check if [lib] section exists
  const sectionRegex = /^\[lib\]$/m;
  const sectionMatch = content.match(sectionRegex);
  
  if (sectionMatch) {
    // Update existing [lib] section
    const sectionStart = content.indexOf(sectionMatch[0]);
    const afterSection = content.slice(sectionStart + sectionMatch[0].length);
    
    // Find the next section or end of file
    const nextSectionMatch = afterSection.match(/^\[/m);
    const sectionEnd = nextSectionMatch && nextSectionMatch.index !== undefined
      ? sectionStart + sectionMatch[0].length + nextSectionMatch.index
      : content.length;
    
    let sectionContent = content.slice(sectionStart, sectionEnd);
    
    // Update each field
    if (lib.name && !sectionContent.includes('name')) {
      sectionContent = sectionContent.trimEnd() + `\nname = "${lib.name}"`;
      modified = true;
    }
    
    if (lib.path && !sectionContent.includes('path')) {
      sectionContent = sectionContent.trimEnd() + `\npath = "${lib.path}"`;
      modified = true;
    }
    
    if (lib['crate-type'] && !sectionContent.includes('crate-type')) {
      const crateTypes = lib['crate-type'].map(ct => `"${ct}"`).join(', ');
      sectionContent = sectionContent.trimEnd() + `\ncrate-type = [${crateTypes}]`;
      modified = true;
    }
    
    // Update other custom fields
    for (const [key, value] of Object.entries(lib)) {
      if (key === 'crate-type' || key === 'name' || key === 'path') continue;
      
      if (!sectionContent.includes(`${key} =`)) {
        const valueStr = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
        sectionContent = sectionContent.trimEnd() + `\n${key} = ${valueStr}`;
        modified = true;
      }
    }
    
    if (modified) {
      content = content.slice(0, sectionStart) + sectionContent + content.slice(sectionEnd);
    }
  } else {
    // Create [lib] section
    const lines: string[] = ['\n[lib]'];
    
    if (lib.name) lines.push(`name = "${lib.name}"`);
    if (lib.path) lines.push(`path = "${lib.path}"`);
    if (lib['crate-type']) {
      const crateTypes = lib['crate-type'].map(ct => `"${ct}"`).join(', ');
      lines.push(`crate-type = [${crateTypes}]`);
    }
    
    // Add other custom fields
    for (const [key, value] of Object.entries(lib)) {
      if (key === 'crate-type' || key === 'name' || key === 'path') continue;
      const valueStr = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
      lines.push(`${key} = ${valueStr}`);
    }
    
    content = content.trimEnd() + '\n' + lines.join('\n') + '\n';
    modified = true;
  }
  
  return { content, modified };
}
