/**
 * Cargo.toml Manager
 *
 * Idempotent modification of Cargo.toml files for spire integration.
 * Uses the generic marker utilities for all block operations.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createTomlMarkers,
  ensureBlock,
  hasBlock,
  removeBlock,
  type BlockOperationResult,
} from './markers.js';

// ============================================================================
// Block Registry Pattern for Cargo.toml
// ============================================================================

interface CargoBlockOptions {
  /** The block tag (identifier) - will be lowercased for storage */
  tag: string;
  /** The TOML content to insert */
  content: string;
  /** Which section to add to (dependencies, features, lib, etc.) */
  section?: string;
  /** If true, replace existing block with same tag */
  replace?: boolean;
}

// Track which blocks were touched in this generation
const touchedBlocks = new Set<string>();
let generationActive = false;

/**
 * Start a new generation cycle.
 */
export function startCargoGeneration(): void {
  touchedBlocks.clear();
  generationActive = true;
}

/**
 * Mark a block as touched (still in use).
 */
export function touchBlock(tag: string): void {
  touchedBlocks.add(tag.toLowerCase());
}

/**
 * Check if a block was touched in this generation.
 */
export function wasBlockTouched(tag: string): boolean {
  return touchedBlocks.has(tag.toLowerCase());
}

// ============================================================================
// Cargo.toml Operations
// ============================================================================

/**
 * Read a Cargo.toml file.
 */
export function readCargoToml(cargoPath: string): string {
  if (!fs.existsSync(cargoPath)) {
    return '';
  }
  return fs.readFileSync(cargoPath, 'utf-8');
}

/**
 * Check if a Cargo.toml has a specific block.
 */
export function hasCargoBlock(cargoPath: string, tag: string): boolean {
  const content = readCargoToml(cargoPath);
  const markers = createTomlMarkers('cargo', tag);
  return hasBlock(content, markers);
}

/**
 * Ensure a tagged block exists in Cargo.toml.
 * Uses the generic ensureBlock from markers.ts.
 */
export function ensureCargoBlock(
  cargoPath: string,
  options: CargoBlockOptions
): boolean {
  const { tag, content, section = 'dependencies', replace = true } = options;
  
  // Mark this block as touched
  touchBlock(tag);
  
  let cargoContent = readCargoToml(cargoPath);
  const markers = createTomlMarkers('cargo', tag);
  
  // Check if block already exists
  if (hasBlock(cargoContent, markers) && !replace) {
    return false;
  }
  
  // Use generic ensureBlock
  const blockResult = ensureBlock(cargoContent, markers, content);
  
  if (!blockResult.modified) {
    // Block exists but we need to ensure it's in the right section
    // For Cargo.toml, we don't move sections, just update content
    return false;
  }
  
  cargoContent = blockResult.content;
  
  // If this is a new block, ensure it's in the right section
  if (!cargoContent.includes(`[${section}]`)) {
    // Section doesn't exist, add it
    cargoContent += `\n[${section}]\n`;
  }
  
  fs.writeFileSync(cargoPath, cargoContent, 'utf-8');
  return true;
}

/**
 * Remove a tagged block from Cargo.toml.
 * Uses the generic removeBlock from markers.ts.
 */
export function removeCargoBlock(cargoPath: string, tag: string): boolean {
  const cargoContent = readCargoToml(cargoPath);
  const markers = createTomlMarkers('cargo', tag);
  
  const result = removeBlock(cargoContent, markers);
  
  if (result.modified) {
    // Clean up extra newlines
    const cleaned = result.content.replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(cargoPath, cleaned, 'utf-8');
    return true;
  }
  
  return false;
}

/**
 * Clean up all blocks that weren't touched in this generation.
 */
export function cleanupUntouchedBlocks(cargoPath: string): { removed: string[] } {
  const cargoContent = readCargoToml(cargoPath);
  const removed: string[] = [];
  
  // Find all SPIRE-LOOM:CARGO:* markers
  const markerRegex = /# SPIRE-LOOM:CARGO:([A-Z0-9_-]+)/g;
  let match;
  
  while ((match = markerRegex.exec(cargoContent)) !== null) {
    const normalizedTag = match[1].toLowerCase();
    if (!wasBlockTouched(normalizedTag)) {
      if (removeCargoBlock(cargoPath, normalizedTag)) {
        removed.push(normalizedTag);
      }
    }
  }
  
  return { removed };
}

// ============================================================================
// High-level Helpers
// ============================================================================

export interface SpireCargoConfig {
  /** Path to the crate */
  cratePath: string;
  /** Module name in spire/ (default: 'spire') */
  moduleName?: string;
  /** Additional dependencies to add */
  dependencies?: Record<string, string>;
}

/**
 * Configure Cargo.toml for spire integration.
 */
export function configureSpireCargo(config: SpireCargoConfig): {
  modified: boolean;
  changes: string[];
} {
  const { cratePath } = config;
  const cargoPath = path.join(cratePath, 'Cargo.toml');
  const changes: string[] = [];
  let modified = false;
  
  // Start generation tracking
  startCargoGeneration();
  
  if (!fs.existsSync(cargoPath)) {
    throw new Error(`No Cargo.toml found at ${cargoPath}`);
  }
  
  // Add spire dependencies block
  const depsChanged = ensureCargoBlock(cargoPath, {
    tag: 'spire-dependencies',
    content: '# Dependencies for generated spire code\n# (add workspace deps here if needed)',
    section: 'dependencies',
    replace: false,
  });
  
  if (depsChanged) {
    changes.push('Added spire-dependencies block');
    modified = true;
  }
  
  // Clean up old blocks
  const cleanup = cleanupUntouchedBlocks(cargoPath);
  if (cleanup.removed.length > 0) {
    changes.push(`Removed old blocks: ${cleanup.removed.join(', ')}`);
    modified = true;
  }
  
  return { modified, changes };
}

/**
 * Add workspace dependencies to Cargo.toml.
 */
export function addWorkspaceDependencies(
  cargoPath: string,
  deps: Record<string, string>
): boolean {
  const lines = Object.entries(deps).map(([name, spec]) => {
    if (spec.startsWith('{')) {
      return `${name} = ${spec}`;
    }
    return `${name} = "${spec}"`;
  });
  
  return ensureCargoBlock(cargoPath, {
    tag: 'workspace-dependencies',
    content: lines.join('\n'),
    section: 'dependencies',
    replace: true,
  });
}

// ============================================================================
// Dependency Management
// ============================================================================

/**
 * Ensure a dependency is present in Cargo.toml.
 * Adds to the [dependencies] section.
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
    return false;
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
